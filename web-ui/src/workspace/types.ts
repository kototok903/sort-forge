import type { ArrayId, ElementValue } from "@/types/events";

export interface Range {
  lo: number;
  hi: number;
}

/**
 * Records indices that got either consumed or unconsumed
 * (only one is possible at a time) by an event.
 */
export interface ConsumptionChange {
  indices: number[];
  consumed: boolean;
}

export interface ArrayState {
  id: ArrayId;
  values: ElementValue[];
  visible: boolean;
  consumed: boolean[];
  consumptionHistory: ConsumptionChange[];
  rangeStack: Range[];
}

export interface WorkspaceState {
  mainArrayId: ArrayId;
  arrays: Map<ArrayId, ArrayState>;
  isSorted: boolean;
}

export type EventDirection = "forward" | "backward";
