import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Shared tooltip and accessible name for compact actions. */
export function ActionButton({
  label,
  shortcut,
  tooltipSide,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  label: string;
  shortcut?: string;
  tooltipSide?: ComponentProps<typeof TooltipContent>["side"];
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button aria-label={label} {...props} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  );
}
