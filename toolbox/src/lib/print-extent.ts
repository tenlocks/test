/** Shim: the map "draw extent" overlay does not exist without a map. */
export type PrintExtent = [number, number, number, number];

export async function drawPrintExtent(
  _map: unknown,
  _options?: {
    signal?: AbortSignal;
    drawBox?: boolean;
    onPreview?: (box: PrintExtent | null) => void;
  },
): Promise<PrintExtent | null> {
  return null;
}

export function clearPrintExtent(_map: unknown): void {}
