import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import worldData from 'world-atlas/countries-50m.json';

export interface GeoFeature {
  id: string;
  name: string;
  polygons: number[][][][]; // MultiPolygon coordinates: [poly][ring][point[lng, lat]]
}

export interface WorldMapPathItem {
  numericId: string;
  name: string;
  d: string;
  cx: number;
  cy: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

let cachedFeatures: GeoFeature[] | null = null;
let cachedById: Record<string, GeoFeature> | null = null;

function normalizeRings(geometry: { type: string; coordinates: unknown }): number[][][][] {
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates as number[][][]];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates as number[][][][];
  }
  return [];
}

// Official Survey of India northern boundary shared arcs (Jammu & Kashmir, Gilgit-Baltistan, Ladakh & Aksai Chin)
const KASHMIR_WEST_BORDER: [number, number][] = [
  [74.3065, 32.8111],
  [74.06, 32.96],
  [73.76, 33.04],
  [73.68, 33.24],
  [73.62, 33.65],
  [73.48, 34.1],
  [73.66, 34.55],
  [73.92, 34.92],
  [73.96, 35.16],
  [73.46, 35.44],
  [72.88, 35.82],
  [72.54, 36.06],
  [72.52, 36.42],
  [72.92, 36.68],
  [73.1185, 36.8681],
];

const GILGIT_NORTH_CROWN: [number, number][] = [
  [73.4101, 36.882],
  [73.7701, 36.889],
  [74.0401, 36.8265],
  [74.4325, 36.9844],
  [74.6917, 37.0365],
  [74.8897, 36.9532],
  [75.1454, 36.974],
  [75.4226, 36.7379],
  [75.7718, 36.6945],
  [75.9734, 36.3821],
  [75.9698, 36.1685],
  [76.103, 35.9498],
  [76.2506, 35.8109],
  [76.553, 35.8873],
  [76.7654, 35.6616],
];

const AKSAI_CHIN_NORTH_EAST: [number, number][] = [
  [77.0894, 35.5522],
  [77.7986, 35.4967],
  [78.34, 35.82],
  [79.08, 35.84],
  [79.58, 35.56],
  [79.88, 35.16],
  [79.83, 34.62],
  [79.45, 34.2],
  [78.9722, 34.2277],
];

function findNearestVertexIndex(ring: number[][], targetLng: number, targetLat: number): number {
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const dx = ring[i][0] - targetLng;
    const dy = ring[i][1] - targetLat;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestDist < 0.04 ? bestIdx : -1;
}

function applyOfficialIndiaBorders(rawId: string, polygons: number[][][][]): number[][][][] {
  if (rawId !== '356' && rawId !== '586' && rawId !== '156') return polygons;

  // Find mainland exterior ring (largest vertex count)
  let mainIdx = 0;
  let maxLen = 0;
  for (let i = 0; i < polygons.length; i++) {
    const len = polygons[i]?.[0]?.length ?? 0;
    if (len > maxLen) {
      maxLen = len;
      mainIdx = i;
    }
  }
  const ring = polygons[mainIdx]?.[0];
  if (!ring || ring.length < 50) return polygons;

  let nextRing: number[][] | null = null;

  if (rawId === '356') {
    const idxStart = findNearestVertexIndex(ring, 74.3065, 32.8111);
    const idxEnd = findNearestVertexIndex(ring, 78.9722, 34.2277);
    if (idxStart !== -1 && idxEnd !== -1 && idxStart < idxEnd) {
      nextRing = [
        ...ring.slice(0, idxStart),
        ...KASHMIR_WEST_BORDER,
        ...GILGIT_NORTH_CROWN,
        ...AKSAI_CHIN_NORTH_EAST,
        ...ring.slice(idxEnd + 1),
      ];
    }
  } else if (rawId === '586') {
    const idxAkhnoor = findNearestVertexIndex(ring, 74.3065, 32.8111);
    const idxBroghol = findNearestVertexIndex(ring, 73.1185, 36.8681);
    if (idxAkhnoor !== -1 && idxBroghol !== -1 && idxAkhnoor < idxBroghol) {
      const revWest = [...KASHMIR_WEST_BORDER].reverse();
      nextRing = [...ring.slice(idxAkhnoor, idxBroghol + 1), ...revWest.slice(1)];
      nextRing.push([...nextRing[0]]);
    }
  } else if (rawId === '156') {
    const idxDemchok = findNearestVertexIndex(ring, 78.9722, 34.2277);
    const idxKarakoramW = findNearestVertexIndex(ring, 76.7654, 35.6616);
    if (idxDemchok !== -1 && idxKarakoramW !== -1 && idxDemchok < idxKarakoramW) {
      const revAksai = [[76.7654, 35.6616] as [number, number], ...AKSAI_CHIN_NORTH_EAST].reverse();
      nextRing = [...ring.slice(0, idxDemchok), ...revAksai, ...ring.slice(idxKarakoramW + 1)];
    }
  }

  if (!nextRing) return polygons;
  return polygons.map((poly, i) => (i === mainIdx ? [nextRing!, ...poly.slice(1)] : poly));
}

