/**
 * Browser-only replacement for GeoLibre's `lib/tauri-io.ts` (which re-exports ~69 files of
 * Tauri/DuckDB/KML/project I/O). The dialog only uses the six picker functions below; in
 * the browser the original returns null/[] for path pickers and reads bytes via <input type=file>.
 * These are those browser branches, copied over without the Tauri side.
 */
import type { FileDialogFilter } from "./file-dialog-filters";

export type { FileDialogFilter };
export { isTauri } from "./is-tauri";

interface LocalDataFileOptions {
  filters: FileDialogFilter[];
  androidFilters?: FileDialogFilter[];
  accept: string;
  binaryExtensions?: string[];
  readBinary?: boolean;
  readText?: boolean;
  maxBytes?: number;
}

export class FileTooLargeError extends Error {
  constructor(readonly size: number) {
    super(`The file is ${size} bytes, over the limit.`);
    this.name = "FileTooLargeError";
  }
}

export async function openLocalDataFileWithFallback(
  options: LocalDataFileOptions,
): Promise<{ data?: ArrayBuffer; path: string; text?: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = options.accept;
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        if (options.maxBytes != null && file.size > options.maxBytes) {
          throw new FileTooLargeError(file.size);
        }
        const data = options.readBinary ? await file.arrayBuffer() : undefined;
        const text = options.readText ? await file.text() : undefined;
        resolve({ data, path: file.name, text });
      } catch (error) {
        reject(error);
      }
    };
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

export async function openLocalDataFilesWithFallback(
  options: LocalDataFileOptions,
): Promise<Array<{ data: ArrayBuffer; path: string }>> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = options.accept;
    input.onchange = async () => {
      try {
        const files = Array.from(input.files ?? []);
        resolve(await Promise.all(files.map(async (f) => ({ data: await f.arrayBuffer(), path: f.name }))));
      } catch (error) {
        reject(error);
      }
    };
    input.addEventListener("cancel", () => resolve([]));
    input.click();
  });
}

// Browsers never expose real filesystem paths, so these return "nothing picked" and the
// dialog falls through to the byte-reading pickers above.
export async function pickLocalPathWithFallback(
  _options: { accept?: string; directory?: boolean; filters?: FileDialogFilter[] } = {},
): Promise<string | null> {
  return null;
}

export async function pickLocalPathsWithFallback(
  _options: { accept?: string; directory?: boolean; filters?: FileDialogFilter[] } = {},
): Promise<string[]> {
  return [];
}

export async function pickSavePathWithFallback(
  _options: { defaultName?: string; filters?: FileDialogFilter[] } = {},
): Promise<string | null> {
  return null;
}
