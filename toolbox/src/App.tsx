import { useAppStore } from "@geolibre/core";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ProcessingDialog } from "./components/processing/ProcessingDialog";
import type { MapEngine } from "./shims/map";

/** Save bytes through a transient object URL. */
function download(bytes: Uint8Array, filename: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Host shell. GeoLibre's desktop shell owns the map; here there is none, so:
 *  - `mapControllerRef` is permanently null (the dialog optional-chains every use),
 *  - raster / LiDAR tool outputs are handed to the user as downloads instead of map layers.
 */
export function App() {
  const mapRef = useRef<MapEngine | null>(null);
  const setProcessingOpen = useAppStore((s) => s.setProcessingOpen);
  const open = useAppStore((s) => s.ui.processingOpen);
  const layers = useAppStore((s) => s.layers);
  const removeLayer = useAppStore((s) => s.removeLayer);
  const { i18n } = useTranslation();

  useEffect(() => {
    setProcessingOpen(true);
  }, [setProcessingOpen]);

  const results = layers.filter((l) => l.geojson?.features?.length);

  return (
    <div className="flex h-full flex-col bg-muted/30 text-sm">
      {/* The dialog is a fixed-position floating window, so results live in the header strip above it. */}
      <header className="relative z-[100] flex max-h-24 flex-wrap items-center gap-2 overflow-auto border-b bg-background px-4 py-2">
        <b>GeoLibre Toolbox</b>
        {!open && (
          <button
            className="rounded-md bg-primary px-3 py-1 text-primary-foreground"
            onClick={() => setProcessingOpen(true)}
          >
            Open toolbox
          </button>
        )}
        <span data-testid="results" className="flex flex-wrap items-center gap-2">
          {results.map((l) => (
            <span key={l.id} className="flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5">
              {l.name} · {l.geojson?.features.length}
              <button
                className="rounded px-1 text-primary underline"
                data-testid="download-geojson"
                onClick={() =>
                  download(
                    new TextEncoder().encode(JSON.stringify(l.geojson)),
                    `${l.name.replace(/\s+/g, "_")}.geojson`,
                  )
                }
              >
                .geojson
              </button>
              <button className="px-1" aria-label="remove" onClick={() => removeLayer(l.id)}>
                ✕
              </button>
            </span>
          ))}
        </span>
        <button
          className="ms-auto rounded-md border px-2 py-1"
          onClick={() => void i18n.changeLanguage(i18n.language.startsWith("zh") ? "en" : "zh")}
        >
          {i18n.language.startsWith("zh") ? "English" : "中文"}
        </button>
      </header>
      <ProcessingDialog
        mapControllerRef={mapRef}
        onAddRaster={(bytes, name, fileName) => download(bytes, fileName ?? `${name}.tif`)}
        onAddLidar={async (bytes, _name, fileName) => {
          download(bytes, fileName);
          return true;
        }}
      />
    </div>
  );
}