export function getWorldFeatures(): GeoFeature[] {
  if (cachedFeatures) return cachedFeatures;

  const topo = worldData as unknown as Topology<{
    countries: GeometryCollection<{ name: string }>;
  }>;
  const fc = feature(topo, topo.objects.countries);

  const features: GeoFeature[] = [];
  const byId: Record<string, GeoFeature> = {};

  for (const f of fc.features) {
    if (!f.geometry) continue;
    const rawId = f.id != null ? String(f.id).padStart(3, '0') : '';
    const propName = f.properties?.name || '';
    const rawPolygons = normalizeRings(f.geometry as unknown as { type: string; coordinates: unknown });
    if (rawPolygons.length === 0) continue;
    const polygons = applyOfficialIndiaBorders(rawId, rawPolygons);

    // Skip Antarctica (010) from clickable country map unless needed for globe land
    const item: GeoFeature = {
      id: rawId,
      name: propName,
      polygons,
    };
    features.push(item);

    // Avoid overwriting Australia (036) with Ashmore and Cartier Is. (036)
    if (rawId) {
      if (!byId[rawId]) {
        byId[rawId] = item;
      } else if (rawId === '036' && propName === 'Australia') {
        byId[rawId] = item;
      } else if (propName !== 'Ashmore and Cartier Is.') {
        byId[rawId] = {
          ...byId[rawId],
          polygons: [...byId[rawId].polygons, ...polygons],
        };
      }
    }
  }

  cachedFeatures = features;
  cachedById = byId;
  return features;
}

export function getFeatureByNumericId(numericId: string): GeoFeature | undefined {
  if (!cachedById) getWorldFeatures();
  return cachedById?.[numericId];
}

// Equirectangular projection into a 1000 x 500 SVG space (excluding Antarctica bottom margin optional)
export const WORLD_SVG_WIDTH = 1000;
export const WORLD_SVG_HEIGHT = 500;

export function projectLngLat(lng: number, lat: number): [number, number] {
  const x = ((lng + 180) / 360) * WORLD_SVG_WIDTH;
  const y = ((90 - lat) / 180) * WORLD_SVG_HEIGHT;
  return [x, y];
}

function clipRingHalfPlane(
  ring: number[][],
  bound: number,
  keepLessOrEqual: boolean
): number[][] {
  if (ring.length < 3) return [];
  const inside = (lng: number) => (keepLessOrEqual ? lng <= bound : lng >= bound);
  const intersect = (a: number[], b: number[]): number[] => {
    const dx = b[0] - a[0];
    if (Math.abs(dx) < 1e-9) return [bound, a[1]];
    const t = (bound - a[0]) / dx;
    return [bound, a[1] + t * (b[1] - a[1])];
  };

  const out: number[][] = [];
  let prev = ring[ring.length - 1];
  let prevIn = inside(prev[0]);

  for (let i = 0; i < ring.length; i++) {
    const curr = ring[i];
    const currIn = inside(curr[0]);
    if (currIn) {
      if (!prevIn) out.push(intersect(prev, curr));
      out.push(curr);
    } else if (prevIn) {
      out.push(intersect(prev, curr));
    }
    prev = curr;
    prevIn = currIn;
  }
  return out.length >= 3 ? out : [];
}

export function splitRingAtAntimeridian(ring: number[][]): number[][][] {
  if (ring.length < 3) return [];
  let hasJump = false;
  for (let i = 1; i < ring.length; i++) {
    if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) {
      hasJump = true;
      break;
    }
  }
  if (!hasJump) return [ring];

  // Unwrap continuous longitudes across +-180
  const unwrapped: number[][] = [[ring[0][0], ring[0][1]]];
  for (let i = 1; i < ring.length; i++) {
    let lng = ring[i][0];
    const prevLng = unwrapped[i - 1][0];
    while (lng - prevLng > 180) lng -= 360;
    while (lng - prevLng < -180) lng += 360;
    unwrapped.push([lng, ring[i][1]]);
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const pt of unwrapped) {
    if (pt[0] < minLng) minLng = pt[0];
    if (pt[0] > maxLng) maxLng = pt[0];
  }

  // Only crosses +180 or -180 boundary cleanly via half-plane clipping
  const pieces: number[][][] = [];
  if (maxLng > 180) {
    const west = clipRingHalfPlane(unwrapped, 180, true);
    const east = clipRingHalfPlane(unwrapped, 180, false).map(([x, y]) => [x - 360, y]);
    if (west.length >= 3) pieces.push(west);
    if (east.length >= 3) pieces.push(east);
  } else if (minLng < -180) {
    const east = clipRingHalfPlane(unwrapped, -180, false);
    const west = clipRingHalfPlane(unwrapped, -180, true).map(([x, y]) => [x + 360, y]);
    if (east.length >= 3) pieces.push(east);
    if (west.length >= 3) pieces.push(west);
  } else {
    pieces.push(unwrapped);
  }

  return pieces.length > 0 ? pieces : [ring];
}

