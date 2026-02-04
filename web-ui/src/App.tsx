import { useState, useEffect, useMemo, useCallback } from "react";
import { Canvas } from "@/components/Canvas";
import { Controls } from "@/components/Controls";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { CanvasRenderer } from "@/renderer/CanvasRenderer";
import {
  AnimationController,
  type ControllerState,
} from "@/controller/AnimationController";
import {
  PregenEngine,
  initWasm,
  getAvailableAlgorithms,
} from "@/engines/PregenEngine";
import {
  LiveEngine,
  initLiveWasm,
  getAvailableLiveAlgorithms,
} from "@/engines/LiveEngine";
import {
  type Distribution,
  type EngineType,
  RANDOM_VALUE_MAX,
  RANDOM_VALUE_MIN,
  SPEED_DEFAULT,
} from "@/config";
import { getIsModKey } from "@/utils";
import { THEMES, applyTheme } from "@/themes/themes";
import { useSettings } from "@/settings/useSettings";

function generateArray(size: number, distribution: Distribution): number[] {
  switch (distribution) {
    case "uniform": {
      const array = Array.from({ length: size }, (_, index) => index + 1);
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
    case "random":
    default: {
      const range = RANDOM_VALUE_MAX - RANDOM_VALUE_MIN + 1;
      return Array.from(
        { length: size },
        () => Math.floor(Math.random() * range) + RANDOM_VALUE_MIN
      );
    }
  }
}

function App() {
  // Wasm initialization state
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);

  // Available algorithms (loaded from Wasm)
  const [pregenAlgorithms, setPregenAlgorithms] = useState<string[]>([]);
  const [liveAlgorithms, setLiveAlgorithms] = useState<string[]>([]);

  // Persisted settings
  const { settings, setSettings } = useSettings({
    pregenAlgorithms,
    liveAlgorithms,
  });

  // Derived state from settings
  const engineType = settings.engineType;
  const algorithms =
    engineType === "pregen" ? pregenAlgorithms : liveAlgorithms;
  const selectedAlgorithm =
    engineType === "pregen"
      ? settings.pregenAlgorithm
      : settings.liveAlgorithm;
  const arraySize =
    engineType === "pregen"
      ? settings.pregenArraySize
      : settings.liveArraySize;

  // Controller state (synced from AnimationController)
  const [controllerState, setControllerState] = useState<ControllerState>({
    playbackState: "idle",
    direction: "forward",
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
    Promise.all([initWasm(), initLiveWasm()])
      .then(() => {
        setWasmReady(true);
        setPregenAlgorithms(getAvailableAlgorithms());
        setLiveAlgorithms(getAvailableLiveAlgorithms());
      })
      .catch((err) => {
        setWasmError(err.message || "Failed to load Wasm module");
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

  // Auto-generate on initial load
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (
      wasmReady &&
      pregenAlgorithms.length > 0 &&
      selectedAlgorithm &&
      !hasInitialized
    ) {
      setHasInitialized(true);
      const array = generateArray(arraySize, settings.distribution);
      const engine =
        engineType === "pregen" ? new PregenEngine() : new LiveEngine();
      controller.initialize(engine, selectedAlgorithm, array);
    }
  }, [
    wasmReady,
    pregenAlgorithms,
    selectedAlgorithm,
    hasInitialized,
    arraySize,
    settings.distribution,
    engineType,
    controller,
  ]);

  // Apply theme when it changes
  useEffect(() => {
    const theme = THEMES[settings.themeId];
    applyTheme(theme);
    renderer.setTheme(theme.viz);
    controller.forceRender();
  }, [settings.themeId, renderer, controller]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (controllerState.playbackState === "playing") {
            controller.pause();
          } else if (e.shiftKey) {
            controller.playBackward();
          } else {
            controller.play();
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          controller.stepForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          controller.stepBackward();
          break;
        case "KeyR":
          if (!getIsModKey(e)) {
            e.preventDefault();
            controller.reset();
          }
          break;
        case "Equal":
        case "NumpadAdd":
          e.preventDefault();
          controller.setSpeed(Math.min(10, controllerState.speed + 0.5));
          break;
        case "Minus":
        case "NumpadSubtract":
          e.preventDefault();
          controller.setSpeed(Math.max(0.1, controllerState.speed - 0.5));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controller, controllerState.playbackState, controllerState.speed]);

  // Handle engine type change
  const handleEngineTypeChange = useCallback(
    (type: EngineType) => {
      setSettings({ engineType: type });
    },
    [setSettings]
  );

  // Handle algorithm change
  const handleAlgorithmChange = useCallback(
    (algorithm: string) => {
      if (engineType === "pregen") {
        setSettings({ pregenAlgorithm: algorithm });
      } else {
        setSettings({ liveAlgorithm: algorithm });
      }
    },
    [engineType, setSettings]
  );

  // Handle array size change
  const handleArraySizeChange = useCallback(
    (size: number) => {
      if (engineType === "pregen") {
        setSettings({ pregenArraySize: size });
      } else {
        setSettings({ liveArraySize: size });
      }
    },
    [engineType, setSettings]
  );

  // Handle distribution change
  const handleDistributionChange = useCallback(
    (distribution: Distribution) => {
      setSettings({ distribution });
    },
    [setSettings]
  );

  // Handle theme change
  const handleThemeChange = useCallback(
    (themeId: string) => {
      setSettings({ themeId: themeId as import("@/themes/types").ThemeId });
    },
    [setSettings]
  );

  // Generate and start sort
  const handleGenerate = useCallback(async () => {
    if (!wasmReady || isGenerating) return;

    setIsGenerating(true);
    try {
      const array = generateArray(arraySize, settings.distribution);
      const engine =
        engineType === "pregen" ? new PregenEngine() : new LiveEngine();
      await controller.initialize(engine, selectedAlgorithm, array);
    } catch (err) {
      console.error("Failed to initialize sort:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [
    wasmReady,
    isGenerating,
    arraySize,
    selectedAlgorithm,
    controller,
    settings.distribution,
    engineType,
  ]);

  // Playback handlers
  const handlePlay = useCallback(() => controller.play(), [controller]);
  const handlePlayBackward = useCallback(
    () => controller.playBackward(),
    [controller]
  );
  const handlePause = useCallback(() => controller.pause(), [controller]);
  const handleStepForward = useCallback(
    () => controller.stepForward(),
    [controller]
  );
  const handleStepBackward = useCallback(
    () => controller.stepBackward(),
    [controller]
  );
  const handleSeek = useCallback(
    (step: number) => controller.seekTo(step),
    [controller]
  );
  const handleSpeedChange = useCallback(
    (speed: number) => controller.setSpeed(speed),
    [controller]
  );
  const handleReset = useCallback(() => controller.reset(), [controller]);

  // Toggle sidebar
  const handleToggleSidebar = useCallback(() => {
    setSettings({ sidebarOpen: !settings.sidebarOpen });
  }, [settings.sidebarOpen, setSettings]);

  // Show loading state
  if (!wasmReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-base">
        {wasmError ? (
          <div className="text-error">Error: {wasmError}</div>
        ) : (
          <div className="text-muted">Initializing...</div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-base">
      {/* Header */}
      <Header
        sidebarOpen={settings.sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <Canvas renderer={renderer} />
        </div>

        {/* Sidebar */}
        <Sidebar
          isOpen={settings.sidebarOpen}
          engineType={engineType}
          algorithms={algorithms}
          selectedAlgorithm={selectedAlgorithm}
          distribution={settings.distribution}
          arraySize={arraySize}
          themeId={settings.themeId}
          onEngineTypeChange={handleEngineTypeChange}
          onAlgorithmChange={handleAlgorithmChange}
          onDistributionChange={handleDistributionChange}
          onArraySizeChange={handleArraySizeChange}
          onThemeChange={handleThemeChange}
          onGenerate={handleGenerate}
          disabled={isGenerating}
        />
      </div>

      {/* Footer controls */}
      <Controls
        playbackState={controllerState.playbackState}
        direction={controllerState.direction}
        currentStep={controllerState.currentStep}
        totalSteps={controllerState.totalSteps}
        speed={controllerState.speed}
        canSeek={engineType === "pregen"}
        onPlayForward={handlePlay}
        onPlayBackward={handlePlayBackward}
        onPause={handlePause}
        onStepForward={handleStepForward}
        onStepBackward={handleStepBackward}
        onSeek={handleSeek}
        onSpeedChange={handleSpeedChange}
        onReset={handleReset}
      />
    </div>
  );
}

export default App;
