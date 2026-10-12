/**
 * Stand-in for `@geolibre/map`. The toolbox only ever needed two things from the
 * map package: `getLayerBounds` (copied verbatim from packages/map/src/geojson-loader.ts)
 * and the `MapEngine` type. This build has no map, so the engine is never provided
 * (callers pass `{ current: null }`) and every `engine?.…` call in the dialog no-ops.
 */
import bbox from "@turf/bbox";
import { type GeoLibreLayer, horizontalBbox } from "@geolibre/core";

export function getLayerBounds(layer: GeoLibreLayer): [number, number, number, number] | null {
  if (layer.metadata.viewportLoading === true) {
    const stored = storedLayerBounds(layer);
    if (stored) return stored;
  }
  if (layer.geojson?.features?.length) {
    const box = horizontalBbox(bbox(layer.geojson));
    if (box) return box;
  }
  return storedLayerBounds(layer);
}

function storedLayerBounds(layer: GeoLibreLayer): [number, number, number, number] | null {
  for (const value of [layer.source.bounds, layer.metadata.bounds]) {
    if (
      Array.isArray(value) &&
      value.length === 4 &&
      value.every((c) => typeof c === "number" && Number.isFinite(c))
    ) {
      return value as [number, number, number, number];
    }
  }
  return null;
}

type Box = [number, number, number, number];

/** The slice of the real MapEngine the processing dialog calls. Never instantiated here. */
export interface MapEngine {
  readView(): { bbox: Box };
  fitLayer(layer: GeoLibreLayer): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMap(): any;
  drawExtent(handlers: {
    onChange: (box: Box) => void;
    onDone: (box: Box) => void;
    onCancel: () => void;
  }): () => void;
  showExtent(box: Box): () => void;
}
