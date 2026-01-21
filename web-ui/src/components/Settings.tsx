import type { Distribution } from '@/config';
import { ARRAY_SIZE_MAX, ARRAY_SIZE_MIN } from '@/config';

interface SettingsProps {
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
 * Settings panel for algorithm selection and array configuration.
 */
export function Settings({
  algorithms,
  selectedAlgorithm,
  distribution,
  arraySize,
  onAlgorithmChange,
  onDistributionChange,
  onArraySizeChange,
  onGenerate,
  disabled = false,
}: SettingsProps) {
  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-800 rounded-lg">
      {/* Algorithm selector */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Algorithm</label>
        <select
          value={selectedAlgorithm}
          onChange={(e) => onAlgorithmChange(e.target.value)}
          disabled={disabled}
          className="px-3 py-2 bg-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {algorithms.map((algo) => (
            <option key={algo} value={algo}>
              {formatAlgorithmName(algo)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Distribution</label>
        <select
          value={distribution}
          onChange={(e) => onDistributionChange(e.target.value as Distribution)}
          disabled={disabled}
          className="px-3 py-2 bg-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="random">Random</option>
          <option value="uniform">Uniform</option>
        </select>
      </div>

      {/* Array size input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">
          Array Size: {arraySize}
        </label>
        <input
          type="range"
          min={ARRAY_SIZE_MIN}
          max={ARRAY_SIZE_MAX}
          value={arraySize}
          onChange={(e) => onArraySizeChange(parseInt(e.target.value, 10))}
          disabled={disabled}
          className="h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
        />
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={disabled}
        className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        Generate
      </button>
    </div>
  );
}

const SPECIAL_ALGORITHM_NAMES: Record<string, string> = {
  "quicksort_ll": "Quicksort (LL)",
  "quicksort_lr": "Quicksort (LR)",
  "radix_lsd_sort": "Radix LSD Sort",
  "radix_msd_sort": "Radix MSD Sort",
};

/** Format algorithm name for display (e.g., "bubble_sort" -> "Bubble Sort").
 */
function formatAlgorithmName(name: string): string {
  if (SPECIAL_ALGORITHM_NAMES[name]) {
    return SPECIAL_ALGORITHM_NAMES[name];
  }

  const formatted = name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  if (!formatted.toLowerCase().endsWith('sort')) {
    return formatted + ' Sort';
  }
  return formatted;
}
