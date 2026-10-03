import { PREGEN_ARRAY_SIZE_MAX } from "@/config";

export interface PregenAlgorithmMetadata {
  id: string;
  maxArraySize: number | null;
}

export function getPregenArraySizeMax(
  algorithm: string,
  metadata: PregenAlgorithmMetadata[] = []
): number {
  const limit = metadata.find(({ id }) => id === algorithm)?.maxArraySize;
  return Math.min(PREGEN_ARRAY_SIZE_MAX, limit ?? PREGEN_ARRAY_SIZE_MAX);
}
