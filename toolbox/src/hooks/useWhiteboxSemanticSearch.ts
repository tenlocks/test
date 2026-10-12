import type { WhiteboxTool } from "@geolibre/processing";

/** Shim: semantic ("search by meaning") lookup needs a hosted embedding endpoint; disabled here. */
export interface WhiteboxSemanticSearch {
  matches: readonly { id: string; [key: string]: unknown }[] | null;
  pending: boolean;
  available: boolean;
}

const OFF: WhiteboxSemanticSearch = { matches: null, pending: false, available: false };

export function useWhiteboxSemanticSearch(
  _query: string,
  _scoped: readonly WhiteboxTool[],
  _filtered: readonly WhiteboxTool[],
  _ready: boolean,
): WhiteboxSemanticSearch {
  return OFF;
}
