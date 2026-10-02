import type { OperationCounts } from "@/types/operation-counts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const metrics = [
  {
    key: "comparisons",
    short: "CMP",
    label: "Comparisons",
    description: "Comparisons between sorting keys, including saved values.",
  },
  {
    key: "mainWrites",
    short: "MAW",
    label: "Main writes",
    description: "Writes to the main array, includes swap writes.",
  },
  {
    key: "auxWrites",
    short: "AUW",
    label: "Auxiliary writes",
    description:
      "Writes to temporary arrays or saved values, includes swap writes.",
  },
  {
    key: "swaps",
    short: "SWP",
    label: "Swaps",
    description: "Element swaps. Each swap also contributes two writes.",
  },
] as const;

export function OperationStats({ counts }: { counts: OperationCounts }) {
  return (
    <dl
      aria-label="Sort operation counts"
      className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs sm:col-span-1 sm:col-start-2 sm:row-start-1"
    >
      {metrics.map(({ key, short, label, description }) => (
        <Tooltip key={key}>
          <TooltipTrigger
            render={<div tabIndex={0} />}
            className="flex items-baseline gap-1 rounded-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <dt className="text-muted-foreground">
              <span aria-hidden="true" className="cursor-default">
                {short}:
              </span>
              <span className="sr-only">{label}</span>
            </dt>
            <dd className="tabular-nums">{counts[key].toLocaleString()}</dd>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {label} — {description}
          </TooltipContent>
        </Tooltip>
      ))}
    </dl>
  );
}
