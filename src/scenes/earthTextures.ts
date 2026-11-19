import * as THREE from 'three';
import { SOVEREIGN_COUNTRIES } from '../data/countries';
import { GLOBE_HOTSPOTS } from '../data/hotspots';
import { getFlagUrl } from '../data/flags';
import { getWorldFeatures, splitRingAtAntimeridian } from '../data/worldGeometry';
import { computeEarthTextureDimensions } from './earthTextureConfig';

export { computeEarthTextureDimensions };

export interface EarthTextureBundle {
  width: number;
  height: number;
  albedo: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
  nightLights: THREE.Texture;
  clouds: THREE.Texture;
  starSprite: THREE.CanvasTexture;
  dispose: () => void;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Gaussian region influence in degrees (handles wrapped longitudes cleanly)
function regionWeight(
  lat: number,
  lng: number,
  cLat: number,
  cLng: number,
  rLat: number,
  rLng: number
): number {
  let dLng = lng - cLng;
  if (dLng > 180) dLng -= 360;
  if (dLng < -180) dLng += 360;
  const dLat = (lat - cLat) / rLat;
  const dLon = dLng / rLng;
  const d2 = dLat * dLat + dLon * dLon;
  if (d2 > 4.8) return 0;
  return Math.exp(-d2);
}

// Precompute 256x256 seamless 3D noise LUT (IQ two-channel slice trick for fast 3D GLSL noise)
function createNoiseLutTexture(): THREE.DataTexture {
  const size = 256;
  const base = new Uint8Array(size * size);
  let seed = 133791;
  for (let i = 0; i < base.length; i++) {
    seed = (seed * 16807) % 2147483647;
    base[i] = ((seed - 1) & 255) ^ (((seed - 1) >>> 8) & 255);
  }

  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const x2 = (x + 37) & 255;
      const y2 = (y + 17) & 255;
      const x3 = (x + 73) & 255;
      const y3 = (y + 41) & 255;
      const p4 = idx * 4;
      rgba[p4] = base[idx];
      rgba[p4 + 1] = base[y2 * size + x2];
      rgba[p4 + 2] = base[y3 * size + x3];
      rgba[p4 + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(rgba, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Precompute 1024x512 global geological, biome & bathymetric ridge LUT (flipY = false: y=0 -> -90°, y=H-1 -> +90°)
function createBiomeLutTexture(): THREE.DataTexture {
  const w = 1024;
  const h = 512;
  const data = new Uint8Array(w * h * 4);

  for (let y = 0; y < h; y++) {
    const lat = ((y + 0.5) / h) * 180 - 90;
    const row = y * w;

    for (let x = 0; x < w; x++) {
      const lng = ((x + 0.5) / w) * 360 - 180;

      // Major tectonic mountain chains & high plateaus
      const mtnBelt = clamp01(
        regionWeight(lat, lng, 33.0, 84.0, 8.5, 20.0) * 1.25 + // Himalayas / Tibetan Plateau
          regionWeight(lat, lng, 36.5, 73.5, 4.5, 7.0) * 1.15 + // Karakoram / Pamirs
          regionWeight(lat, lng, 42.0, 81.0, 3.8, 11.0) * 0.85 + // Tien Shan
          regionWeight(lat, lng, 48.0, 90.0, 4.5, 10.0) * 0.72 + // Altai
          regionWeight(lat, lng, -16.0, -68.5, 18.0, 4.5) * 1.12 + // Central/Northern Andes
          regionWeight(lat, lng, -38.0, -70.5, 12.0, 3.2) * 1.0 + // Southern Andes
          regionWeight(lat, lng, 47.0, -113.0, 14.0, 8.0) * 0.92 + // Rockies
          regionWeight(lat, lng, 62.5, -148.0, 5.0, 12.0) * 0.85 + // Alaska Range
          regionWeight(lat, lng, 22.0, -101.0, 7.0, 4.5) * 0.68 + // Sierra Madre
          regionWeight(lat, lng, 37.0, -80.5, 6.5, 4.5) * 0.45 + // Appalachians
          regionWeight(lat, lng, 46.3, 10.2, 3.2, 6.5) * 0.95 + // European Alps
          regionWeight(lat, lng, 42.7, 0.8, 2.0, 3.5) * 0.72 + // Pyrenees
          regionWeight(lat, lng, 46.5, 25.0, 3.5, 5.0) * 0.58 + // Carpathians
          regionWeight(lat, lng, 64.0, 14.0, 7.0, 5.0) * 0.62 + // Scandinavian Mtns
          regionWeight(lat, lng, 42.6, 44.0, 2.8, 6.0) * 0.88 + // Caucasus
          regionWeight(lat, lng, 60.0, 59.5, 10.0, 3.0) * 0.5 + // Urals
          regionWeight(lat, lng, 32.5, 50.5, 5.5, 8.5) * 0.76 + // Zagros / Iranian Plateau
          regionWeight(lat, lng, 38.5, 35.0, 3.5, 7.0) * 0.65 + // Anatolian Plateau
          regionWeight(lat, lng, 32.0, -5.0, 3.0, 7.0) * 0.7 + // Atlas Mtns
          regionWeight(lat, lng, 9.5, 39.0, 5.5, 4.5) * 0.76 + // Ethiopian Highlands
          regionWeight(lat, lng, -3.0, 36.0, 5.0, 3.5) * 0.62 + // East African Rift
          regionWeight(lat, lng, -29.0, 28.5, 4.0, 4.0) * 0.62 + // Drakensberg
          regionWeight(lat, lng, 14.0, 75.0, 5.5, 2.2) * 0.55 + // Western Ghats
          regionWeight(lat, lng, 36.2, 138.0, 3.2, 3.2) * 0.74 + // Japanese Alps
          regionWeight(lat, lng, -5.0, 140.0, 3.0, 7.0) * 0.78 + // New Guinea Highlands
          regionWeight(lat, lng, -43.8, 170.2, 3.5, 2.5) * 0.82 + // Southern Alps NZ
          regionWeight(lat, lng, -31.0, 150.0, 7.5, 2.8) * 0.45 // Great Dividing Range
      );

      // Deserts, sand seas, and arid plateaus
      const desertWeight = clamp01(
        regionWeight(lat, lng, 23.0, 12.0, 9.5, 24.0) * 1.25 + // Sahara
          regionWeight(lat, lng, 23.0, 46.0, 7.5, 11.5) * 1.15 + // Arabian
          regionWeight(lat, lng, 33.0, 40.5, 4.5, 6.5) * 0.9 + // Syrian
          regionWeight(lat, lng, 32.0, 55.0, 5.0, 7.0) * 0.88 + // Dasht-e Kavir / Lut
          regionWeight(lat, lng, 27.0, 71.0, 4.0, 4.2) * 0.88 + // Thar
          regionWeight(lat, lng, 42.0, 62.0, 5.5, 9.5) * 0.85 + // Karakum / Kyzylkum
          regionWeight(lat, lng, 41.0, 88.0, 6.5, 17.5) * 0.98 + // Gobi / Taklamakan
          regionWeight(lat, lng, -24.0, 131.0, 7.5, 12.5) * 1.12 + // Australian Outback
          regionWeight(lat, lng, 32.5, -112.0, 6.5, 7.5) * 0.92 + // Sonoran / Mojave
          regionWeight(lat, lng, 40.0, -117.0, 5.0, 5.0) * 0.75 + // Great Basin
          regionWeight(lat, lng, -23.5, -69.2, 6.0, 2.8) * 0.92 + // Atacama
          regionWeight(lat, lng, -44.0, -68.5, 6.5, 3.5) * 0.72 + // Patagonian Steppe
          regionWeight(lat, lng, -24.0, 17.0, 6.0, 5.0) * 0.9 + // Namib / Kalahari
          regionWeight(lat, lng, 6.0, 46.5, 5.0, 4.5) * 0.72 // Somali / Ogaden
      );

      // Tropical rainforests & fertile alluvial basins
      const lushWeight = clamp01(
        regionWeight(lat, lng, -4.0, -62.0, 10.5, 14.5) * 1.2 + // Amazon
          regionWeight(lat, lng, 0.0, 22.0, 7.0, 9.5) * 1.1 + // Congo
          regionWeight(lat, lng, 0.0, 112.0, 9.0, 16.0) * 1.0 + // Maritime SE Asia
          regionWeight(lat, lng, 26.2, 82.5, 3.8, 8.5) * 0.92 + // Indo-Gangetic Plains
          regionWeight(lat, lng, 29.8, 31.2, 3.2, 1.8) * 0.85 + // Nile Delta & Corridor
          regionWeight(lat, lng, 14.0, 103.5, 5.5, 5.0) * 0.84 + // Mekong / Indochina
          regionWeight(lat, lng, 29.5, 114.5, 5.5, 7.0) * 0.76 + // Yangtze / Pearl
          regionWeight(lat, lng, 35.0, -90.0, 7.0, 9.0) * 0.64 + // Mississippi Basin
          regionWeight(lat, lng, 51.0, 2.0, 6.5, 11.0) * 0.58 // Temperate NW Europe
      );

      // Greenland dome + Mid-ocean ridges (sampled subtly on ocean pixels)
      const greenland = regionWeight(lat, lng, 73.0, -42.0, 9.5, 13.0);
      const midAtlantic = regionWeight(lat, lng, 12.0, -34.0, 44.0, 5.5) * 0.7;
      const eastPacific = regionWeight(lat, lng, -18.0, -112.0, 34.0, 6.5) * 0.6;
      const ridgeHint = clamp01(Math.max(greenland, midAtlantic, eastPacific));

      const p4 = (row + x) * 4;
      data[p4] = Math.round(mtnBelt * 255);
      data[p4 + 1] = Math.round(desertWeight * 255);
      data[p4 + 2] = Math.round(lushWeight * 255);
      data[p4 + 3] = Math.round(ridgeHint * 255);
    }
  }

  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const BAKE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Pass 1: Synthesize 8K high-precision 16-bit elevation heightfield + snow/ice mask + crisp land mask
const TERRAIN_DATA_FRAG = /* glsl */ `
  uniform sampler2D uVectorMask;
  uniform sampler2D uShelfTex;
  uniform sampler2D uBiomeLut;
  uniform sampler2D uNoiseLut;
  varying vec2 vUv;

  const float PI = 3.141592653589793;

  float fastNoise3(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy;
    vec2 rg = texture2D(uNoiseLut, (uv + 0.5) / 256.0).yx;
    return mix(rg.x, rg.y, f.z);
  }

  float fbm4(vec3 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      s += a * fastNoise3(p);
      p = p * 2.07 + vec3(1.7, 9.2, 4.3);
      a *= 0.5;
    }
    return s * 1.0666;
  }

  // Sharp tectonic ridged multifractal (5 octaves) for authentic Himalayas / Andes / Alps
  float ridgedTectonic(vec3 p) {
    float sum = 0.0;
    float freq = 1.0;
    float amp = 0.54;
    float weight = 1.0;
    for (int i = 0; i < 5; i++) {
      float n = fastNoise3(p * freq);
      float signal = 1.0 - abs(n * 2.0 - 1.0);
      signal *= signal;
      signal *= weight;
      weight = clamp(signal * 1.85, 0.12, 1.0);
      sum += signal * amp;
      freq *= 2.18;
      amp *= 0.5;
    }
    return clamp(sum * 0.92, 0.0, 1.0);
  }

  void main() {
    float landMask = texture2D(uVectorMask, vUv).r;
    vec2 shelfSample = texture2D(uShelfTex, vUv).rg;
    vec4 biome = texture2D(uBiomeLut, vUv);

    float lat = (vUv.y - 0.5) * PI;
    float lng = (vUv.x - 0.5) * PI * 2.0;
    float cosLat = cos(lat);
    vec3 sp = vec3(cosLat * cos(lng), sin(lat), cosLat * sin(lng));

    // Domain-warped spherical coordinates so tectonic chains curve organically
    float warpA = fbm4(sp * 3.8 + vec3(1.4, 2.7, 0.8)) - 0.5;
    float warpB = fbm4(sp * 3.8 + vec3(6.1, 1.2, 5.4)) - 0.5;
    vec3 wp = sp + vec3(warpA, warpB, warpA - warpB) * 0.085;

    float nMacro = fbm4(wp * 4.5 + vec3(2.1, 4.3, 1.1));
    float nDetail = fbm4(wp * 24.0 + vec3(5.2, 1.9, 3.7));
    float nMicro = fastNoise3(sp * 110.0 + vec3(2.3, 8.1, 4.4));
    float nFine = fastNoise3(sp * 260.0 + vec3(9.4, 3.1, 7.2));

    float mtnBelt = biome.r;
    float desert = biome.g;
    float ridgeBias = biome.a;

    float elev = 0.0;
    float snowIce = 0.0;

    if (landMask > 0.25) {
      float tRidge = ridgedTectonic(wp * 13.5 + vec3(4.1, 6.3, 2.4));
      float subRidge = ridgedTectonic(wp * 34.0 + vec3(1.2, 8.8, 3.5));

      float interior = clamp((shelfSample.g - 0.28) * 1.7, 0.0, 1.0);
      float coastalErosion = smoothstep(0.25, 0.85, landMask);

      // Folded tectonic relief + undulating foothills + wind-sculpted desert dunes
      float tectonicH = mtnBelt * (0.28 + tRidge * 0.62 + subRidge * 0.24);
      float hillH = nMacro * 0.18 + nDetail * 0.14 + subRidge * 0.06;
      float duneRipples = desert * (sin(sp.x * 160.0 + nDetail * 14.0) * 0.5 + 0.5) * 0.035;

      float landElev = clamp(
        0.26 + (0.04 + interior * 0.18 + hillH + tectonicH + duneRipples + (nMicro - 0.5) * 0.045 + (nFine - 0.5) * 0.022) * coastalErosion,
        0.26,
        0.998
      );
      elev = landElev;

      // Polar ice caps, Greenland sheet & alpine summit snowlines
      float absLatDeg = abs(vUv.y - 0.5) * 180.0;
      float latDeg = (vUv.y - 0.5) * 180.0;
      float polarLat = latDeg < -64.0
        ? clamp((-latDeg - 63.0) / 10.0, 0.0, 1.0)
        : clamp((latDeg - 69.5 + (nMacro - 0.5) * 8.0) / 10.0, 0.0, 1.0);
      float greenlandIce = ridgeBias * step(58.0, latDeg);
      float snowPeak = clamp((landElev - 0.76) * 5.2 + (subRidge - 0.4) * 0.25 * step(0.7, landElev), 0.0, 1.0);
      // Lower snowline slightly at high northern/southern latitudes
      float alpineLatBoost = smoothstep(25.0, 62.0, absLatDeg) * clamp((landElev - 0.64) * 3.4, 0.0, 1.0);
      snowIce = clamp(max(max(polarLat, greenlandIce * 0.92), max(snowPeak, alpineLatBoost * 0.85)), 0.0, 1.0);
    } else {
      // Oceanic bathymetry (abyssal plains, mid-ocean ridges, continental shelf)
      float shelf = clamp(shelfSample.r * 1.45, 0.0, 1.0);
      float seaFloor = 0.05 + nMacro * 0.05 + ridgeBias * 0.04 + (nMicro - 0.5) * 0.008;
      elev = mix(seaFloor, 0.23, shelf * 0.85);

      float absLatDeg = abs(vUv.y - 0.5) * 180.0;
      snowIce = absLatDeg > 73.5
        ? clamp((absLatDeg - 73.5 + (nMacro - 0.5) * 10.0) / 7.5, 0.0, 1.0)
        : 0.0;
    }

    // Blend elevation smoothly right across the shoreline anti-aliased edge
    float hScaled = clamp(elev, 0.0, 0.99998) * 65535.0;
    float hi = floor(hScaled / 256.0);
    float lo = hScaled - hi * 256.0;

    gl_FragColor = vec4(hi / 255.0, lo / 255.0, snowIce, landMask);
  }
`;

// Pass 2: Bake crisp 8K Snow-Free Satellite Diffuse Albedo (Linear PBR Reflectance into SRGB8_ALPHA8 RT)
const ALBEDO_FRAG = /* glsl */ `
  uniform sampler2D uTerrainData;
  uniform sampler2D uVectorMask;
  uniform sampler2D uShelfTex;
  uniform sampler2D uBiomeLut;
  uniform sampler2D uNoiseLut;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  const float PI = 3.141592653589793;

  float unpackH(vec2 rg) {
    float hi = floor(rg.r * 255.0 + 0.5);
    float lo = floor(rg.g * 255.0 + 0.5);
    return (hi * 256.0 + lo) / 65535.0;
  }

  float fastNoise3(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy;
    vec2 rg = texture2D(uNoiseLut, (uv + 0.5) / 256.0).yx;
    return mix(rg.x, rg.y, f.z);
  }

  void main() {
    vec4 tCenter = texture2D(uTerrainData, vUv);
    float elev = unpackH(tCenter.rg);
    float landMask = tCenter.a;
    vec2 vecMask = texture2D(uVectorMask, vUv).rg;
    vec2 shelfSample = texture2D(uShelfTex, vUv).rg;
    vec4 biome = texture2D(uBiomeLut, vUv);

    float lat = (vUv.y - 0.5) * PI;
    float lng = (vUv.x - 0.5) * PI * 2.0;
    float cosLat = cos(lat);
    vec3 sp = vec3(cosLat * cos(lng), sin(lat), cosLat * sin(lng));

    float nMacro = fastNoise3(sp * 6.0 + vec3(1.2, 3.4, 2.2));
    float nDetail = fastNoise3(sp * 32.0 + vec3(4.1, 1.9, 6.3));
    float nGrain = fastNoise3(sp * 190.0 + vec3(7.7, 2.5, 5.1));

    // Dual-radius cavity AO from 8K elevation field (carves crisp canyon & valley shadows)
    float hL1 = unpackH(texture2D(uTerrainData, vec2(fract(vUv.x - uTexelSize.x * 2.0), vUv.y)).rg);
    float hR1 = unpackH(texture2D(uTerrainData, vec2(fract(vUv.x + uTexelSize.x * 2.0), vUv.y)).rg);
    float hU1 = unpackH(texture2D(uTerrainData, vec2(vUv.x, clamp(vUv.y + uTexelSize.y * 2.0, 0.0, 1.0))).rg);
    float hD1 = unpackH(texture2D(uTerrainData, vec2(vUv.x, clamp(vUv.y - uTexelSize.y * 2.0, 0.0, 1.0))).rg);
    float hL2 = unpackH(texture2D(uTerrainData, vec2(fract(vUv.x - uTexelSize.x * 6.0), vUv.y)).rg);
    float hR2 = unpackH(texture2D(uTerrainData, vec2(fract(vUv.x + uTexelSize.x * 6.0), vUv.y)).rg);
    float hU2 = unpackH(texture2D(uTerrainData, vec2(vUv.x, clamp(vUv.y + uTexelSize.y * 6.0, 0.0, 1.0))).rg);
    float hD2 = unpackH(texture2D(uTerrainData, vec2(vUv.x, clamp(vUv.y - uTexelSize.y * 6.0, 0.0, 1.0))).rg);
    float avgN = 0.125 * (hL1 + hR1 + hU1 + hD1 + hL2 + hR2 + hU2 + hD2);
    float cavity = clamp(0.95 + (elev - avgN) * 26.0, 0.42, 1.22);

    // Physical linear PBR reflectance palette (realistic NASA Blue Marble Earth tones)
    float absLat = abs((vUv.y - 0.5) * 180.0);
    float latNorm = clamp(absLat / 72.0, 0.0, 1.0);

    // Temperate olive-meadow -> mossy tundra
    vec3 vegCol = mix(vec3(0.022, 0.072, 0.015), vec3(0.048, 0.062, 0.026), latNorm);
    float borealMask = smoothstep(46.0, 64.0, absLat) * (1.0 - smoothstep(64.0, 76.0, absLat));
    vegCol = mix(vegCol, vec3(0.010, 0.032, 0.014), borealMask * 0.72);

    // Deep tropical rainforest canopy & fertile river plains
    float eqRain = clamp(biome.b * 0.95 + max(0.0, 1.0 - absLat / 13.0) * 0.34, 0.0, 1.0);
    vec3 rainCol = vec3(0.007, 0.038, 0.009) + vec3(0.006, 0.018, 0.005) * nDetail;
    vec3 landCol = mix(vegCol, rainCol, eqRain * 0.88);

    // Warm ochre, sandstone & iron-oxide deserts (physical reflectance ~0.22-0.38 linear)
    float duneMask = clamp(biome.g * (0.68 + nMacro * 0.46), 0.0, 1.0);
    vec3 sandCol = vec3(0.32, 0.175, 0.072) + (nDetail - 0.5) * vec3(0.11, 0.065, 0.035) + (nGrain - 0.5) * 0.04;
    sandCol = mix(sandCol, vec3(0.28, 0.105, 0.038), clamp((biome.g - 0.70) * 2.2, 0.0, 0.48));
    landCol = mix(landCol, sandCol, duneMask);

    // Rugged dark granite, slate & scree mountain ridges
    float rockMask = clamp((elev - 0.43) * 2.8, 0.0, 1.0);
    vec3 rockCol = vec3(0.088, 0.076, 0.064) + (nDetail - 0.5) * 0.045 + (nGrain - 0.5) * 0.032;
    landCol = mix(landCol, rockCol, rockMask * 0.90);

    // Subtle sandy shoreline fringe
    float shoreBeach = smoothstep(0.85, 0.28, landMask) * (1.0 - clamp(biome.b, 0.0, 0.6));
    landCol = mix(landCol, vec3(0.18, 0.145, 0.095), shoreBeach * 0.25);

    // Apply fine surface grain & deep topographic valley cavity AO
    landCol *= (0.84 + nDetail * 0.24 + (nGrain - 0.5) * 0.16) * cavity;

    // Deep marine ocean bathymetry (abyssal midnight indigo -> pelagic cobalt -> coral shelf turquoise)
    float shelfGlow = clamp(shelfSample.r * 1.48, 0.0, 1.0);
    float seaFloor = clamp(nMacro * 0.55 + nDetail * 0.30 + biome.a * 0.28, 0.0, 1.0);
    vec3 oceanCol = mix(vec3(0.0025, 0.009, 0.034), vec3(0.006, 0.025, 0.076), seaFloor);
    float tropicShelf = exp(-pow(absLat / 32.0, 2.0));
    vec3 shelfCol = mix(vec3(0.008, 0.088, 0.145), vec3(0.010, 0.155, 0.215), tropicShelf);
    oceanCol = mix(oceanCol, shelfCol, shelfGlow * 0.84);

    // Crisp anti-aliased 8K coastline blend
    vec3 finalCol = mix(oceanCol, landCol, smoothstep(0.22, 0.72, landMask));

    // Refined 8K national frontier hairlines
    float borderLine = clamp(vecMask.g, 0.0, 1.0);
    finalCol = mix(finalCol, vec3(0.30, 0.52, 0.72), borderLine * 0.28);

    gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
  }
`;

// Pass 3: Bake 8K Tangent-Space Normal Map via Dual-Scale Latitude-Corrected 3x3 Scharr Filter
const NORMAL_FRAG = /* glsl */ `
  uniform sampler2D uTerrainData;
  uniform vec2 uTexelSize;
  uniform float uStrength;
  varying vec2 vUv;

  const float PI = 3.141592653589793;

  float unpackH(vec2 rg) {
    float hi = floor(rg.r * 255.0 + 0.5);
    float lo = floor(rg.g * 255.0 + 0.5);
    return (hi * 256.0 + lo) / 65535.0;
  }

  float sampleElev(vec2 offset) {
    vec2 uv = vec2(fract(vUv.x + offset.x), clamp(vUv.y + offset.y, 0.0005, 0.9995));
    return unpackH(texture2D(uTerrainData, uv).rg);
  }

  vec2 scharrAtScale(float scale) {
    float dx = uTexelSize.x * scale;
    float dy = uTexelSize.y * scale;
    float hNW = sampleElev(vec2(-dx,  dy));
    float hN  = sampleElev(vec2( 0.0, dy));
    float hNE = sampleElev(vec2( dx,  dy));
    float hW  = sampleElev(vec2(-dx,  0.0));
    float hE  = sampleElev(vec2( dx,  0.0));
    float hSW = sampleElev(vec2(-dx, -dy));
    float hS  = sampleElev(vec2( 0.0,-dy));
    float hSE = sampleElev(vec2( dx, -dy));

    float gx = ((3.0 * hNW + 10.0 * hW + 3.0 * hSW) - (3.0 * hNE + 10.0 * hE + 3.0 * hSE)) / 16.0;
    float gy = ((3.0 * hSW + 10.0 * hS + 3.0 * hSE) - (3.0 * hNW + 10.0 * hN + 3.0 * hNE)) / 16.0;
    return vec2(gx, gy);
  }

  void main() {
    // Combine crisp 1-texel micro-ridges with 3-texel macro mountain slopes
    vec2 gFine = scharrAtScale(1.0);
    vec2 gMacro = scharrAtScale(3.0);
    vec2 g = gFine * 0.65 + gMacro * 0.55;

    float lat = (vUv.y - 0.5) * PI;
    float cosLat = max(0.22, cos(lat));

    float nx = (g.x * uStrength) / cosLat;
    float ny = g.y * uStrength;
    vec3 n = normalize(vec3(nx, ny, 1.0));

    gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
  }
`;

// Pass 4: Bake Linear Data Map (R = landMask, G = PBR Roughness, B = snowIceMask, A = elev/shelf)
const ROUGHNESS_DATA_FRAG = /* glsl */ `
  uniform sampler2D uTerrainData;
  uniform sampler2D uShelfTex;
  uniform sampler2D uBiomeLut;
  varying vec2 vUv;

  float unpackH(vec2 rg) {
    float hi = floor(rg.r * 255.0 + 0.5);
    float lo = floor(rg.g * 255.0 + 0.5);
    return (hi * 256.0 + lo) / 65535.0;
  }

  void main() {
    vec4 t = texture2D(uTerrainData, vUv);
    float elev = unpackH(t.rg);
    float snowIce = t.b;
    float landMask = smoothstep(0.22, 0.72, t.a);
    float shelf = texture2D(uShelfTex, vUv).r;
    float desert = texture2D(uBiomeLut, vUv).g;

    float landRough = mix(0.86, 0.96, desert);
    float oceanRough = mix(0.22, 0.34, clamp(shelf * 1.3, 0.0, 1.0));
    float rough = mix(oceanRough, landRough, landMask);
    rough = mix(rough, 0.48, snowIce * 0.65);

    float shelfOrElev = mix(clamp(shelf * 1.4, 0.0, 1.0), elev, landMask);
    gl_FragColor = vec4(landMask, rough, snowIce, shelfOrElev);
  }
`;

// Pass 5: GPU-Baked High-Detail Cyclonic Cloud Deck
const CLOUD_FRAG = /* glsl */ `
  uniform sampler2D uNoiseLut;
  varying vec2 vUv;

  const float PI = 3.141592653589793;

  float fastNoise3(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy;
    vec2 rg = texture2D(uNoiseLut, (uv + 0.5) / 256.0).yx;
    return mix(rg.x, rg.y, f.z);
  }

  float fbm4(vec3 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      s += a * fastNoise3(p);
      p = p * 2.08 + vec3(2.4, 6.1, 3.7);
      a *= 0.5;
    }
    return s * 1.0666;
  }

  void main() {
    float lat = (vUv.y - 0.5) * PI;
    float lng = (vUv.x - 0.5) * PI * 2.0;
    float absLatDeg = abs((vUv.y - 0.5) * 180.0);
    float cosLat = cos(lat);
    vec3 sp = vec3(cosLat * cos(lng), sin(lat), cosLat * sin(lng));

    float stormBelt =
      0.56 +
      0.34 * exp(-pow((absLatDeg - 46.0) / 17.0, 2.0)) +
      0.24 * exp(-pow(absLatDeg / 13.0, 2.0));

    float warpX = fbm4(sp * 3.4 + vec3(3.1, 1.2, 4.4)) - 0.5;
    float warpZ = fbm4(sp * 3.4 + vec3(7.4, 5.1, 2.2)) - 0.5;
    vec3 wp = vec3(sp.x * 5.2 + warpX * 2.6, sp.y * 6.0, sp.z * 5.2 + warpZ * 2.6);

    float cMain = fbm4(wp);
    float cWisp = fbm4(wp * 3.4 + vec3(9.1, 0.0, 3.3));
    float raw = cMain * 0.62 + cWisp * 0.38;

    float density = clamp((raw * stormBelt - 0.46) * 3.4, 0.0, 1.0);
    float alpha = clamp(pow(density, 1.45) * 0.74, 0.0, 0.76);
    float lum = 0.93 + density * 0.07;

    gl_FragColor = vec4(lum, min(1.0, lum + 0.012), 1.0, alpha);
  }
`;

export function generateEarthTextures(
  renderer: THREE.WebGLRenderer,
  highQuality: boolean
): EarthTextureBundle {
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const { width, height } = computeEarthTextureDimensions(
    renderer.capabilities.maxTextureSize,
    highQuality
  );

  // 1. Crisp 8K Vector Coastline + Frontier Mask (Canvas 2D native rasterization)
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const mCtx = maskCanvas.getContext('2d')!;
  mCtx.fillStyle = '#000000';
  mCtx.fillRect(0, 0, width, height);

  const features = getWorldFeatures();
  const traceFeature = (
    ctx: CanvasRenderingContext2D,
    polygons: number[][][][],
    w: number,
    h: number
  ) => {
    ctx.beginPath();
    for (const poly of polygons) {
      for (const rawRing of poly) {
        const subRings = splitRingAtAntimeridian(rawRing);
        for (const ring of subRings) {
          if (ring.length < 2) continue;
          for (let i = 0; i < ring.length; i++) {
            const x = ((ring[i][0] + 180) / 360) * w;
            const y = ((90 - ring[i][1]) / 180) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        }
      }
    }
  };

  // Fill land into Red channel
  mCtx.fillStyle = '#FF0000';
  for (const f of features) {
    traceFeature(mCtx, f.polygons, width, height);
    mCtx.fill();
  }

  // Stroke national borders into Green channel additively (preserves Red land mask intact)
  mCtx.save();
  mCtx.globalCompositeOperation = 'lighter';
  mCtx.strokeStyle = 'rgba(0, 255, 0, 0.72)';
  mCtx.lineWidth = Math.max(1.0, width / 5200);
  for (const f of features) {
    if (f.id === '010') continue;
    traceFeature(mCtx, f.polygons, width, height);
    mCtx.stroke();
  }
  mCtx.restore();

  const vectorMaskTex = new THREE.CanvasTexture(maskCanvas);
  vectorMaskTex.wrapS = THREE.RepeatWrapping;
  vectorMaskTex.wrapT = THREE.ClampToEdgeWrapping;
  vectorMaskTex.minFilter = THREE.LinearFilter;
  vectorMaskTex.magFilter = THREE.LinearFilter;
  vectorMaskTex.colorSpace = THREE.NoColorSpace;

  // 2. Fast Coastal Shelf & Continental Interior Distance Proxy (512x256 GPU-filtered)
  const shelfW = 512;
  const shelfH = 256;
  const blurTight = document.createElement('canvas');
  blurTight.width = shelfW;
  blurTight.height = shelfH;
  const btCtx = blurTight.getContext('2d')!;
  btCtx.filter = 'blur(4px)';
  btCtx.drawImage(maskCanvas, 0, 0, shelfW, shelfH);

  const blurWide = document.createElement('canvas');
  blurWide.width = shelfW;
  blurWide.height = shelfH;
  const bwCtx = blurWide.getContext('2d')!;
  bwCtx.filter = 'blur(13px)';
  bwCtx.drawImage(maskCanvas, 0, 0, shelfW, shelfH);

  // Merge R (tight shelf from blurTight.R) and G (wide interior from blurWide.R)
  const tightImg = btCtx.getImageData(0, 0, shelfW, shelfH).data;
  const wideImg = bwCtx.getImageData(0, 0, shelfW, shelfH).data;
  const shelfData = new Uint8Array(shelfW * shelfH * 4);
  for (let i = 0; i < shelfW * shelfH; i++) {
    const p4 = i * 4;
    shelfData[p4] = tightImg[p4];
    shelfData[p4 + 1] = wideImg[p4];
    shelfData[p4 + 2] = 0;
    shelfData[p4 + 3] = 255;
  }
  const shelfTex = new THREE.DataTexture(shelfData, shelfW, shelfH, THREE.RGBAFormat);
  shelfTex.flipY = true;
  shelfTex.wrapS = THREE.RepeatWrapping;
  shelfTex.wrapT = THREE.ClampToEdgeWrapping;
  shelfTex.minFilter = THREE.LinearFilter;
  shelfTex.magFilter = THREE.LinearFilter;
  shelfTex.colorSpace = THREE.NoColorSpace;
  shelfTex.needsUpdate = true;

  const biomeLutTex = createBiomeLutTexture();
  const noiseLutTex = createNoiseLutTexture();

  // 3. GPU Render-to-Texture 8K Synthesis
  const bakeScene = new THREE.Scene();
  const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quadMesh = new THREE.Mesh(quadGeo);
  bakeScene.add(quadMesh);

  const prevTarget = renderer.getRenderTarget();
  const prevAutoClear = renderer.autoClear;
  renderer.autoClear = true;

  const runPass = (mat: THREE.ShaderMaterial, rt: THREE.WebGLRenderTarget) => {
    quadMesh.material = mat;
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(bakeScene, bakeCam);
  };

  // Pass 1: 8K 16-bit elevation heightfield (NearestFilter prevents 16-bit boundary interpolation spikes)
  const terrainDataRT = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  terrainDataRT.texture.colorSpace = THREE.NoColorSpace;

  const terrainMat = new THREE.ShaderMaterial({
    uniforms: {
      uVectorMask: { value: vectorMaskTex },
      uShelfTex: { value: shelfTex },
      uBiomeLut: { value: biomeLutTex },
      uNoiseLut: { value: noiseLutTex },
    },
    vertexShader: BAKE_VERTEX_SHADER,
    fragmentShader: TERRAIN_DATA_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  runPass(terrainMat, terrainDataRT);

  // Pass 2: 8K Diffuse Satellite Albedo (with mipmaps + max anisotropy)
  const albedoRT = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: true,
    anisotropy: maxAnisotropy,
  });
  albedoRT.texture.colorSpace = THREE.SRGBColorSpace;

  const albedoMat = new THREE.ShaderMaterial({
    uniforms: {
      uTerrainData: { value: terrainDataRT.texture },
      uVectorMask: { value: vectorMaskTex },
      uShelfTex: { value: shelfTex },
      uBiomeLut: { value: biomeLutTex },
      uNoiseLut: { value: noiseLutTex },
      uTexelSize: { value: new THREE.Vector2(1 / width, 1 / height) },
    },
    vertexShader: BAKE_VERTEX_SHADER,
    fragmentShader: ALBEDO_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  runPass(albedoMat, albedoRT);

  // Pass 3: 8K Tangent-Space Normal Map (latitude-compensated 3x3 Scharr gradient)
  const normalRT = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: true,
    anisotropy: maxAnisotropy,
  });
  normalRT.texture.colorSpace = THREE.NoColorSpace;

  const normalMat = new THREE.ShaderMaterial({
    uniforms: {
      uTerrainData: { value: terrainDataRT.texture },
      uTexelSize: { value: new THREE.Vector2(1 / width, 1 / height) },
      uStrength: { value: width >= 8192 ? 42.0 : 24.0 },
    },
    vertexShader: BAKE_VERTEX_SHADER,
    fragmentShader: NORMAL_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  runPass(normalMat, normalRT);

  // Pass 4: Linear Data Map (4096x2048: R=landMask, G=roughness, B=snowIceMask, A=elev/shelf)
  const roughW = Math.min(4096, width);
  const roughH = Math.floor(roughW / 2);
  const roughnessRT = new THREE.WebGLRenderTarget(roughW, roughH, {
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: true,
    anisotropy: maxAnisotropy,
  });
  roughnessRT.texture.colorSpace = THREE.NoColorSpace;

  const roughMat = new THREE.ShaderMaterial({
    uniforms: {
      uTerrainData: { value: terrainDataRT.texture },
      uShelfTex: { value: shelfTex },
      uBiomeLut: { value: biomeLutTex },
    },
    vertexShader: BAKE_VERTEX_SHADER,
    fragmentShader: ROUGHNESS_DATA_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  runPass(roughMat, roughnessRT);

  // Pass 5: GPU-Baked Swirling Cloud Deck (2048x1024 / 1536x768)
  const cloudW = highQuality ? 2048 : 1536;
  const cloudH = Math.floor(cloudW / 2);
  const cloudRT = new THREE.WebGLRenderTarget(cloudW, cloudH, {
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: true,
    anisotropy: maxAnisotropy,
  });
  cloudRT.texture.colorSpace = THREE.SRGBColorSpace;

  const cloudMat = new THREE.ShaderMaterial({
    uniforms: {
      uNoiseLut: { value: noiseLutTex },
    },
    vertexShader: BAKE_VERTEX_SHADER,
    fragmentShader: CLOUD_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  runPass(cloudMat, cloudRT);

  // Restore renderer state & immediately free temporary GPU baking resources
  renderer.setRenderTarget(prevTarget);
  renderer.autoClear = prevAutoClear;

  terrainDataRT.dispose();
  terrainMat.dispose();
  albedoMat.dispose();
  normalMat.dispose();
  roughMat.dispose();
  cloudMat.dispose();
  quadGeo.dispose();
  vectorMaskTex.dispose();
  shelfTex.dispose();
  biomeLutTex.dispose();
  noiseLutTex.dispose();

  // 4. Crisp Golden Night-Side City Lights (masked strictly to land in Earth shader)
  const nightW = highQuality ? 4096 : 2048;
  const nightH = Math.floor(nightW / 2);
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = nightW;
  nightCanvas.height = nightH;
  const nlCtx = nightCanvas.getContext('2d')!;
  nlCtx.fillStyle = '#000000';
  nlCtx.fillRect(0, 0, nightW, nightH);

  let citySeed = 4817;
  const cityRand = () => {
    citySeed = (citySeed * 16807) % 2147483647;
    return (citySeed - 1) / 2147483646;
  };

  const drawCityCluster = (
    lat: number,
    lng: number,
    radiusPx: number,
    intensity: number,
    satellites = 4
  ) => {
    const cx = ((lng + 180) / 360) * nightW;
    const cy = ((90 - lat) / 180) * nightH;
    const scale = nightW / 1024;
    const r = radiusPx * scale;

    const grad = nlCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(255, 240, 195, ${Math.min(1, intensity)})`);
    grad.addColorStop(0.24, `rgba(255, 195, 88, ${Math.min(0.85, intensity * 0.65)})`);
    grad.addColorStop(1, 'rgba(255, 130, 20, 0)');
    nlCtx.fillStyle = grad;
    nlCtx.beginPath();
    nlCtx.arc(cx, cy, r, 0, Math.PI * 2);
    nlCtx.fill();

    for (let s = 0; s < satellites; s++) {
      const ang = cityRand() * Math.PI * 2;
      const dist = (0.18 + cityRand() * 0.72) * r;
      const sx = cx + Math.cos(ang) * dist;
      const sy = cy + Math.sin(ang) * dist * 0.75;
      const sr = (0.9 + cityRand() * 1.1) * scale;
      nlCtx.fillStyle = `rgba(255, 218, 132, ${0.42 + cityRand() * 0.48})`;
      nlCtx.beginPath();
      nlCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      nlCtx.fill();
    }
  };

  const megaBelts: [number, number, number, number][] = [
    [40.7, -74.0, 14, 1.0], [41.8, -87.6, 11, 0.9], [34.0, -118.2, 12, 0.95],
    [37.7, -122.4, 9, 0.85], [29.7, -95.3, 10, 0.82], [25.7, -80.2, 8, 0.78],
    [43.6, -79.3, 9, 0.85], [19.4, -99.1, 12, 0.92], [-23.5, -46.6, 12, 0.94],
    [-22.9, -43.2, 9, 0.85], [-34.6, -58.3, 10, 0.85], [4.7, -74.0, 8, 0.76],
    [-12.0, -77.0, 8, 0.74], [51.5, -0.1, 13, 1.0], [48.8, 2.3, 12, 0.96],
    [50.8, 4.3, 10, 0.9], [52.5, 13.4, 11, 0.92], [45.4, 9.2, 11, 0.9],
    [40.4, -3.7, 9, 0.85], [41.9, 12.5, 9, 0.82], [55.7, 37.6, 13, 0.94],
    [41.0, 28.9, 10, 0.88], [30.0, 31.2, 11, 0.96], [26.5, 31.7, 8, 0.72],
    [6.5, 3.3, 9, 0.82], [-26.2, 28.0, 9, 0.82], [25.2, 55.3, 10, 0.9],
    [24.7, 46.7, 9, 0.84], [28.6, 77.2, 14, 0.98], [19.0, 72.8, 12, 0.94],
    [13.0, 77.6, 10, 0.86], [22.5, 88.3, 11, 0.88], [31.2, 121.4, 16, 1.0],
    [39.9, 116.4, 15, 0.98], [22.3, 114.1, 13, 0.96], [30.6, 104.0, 10, 0.84],
    [37.5, 127.0, 12, 0.96], [35.6, 139.7, 15, 1.0], [34.7, 135.5, 11, 0.92],
    [13.7, 100.5, 10, 0.88], [1.3, 103.8, 9, 0.92], [-6.2, 106.8, 11, 0.9],
    [-33.8, 151.2, 9, 0.84], [-37.8, 144.9, 8, 0.8],
  ];

  nlCtx.save();
  nlCtx.globalCompositeOperation = 'lighter';
  for (const [lat, lng, rad, inten] of megaBelts) {
    drawCityCluster(lat, lng, rad, inten, 8);
  }
  for (const c of SOVEREIGN_COUNTRIES) {
    drawCityCluster(c.lat, c.lng, 4.5, 0.55, 2);
  }
  for (const h of GLOBE_HOTSPOTS) {
    drawCityCluster(h.lat, h.lng, 5.5, 0.68, 3);
  }
  nlCtx.restore();

  const nightLights = new THREE.CanvasTexture(nightCanvas);
  nightLights.colorSpace = THREE.SRGBColorSpace;
  nightLights.wrapS = THREE.RepeatWrapping;
  nightLights.wrapT = THREE.ClampToEdgeWrapping;
  nightLights.anisotropy = maxAnisotropy;

  // 5. Crisp Astronomical Star Sprite
  const starCanvas = document.createElement('canvas');
  starCanvas.width = 64;
  starCanvas.height = 64;
  const stCtx = starCanvas.getContext('2d')!;
  const stGrad = stCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  stGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  stGrad.addColorStop(0.16, 'rgba(255, 255, 255, 0.92)');
  stGrad.addColorStop(0.4, 'rgba(186, 226, 255, 0.25)');
  stGrad.addColorStop(0.75, 'rgba(186, 226, 255, 0)');
  stCtx.fillStyle = stGrad;
  stCtx.fillRect(0, 0, 64, 64);

  const starSprite = new THREE.CanvasTexture(starCanvas);
  starSprite.colorSpace = THREE.SRGBColorSpace;

  return {
    width,
    height,
    albedo: albedoRT.texture,
    normal: normalRT.texture,
    roughness: roughnessRT.texture,
    nightLights,
    clouds: cloudRT.texture,
    starSprite,
    dispose: () => {
      albedoRT.dispose();
      normalRT.dispose();
      roughnessRT.dispose();
      cloudRT.dispose();
      nightLights.dispose();
      starSprite.dispose();
    },
  };
}

export function createFlagSatelliteTexture(
  code: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;

  const url = getFlagUrl(code);
  if (url) {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      tex.needsUpdate = true;
    };
    img.src = url;
  }
  return tex;
}
