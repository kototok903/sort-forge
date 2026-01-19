import { useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@/components/Canvas';
import { Controls } from '@/components/Controls';
import { Settings } from '@/components/Settings';
import { CanvasRenderer } from '@/renderer/CanvasRenderer';
import { AnimationController, type ControllerState } from '@/controller/AnimationController';
import { PregenEngine, initWasm, getAvailableAlgorithms } from '@/engines/PregenEngine';
import {
  ARRAY_SIZE_DEFAULT,
  DISTRIBUTION_DEFAULT,
  type Distribution,
  RANDOM_VALUE_MAX,
  RANDOM_VALUE_MIN,
  SPEED_DEFAULT,
} from '@/config';

function generateArray(size: number, distribution: Distribution): number[] {
  switch (distribution) {
    case 'uniform': {
      const array = Array.from({ length: size }, (_, index) => index + 1);
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
    case 'random':
    default: {
      const range = RANDOM_VALUE_MAX - RANDOM_VALUE_MIN + 1;
      return Array.from(
        { length: size },
        () => Math.floor(Math.random() * range) + RANDOM_VALUE_MIN,
      );
    }
  }
}

function App() {
  // Wasm initialization state
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);

  // Settings state
  const [algorithms, setAlgorithms] = useState<string[]>([]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('');
  const [arraySize, setArraySize] = useState(ARRAY_SIZE_DEFAULT);
  const [distribution, setDistribution] = useState<Distribution>(DISTRIBUTION_DEFAULT);

  // Controller state (synced from AnimationController)
  const [controllerState, setControllerState] = useState<ControllerState>({
    playbackState: 'idle',
    currentStep: 0,
    totalSteps: 0,
    speed: SPEED_DEFAULT,
    array: [],
  });

  // Loading state
  const [isGenerating, setIsGenerating] = useState(false);

  // Create stable instances of renderer and controller
  const renderer = useMemo(() => new CanvasRenderer(), []);
  const controller = useMemo(() => new AnimationController(), []);

  // Initialize Wasm on mount
  useEffect(() => {
    initWasm()
      .then(() => {
        setWasmReady(true);
        const algos = getAvailableAlgorithms();
        setAlgorithms(algos);
        if (algos.length > 0) {
          setSelectedAlgorithm(algos[0]);
        }
      })
      .catch((err) => {
        setWasmError(err.message || 'Failed to load Wasm module');
      });
  }, []);

  // Connect renderer to controller
  useEffect(() => {
    controller.setRenderer(renderer);
  }, [controller, renderer]);

  // Subscribe to controller state changes
  useEffect(() => {
    const unsubscribe = controller.subscribe(setControllerState);
    return unsubscribe;
  }, [controller]);

  // Generate and start sort
  const handleGenerate = useCallback(async () => {
    if (!wasmReady || isGenerating) return;

    setIsGenerating(true);
    try {
      const array = generateArray(arraySize, distribution);
      const engine = new PregenEngine();
      await controller.initialize(engine, selectedAlgorithm, array);
    } catch (err) {
      console.error('Failed to initialize sort:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [wasmReady, isGenerating, arraySize, selectedAlgorithm, controller, distribution]);

  // Playback handlers
  const handlePlay = useCallback(() => controller.play(), [controller]);
  const handlePause = useCallback(() => controller.pause(), [controller]);
  const handleStepForward = useCallback(() => controller.stepForward(), [controller]);
  const handleStepBackward = useCallback(() => controller.stepBackward(), [controller]);
  const handleSeek = useCallback((step: number) => controller.seekTo(step), [controller]);
  const handleSpeedChange = useCallback((speed: number) => controller.setSpeed(speed), [controller]);
  const handleReset = useCallback(() => controller.reset(), [controller]);

  // Show loading state
  if (!wasmReady) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        {wasmError ? (
          <div className="text-red-400">Error: {wasmError}</div>
        ) : (
          <div className="text-gray-400">Loading...</div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-bold">SortForge</h1>
      </header>

      {/* Main content */}
      <div className="flex-1 flex gap-4">
        {/* Visualization area */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Canvas */}
          <div className="flex-1 bg-gray-900 overflow-hidden min-h-[300px]">
            <Canvas renderer={renderer} />
          </div>

          {/* Controls */}
          <Controls
            playbackState={controllerState.playbackState}
            currentStep={controllerState.currentStep}
            totalSteps={controllerState.totalSteps}
            speed={controllerState.speed}
            onPlay={handlePlay}
            onPause={handlePause}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
            onSeek={handleSeek}
            onSpeedChange={handleSpeedChange}
            onReset={handleReset}
          />
        </div>

        {/* Sidebar */}
        <div className="w-64">
          <Settings
            algorithms={algorithms}
            selectedAlgorithm={selectedAlgorithm}
            distribution={distribution}
            arraySize={arraySize}
            onAlgorithmChange={setSelectedAlgorithm}
            onDistributionChange={setDistribution}
            onArraySizeChange={setArraySize}
            onGenerate={handleGenerate}
            disabled={isGenerating}
          />
        </div>
      </div>
    </div>
  );
}

export default App
