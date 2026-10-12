/** Shim: the Python sidecar server is desktop-only; the browser build runs tools in WASM. */
export interface SidecarServerInfo {
  baseUrl: string;
  port: number;
  token: string;
}

export class StaleSidecarError extends Error {
  override name = "StaleSidecarError";
}

export async function startGeoLibreSidecar(): Promise<SidecarServerInfo> {
  throw new Error("The processing server is not available in the web toolbox; tools run in WebAssembly.");
}

export function ignoreSidecarStartError(_error: unknown): void {}

export async function stopGeoLibreSidecar(): Promise<void> {}
