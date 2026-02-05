import type { Distribution, EngineType } from "@/config";
import {
  PREGEN_ARRAY_SIZE_MAX,
  PREGEN_ARRAY_SIZE_MIN,
  LIVE_ARRAY_SIZE_MIN,
  LIVE_ARRAY_SIZE_MAX,
} from "@/config";
import { THEMES } from "@/themes/themes";
import { THEME_IDS, type ThemeId } from "@/themes/types";
import {
  SOUND_WAVEFORMS,
  SOUND_WAVEFORM_LABELS,
  type SoundWaveform,
} from "@/sound/types";

interface SidebarProps {
  isOpen: boolean;
  engineType: EngineType;
  algorithms: string[];
  selectedAlgorithm: string;
  distribution: Distribution;
  arraySize: number;
  themeId: ThemeId;
  soundWaveform: SoundWaveform;
  soundVolume: number;
  onEngineTypeChange: (type: EngineType) => void;
  onAlgorithmChange: (algorithm: string) => void;
  onDistributionChange: (distribution: Distribution) => void;
  onArraySizeChange: (size: number) => void;
  onThemeChange: (themeId: ThemeId) => void;
  onSoundWaveformChange: (waveform: SoundWaveform) => void;
  onSoundVolumeChange: (volume: number) => void;
  onGenerate: () => void;
  disabled?: boolean;
}

/**
 * Collapsible sidebar with settings grouped by section.
 */
export function Sidebar({
  isOpen,
  engineType,
  algorithms,
  selectedAlgorithm,
  distribution,
  arraySize,
  themeId,
  soundWaveform,
  soundVolume,
  onEngineTypeChange,
  onAlgorithmChange,
  onDistributionChange,
  onArraySizeChange,
  onThemeChange,
  onSoundWaveformChange,
  onSoundVolumeChange,
  onGenerate,
  disabled = false,
}: SidebarProps) {
  const isPregen = engineType === "pregen";
  const sizeMin = isPregen ? PREGEN_ARRAY_SIZE_MIN : LIVE_ARRAY_SIZE_MIN;
  const sizeMax = isPregen ? PREGEN_ARRAY_SIZE_MAX : LIVE_ARRAY_SIZE_MAX;

  return (
    <aside className={`sidebar flex flex-col ${isOpen ? "" : "collapsed"}`}>
      {/* Top group - Engine and Array sections */}
      <div className="flex-1">
        {/* Engine Section */}
        <div className="section-header">Engine</div>

        <div className="flex flex-col gap-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="engine"
              checked={engineType === "pregen"}
              onChange={() => onEngineTypeChange("pregen")}
              disabled={disabled}
              className="radio"
            />
            <span className="text-sm text-primary">Pregen (V1)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="engine"
              checked={engineType === "live"}
              onChange={() => onEngineTypeChange("live")}
              disabled={disabled}
              className="radio"
            />
            <span className="text-sm text-primary">Live (V2)</span>
          </label>
        </div>

        {/* Array Section */}
        <div className="section-header">Array</div>

        <div className="flex flex-col gap-3">
          {/* Algorithm */}
          <div className="form-group">
            <label className="label">Algorithm</label>
            <select
              value={selectedAlgorithm}
              onChange={(e) => onAlgorithmChange(e.target.value)}
              disabled={disabled}
              className="select w-full"
            >
              {algorithms.map((algo) => (
                <option key={algo} value={algo}>
                  {formatAlgorithmName(algo)}
                </option>
              ))}
            </select>
          </div>

          {/* Size - different controls for each engine */}
          <div className="form-group">
            <div className="flex items-center justify-between">
              <label className="label">Size</label>
              {isPregen && (
                <span className="mono text-sm text-primary">{arraySize}</span>
              )}
            </div>
            {isPregen ? (
              <input
                type="range"
                min={sizeMin}
                max={sizeMax}
                value={arraySize}
                onChange={(e) =>
                  onArraySizeChange(parseInt(e.target.value, 10))
                }
                disabled={disabled}
                className="slider"
              />
            ) : (
              <input
                type="number"
                min={sizeMin}
                max={sizeMax}
                value={arraySize}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= sizeMin && val <= sizeMax) {
                    onArraySizeChange(val);
                  }
                }}
                disabled={disabled}
                className="input w-full"
              />
            )}
          </div>

          {/* Distribution */}
          <div className="form-group">
            <label className="label">Distribution</label>
            <select
              value={distribution}
              onChange={(e) =>
                onDistributionChange(e.target.value as Distribution)
              }
              disabled={disabled}
              className="select w-full"
            >
              <option value="random">Random</option>
              <option value="uniform">Uniform</option>
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={onGenerate}
            title="Generate new array (G)"
            aria-label="Generate new array"
            disabled={disabled}
            className="btn btn-primary w-full mt-1"
          >
            Generate
          </button>
        </div>
      </div>

      {/* Bottom - Theme Section */}
      <div className="pt-4">
        <div className="section-header">Customization</div>
        <div className="form-group">
          <label className="label">Theme</label>
          <select
            value={themeId}
            onChange={(e) => onThemeChange(e.target.value as ThemeId)}
            className="select w-full"
          >
            {THEME_IDS.map((id) => (
              <option key={id} value={id}>
                {THEMES[id].name}
              </option>
            ))}
          </select>
        </div>

        {/* Sound controls */}
        <div className="form-group mt-3">
          <label className="label">Sound</label>
          <select
            value={soundWaveform}
            onChange={(e) =>
              onSoundWaveformChange(e.target.value as SoundWaveform)
            }
            className="select w-full"
          >
            {SOUND_WAVEFORMS.map((wf) => (
              <option key={wf} value={wf}>
                {SOUND_WAVEFORM_LABELS[wf]}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group mt-2">
          <div className="flex items-center justify-between">
            <label className="label">Volume</label>
            <span className="mono text-sm text-primary">
              {Math.round(soundVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(soundVolume * 100)}
            onChange={(e) =>
              onSoundVolumeChange(parseInt(e.target.value, 10) / 100)
            }
            className="slider w-full"
            disabled={soundWaveform === "none"}
          />
        </div>
      </div>
    </aside>
  );
}

const SPECIAL_ALGORITHM_NAMES: Record<string, string> = {
  quicksort_ll: "Quicksort (LL)",
  quicksort_lr: "Quicksort (LR)",
  radix_lsd: "Radix LSD Sort",
  radix_msd: "Radix MSD Sort",
};

/**
 * Format algorithm name for display.
 */
function formatAlgorithmName(name: string): string {
  if (SPECIAL_ALGORITHM_NAMES[name]) {
    return SPECIAL_ALGORITHM_NAMES[name];
  }

  const formatted = name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  if (!formatted.toLowerCase().endsWith("sort")) {
    return formatted + " Sort";
  }
  return formatted;
}