function ringToSvgPath(ring: number[][], project: (lng: number, lat: number) => [number, number]): string {
  if (ring.length < 2) return '';
  let d = '';
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = project(ring[i][0], ring[i][1]);
    const cmd = i === 0 ? 'M' : 'L';
    d += `${cmd}${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return d + 'Z';
}

let cachedWorldMapPaths: WorldMapPathItem[] | null = null;

export function getWorldMapPaths(): WorldMapPathItem[] {
  if (cachedWorldMapPaths) return cachedWorldMapPaths;
  const features = getWorldFeatures();
  const items: WorldMapPathItem[] = [];

  for (const f of features) {
    if (f.id === '010') continue; // Omit Antarctica from country click map for cleaner framing
    let d = '';
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let largestPolyArea = -1;
    let bestCx = 0;
    let bestCy = 0;

    for (const poly of f.polygons) {
      for (let rIdx = 0; rIdx < poly.length; rIdx++) {
        const subRings = splitRingAtAntimeridian(poly[rIdx]);
        for (const ring of subRings) {
          if (ring.length < 3) continue;
          let pMinX = Infinity;
          let pMaxX = -Infinity;
          let pMinY = Infinity;
          let pMaxY = -Infinity;
          let sumX = 0;
          let sumY = 0;

          for (const pt of ring) {
            const [x, y] = projectLngLat(pt[0], pt[1]);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            if (x < pMinX) pMinX = x;
            if (x > pMaxX) pMaxX = x;
            if (y < pMinY) pMinY = y;
            if (y > pMaxY) pMaxY = y;
            sumX += x;
            sumY += y;
          }
          if (rIdx === 0) {
            const area = (pMaxX - pMinX) * (pMaxY - pMinY);
            if (area > largestPolyArea) {
              largestPolyArea = area;
              bestCx = sumX / ring.length;
              bestCy = sumY / ring.length;
            }
          }
          d += ringToSvgPath(ring, projectLngLat);
        }
      }
    }

    if (d && Number.isFinite(minX)) {
      items.push({
        numericId: f.id,
        name: f.name,
        d,
        cx: bestCx,
        cy: bestCy,
        minX,
        minY,
        maxX,
        maxY,
      });
    }
  }

  cachedWorldMapPaths = items;
  return items;
}

/**
 * Generates an aspect-preserved, centered SVG path inside a 240x240 viewBox
 * for Country Silhouette mode and Atlas country detail previews.
 */
export function getCountrySilhouetteSvg(
  numericId: string,
  fallbackLat: number,
  fallbackLng: number,
  size = 240,
  padding = 22
): { d: string; isAtollFallback: boolean } {
  const f = getFeatureByNumericId(numericId);
  if (!f || f.polygons.length === 0) {
    // Clean stylized atoll/island marker fallback (e.g. Tuvalu 798)
    const cx = size / 2;
    const cy = size / 2;
    const islands = [
      [cx - 32, cy - 28, 8],
      [cx - 12, cy - 16, 10],
      [cx + 10, cy - 6, 9],
      [cx + 26, cy + 12, 11],
      [cx + 36, cy + 32, 7],
    ];
    const d = islands
      .map(
        ([x, y, r]) =>
          `M${x - r},${y}a${r},${r * 0.72} 0 1,0 ${r * 2},0a${r},${r * 0.72} 0 1,0 -${r * 2},0`
      )
      .join(' ');
    return { d, isAtollFallback: true };
  }

  // Handle antimeridian wrap cleanly for isolated country silhouettes
  const adjustLng = (lng: number): number => {
    if (fallbackLng > 100 && lng < -100) return lng + 360;
    if (fallbackLng < -50 && lng > 150) return lng - 360;
    return lng;
  };

  // Use cos(lat) correction so high-latitude countries aren't stretched horizontally
  const cosLat = Math.max(0.28, Math.cos((fallbackLat * Math.PI) / 180));

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const projectedPolys: [number, number][][][] = f.polygons.map((poly) =>
    poly.map((ring) =>
      ring.map(([lng, lat]) => {
        const px = adjustLng(lng) * cosLat;
        const py = -lat;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        return [px, py] as [number, number];
      })
    )
  );

  const rawW = Math.max(0.05, maxX - minX);
  const rawH = Math.max(0.05, maxY - minY);
  const usable = size - padding * 2;
  const scale = Math.min(usable / rawW, usable / rawH);
  const offsetX = (size - rawW * scale) / 2 - minX * scale;
  const offsetY = (size - rawH * scale) / 2 - minY * scale;

  let d = '';
  for (const poly of projectedPolys) {
    for (const ring of poly) {
      if (ring.length < 3) continue;
      for (let i = 0; i < ring.length; i++) {
        const sx = ring[i][0] * scale + offsetX;
        const sy = ring[i][1] * scale + offsetY;
        d += `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
      }
      d += 'Z';
    }
  }

  return { d, isAtollFallback: false };
}
