import type { ArrayId, ElementValue } from "@/types/events";

export interface Range {
  lo: number;
  hi: number;
}

export interface ArrayState {
  id: ArrayId;
  values: ElementValue[];
  visible: boolean;
  rangeStack: Range[];
}

export interface WorkspaceState {
  mainArrayId: ArrayId;
  arrays: Map<ArrayId, ArrayState>;
  isSorted: boolean;
}

export type EventDirection = "forward" | "backward";
