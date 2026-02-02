import type { Distribution } from "@/config";
import { ARRAY_SIZE_MAX, ARRAY_SIZE_MIN } from "@/config";

interface SidebarProps {
  isOpen: boolean;
  algorithms: string[];
  selectedAlgorithm: string;
  distribution: Distribution;
  arraySize: number;
  onAlgorithmChange: (algorithm: string) => void;
  onDistributionChange: (distribution: Distribution) => void;
  onArraySizeChange: (size: number) => void;
  onGenerate: () => void;
  disabled?: boolean;
}

/**
 * Collapsible sidebar with settings grouped by section.
 */
export function Sidebar({
  isOpen,
  algorithms,
  selectedAlgorithm,
  distribution,
  arraySize,
  onAlgorithmChange,
  onDistributionChange,
  onArraySizeChange,
  onGenerate,
  disabled = false,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? "" : "collapsed"}`}>
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

        {/* Size */}
        <div className="form-group">
          <div className="flex items-center justify-between">
            <label className="label">Size</label>
            <span className="mono text-sm text-primary">{arraySize}</span>
          </div>
          <input
            type="range"
            min={ARRAY_SIZE_MIN}
            max={ARRAY_SIZE_MAX}
            value={arraySize}
            onChange={(e) => onArraySizeChange(parseInt(e.target.value, 10))}
            disabled={disabled}
            className="slider"
          />
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
          disabled={disabled}
          className="btn btn-primary w-full mt-1"
        >
          Generate
        </button>
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
