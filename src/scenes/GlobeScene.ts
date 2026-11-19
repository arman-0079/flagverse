import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SOVEREIGN_COUNTRIES } from '../data/countries';
import { GLOBE_HOTSPOTS } from '../data/hotspots';
import type { Country, GlobeHotspot } from '../types/game';
import { createFlagSatelliteTexture, generateEarthTextures, type EarthTextureBundle } from './earthTextures';

export type GlobeViewMode = 'intro' | 'hub' | 'explore' | 'paused-bg';

export interface GlobeControllerCallbacks {
  onSelectCountry?: (country: Country) => void;
  onHoverCountry?: (country: Country | null, screenPos?: { x: number; y: number }) => void;
  onSelectHotspot?: (hotspot: GlobeHotspot | null) => void;
  onHoverHotspot?: (hotspot: GlobeHotspot | null, screenPos?: { x: number; y: number }) => void;
}

export interface GlobeVisualOptions {
  showClouds: boolean;
  showSnow: boolean;
  showArcs: boolean;
  showNightLights: boolean;
  autoSpin: boolean;
}

const GLOBE_RADIUS = 2.05;

// Pre-allocated reusable scratch objects (zero GC in animation loop)
const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();
const _hotspotWorldPos = new THREE.Vector3();
const _globeCenterWorldPos = new THREE.Vector3();
const _hotspotNormal = new THREE.Vector3();
const _camToHotspot = new THREE.Vector3();
const _projVec = new THREE.Vector3();

export function latLngToVector3(lat: number, lng: number, radius: number, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return out.set(x, y, z);
}

export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class GlobeSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean;
  private callbacks: GlobeControllerCallbacks;

  private earthGroup: THREE.Group;
  private globeSpinGroup: THREE.Group;
  private earthMesh: THREE.Mesh;
  private earthMat: THREE.MeshStandardMaterial;
  private cloudMesh: THREE.Mesh;
  private cloudMat: THREE.MeshStandardMaterial;
  private atmoInnerMat: THREE.ShaderMaterial;
  private atmoOuterMat: THREE.ShaderMaterial;
  private arcGroup: THREE.Group;
  private arcMaterials: THREE.ShaderMaterial[] = [];
  private ringGroup: THREE.Group;
  private markerMesh: THREE.InstancedMesh;
  private selectedBeacon: THREE.Group;
  private hotspotGroup: THREE.Group;
  private hotspotHitMeshes: THREE.Mesh[] = [];
  private hotspotEntries: {
    hotspot: GlobeHotspot;
    group: THREE.Group;
    beaconMesh: THREE.Mesh;
    beaconMat: THREE.MeshStandardMaterial;
    ringMat: THREE.MeshStandardMaterial;
    hitMesh: THREE.Mesh;
    baseEmissive: number;
  }[] = [];
  private starPoints: THREE.Points;
  private microStarPoints: THREE.Points;
  private leoSatellites: {
    mesh: THREE.Group;
    radius: number;
    speed: number;
    phase: number;
    inclination: number;
    ascNode: number;
  }[] = [];

  private orbitalFlags: {
    group: THREE.Group;
    radius: number;
    speed: number;
    phase: number;
    tiltX: number;
    tiltZ: number;
    textures: THREE.Texture[];
  }[] = [];

  private textures: EarthTextureBundle;
  private envRT: THREE.WebGLRenderTarget;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private sunDir = new THREE.Vector3(0.68, 0.36, 0.64).normalize();
  private visualOptions: GlobeVisualOptions = {
    showClouds: true,
    showSnow: true,
    showArcs: true,
    showNightLights: true,
    autoSpin: false,
  };

  private mode: GlobeViewMode = 'intro';
  private reducedMotion = false;
  private discoveredSet = new Set<string>();
  private selectedCountryCode: string | null = null;
  private selectedHotspotId: string | null = null;
  private hoveredIndex = -1;
  private hoveredHotspotIndex = -1;

  private introElapsed = 0;
  private totalTime = 0;
  private pointerNormX = 0;
  private pointerNormY = 0;
  private lastRaycastMs = 0;

  private flyToActive = false;
  private flyTargetCamPos = new THREE.Vector3();

  private frameId = 0;
  private isDisposed = false;
  private lastClockMs = performance.now();

  constructor(
    container: HTMLElement,
    callbacks: GlobeControllerCallbacks,
    options: { highQuality: boolean; reducedMotion: boolean; initialMode: GlobeViewMode }
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.mode = options.initialMode;
    this.reducedMotion = options.reducedMotion;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(320, container.clientWidth || window.innerWidth);
    const height = Math.max(240, container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: this.isSoftwareGl,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#060B16');
    this.scene.fog = new THREE.FogExp2('#060B16', 0.022);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(0.6, 1.1, 8.2);

    // Mandatory studio environment reflections via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    // Warm Solar Key + Deep Space Fill Lighting Rig (dark night hemisphere so city lights pop)
    const hemi = new THREE.HemisphereLight('#60A5FA', '#020617', 0.08);
    this.scene.add(hemi);

    this.keyLight = new THREE.DirectionalLight('#FFF5E0', 3.15);
    this.keyLight.position.copy(this.sunDir).multiplyScalar(10);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight('#1D4ED8', 0.12);
    this.rimLight.position.set(-6.5, -1.8, -6.0);
    this.scene.add(this.rimLight);

    // Controls (active in explore mode)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 3.1;
    this.controls.maxDistance = 8.4;
    this.controls.rotateSpeed = 0.65;
    this.controls.enabled = this.mode === 'explore';
    this.controls.addEventListener('start', () => {
      this.flyToActive = false;
    });

    // Build Earth Assembly
    this.earthGroup = new THREE.Group();
    this.globeSpinGroup = new THREE.Group();
    this.earthGroup.add(this.globeSpinGroup);
    this.scene.add(this.earthGroup);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = generateEarthTextures(this.renderer, options.highQuality);
    this.renderer.domElement.dataset.textureResolution = `${this.textures.width}x${this.textures.height}`;

    // Build Astronomical Starfield (after textures so starSprite is ready)
    this.starPoints = this.buildStarfield(1600, 0.11, 0.94, 9182);
    this.scene.add(this.starPoints);
    this.microStarPoints = this.buildStarfield(900, 0.055, 0.55, 4421);
    this.scene.add(this.microStarPoints);

    // 1. Primary Earth Sphere (8K Satellite Diffuse + 8K Normal Relief + Realistic Ocean Water Shader)
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 96);
    this.earthMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.albedo,
      normalMap: this.textures.normal,
      normalScale: new THREE.Vector2(2.35, 2.35),
      roughnessMap: this.textures.roughness,
      roughness: 1.0,
      metalness: 0.0,
      envMapIntensity: 0.02,
    });
    this.earthMat.userData.uTime = { value: 0 };
    this.earthMat.userData.uSunDir = { value: this.sunDir.clone() };
    this.earthMat.userData.uCloudOffset = { value: 0 };
    this.earthMat.userData.uNightEnabled = { value: 1 };
    this.earthMat.userData.uShowSnow = { value: 1 };
    this.earthMat.userData.uNightMap = { value: this.textures.nightLights };
    this.earthMat.userData.uCloudMap = { value: this.textures.clouds };
    this.earthMat.userData.uEarthDataMap = { value: this.textures.roughness };
    this.earthMat.userData.uEarthWorldMat3 = { value: new THREE.Matrix3() };

    this.earthMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.earthMat.userData.uTime;
      shader.uniforms.uSunDir = this.earthMat.userData.uSunDir;
      shader.uniforms.uCloudOffset = this.earthMat.userData.uCloudOffset;
      shader.uniforms.uNightEnabled = this.earthMat.userData.uNightEnabled;
      shader.uniforms.uShowSnow = this.earthMat.userData.uShowSnow;
      shader.uniforms.uNightMap = this.earthMat.userData.uNightMap;
      shader.uniforms.uCloudMap = this.earthMat.userData.uCloudMap;
      shader.uniforms.uEarthDataMap = this.earthMat.userData.uEarthDataMap;
      shader.uniforms.uEarthWorldMat3 = this.earthMat.userData.uEarthWorldMat3;

      shader.vertexShader =
        `
        varying vec3 vEarthWorldNormal;
        varying vec3 vEarthWorldPos;
        varying vec3 vEarthLocalDir;
        varying vec2 vEarthUv;
        ` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vEarthWorldNormal = normalize(mat3(modelMatrix) * normal);
          vEarthWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vEarthLocalDir = normalize(position);
          vEarthUv = uv;
          `
        );

      let frag =
        `
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform float uCloudOffset;
        uniform float uNightEnabled;
        uniform float uShowSnow;
        uniform sampler2D uNightMap;
        uniform sampler2D uCloudMap;
        uniform sampler2D uEarthDataMap;
        uniform mat3 uEarthWorldMat3;
        varying vec3 vEarthWorldNormal;
        varying vec3 vEarthWorldPos;
        varying vec3 vEarthLocalDir;
        varying vec2 vEarthUv;

        // Analytical 3D spherical micro-capillary water ripples (fine orbital glint, zero macro stripes)
        vec3 oceanWaveGrad3D(vec3 p, float t) {
          float w1 = sin(p.x * 380.0 + p.z * 290.0 + t * 1.45);
          float w2 = sin(p.z * 620.0 - p.y * 480.0 - t * 1.95);
          float w3 = sin(p.y * 980.0 + p.x * 740.0 + t * 2.55);
          float w4 = sin((p.x - p.z) * 1420.0 + p.y * 1160.0 - t * 3.20);

          vec3 g = vec3(
            cos(p.x * 380.0 + p.z * 290.0 + t * 1.45) * 0.30 + cos(p.y * 980.0 + p.x * 740.0 + t * 2.55) * 0.25 + cos((p.x - p.z) * 1420.0 + p.y * 1160.0 - t * 3.20) * 0.25,
            -cos(p.z * 620.0 - p.y * 480.0 - t * 1.95) * 0.28 + cos(p.y * 980.0 + p.x * 740.0 + t * 2.55) * 0.26 + cos((p.x - p.z) * 1420.0 + p.y * 1160.0 - t * 3.20) * 0.22,
            cos(p.x * 380.0 + p.z * 290.0 + t * 1.45) * 0.26 + cos(p.z * 620.0 - p.y * 480.0 - t * 1.95) * 0.30 - cos((p.x - p.z) * 1420.0 + p.y * 1160.0 - t * 3.20) * 0.24
          );
          float chop = 0.65 + 0.35 * (w1 * w2 + w3 * w4 * 0.5);
          return g * chop;
        }
        ` + shader.fragmentShader;

      // 1. Dynamic Snow & Ice overlay in linear space before lighting
      frag = frag.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        vec4 earthData = texture2D(uEarthDataMap, vEarthUv);
        float landMask = earthData.r;
        float snowIceMask = earthData.b;
        float elevShelf = earthData.a;
        float activeSnow = snowIceMask * step(0.5, uShowSnow);
        if (activeSnow > 0.01) {
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.68, 0.75, 0.84), activeSnow);
        }
        `
      );

      // 2. Dynamic ocean wave roughness (matte continents, cohesive wind-swept ocean water)
      frag = frag.replace(
        '#include <roughnessmap_fragment>',
        `
        #include <roughnessmap_fragment>
        float liquidOceanR = (1.0 - smoothstep(0.15, 0.65, landMask)) * (1.0 - activeSnow * 0.85);
        float swellPatch = 0.5 + 0.5 * sin(vEarthLocalDir.x * 42.0 + vEarthLocalDir.z * 37.0 + uTime * 0.45) * cos(vEarthLocalDir.y * 34.0 - uTime * 0.3);
        float oceanDynRough = mix(0.20, 0.36, swellPatch);
        roughnessFactor = mix(roughnessFactor, oceanDynRough, liquidOceanR * 0.72);
        `
      );

      // 3. Inject animated capillary wave normals into Three.js PBR normal pipeline (ocean only)
      frag = frag.replace(
        '#include <normal_fragment_maps>',
        `
        #include <normal_fragment_maps>
        vec3 localDirN = normalize(vEarthLocalDir);
        float liquidOcean = (1.0 - smoothstep(0.15, 0.65, landMask)) * (1.0 - activeSnow * 0.85);
        vec3 rawWaveGrad = oceanWaveGrad3D(localDirN, uTime);
        vec3 tangentWaveGrad = rawWaveGrad - localDirN * dot(rawWaveGrad, localDirN);
        vec3 worldWaveDelta = uEarthWorldMat3 * tangentWaveGrad;
        if (liquidOcean > 0.01) {
          vec3 viewWaveDelta = mat3(viewMatrix) * worldWaveDelta;
          normal = normalize(normal + viewWaveDelta * liquidOcean * 0.042);
        }
        `
      );

      // 4. Physical Ocean Fresnel Sky Reflection + Cox-Munk Solar Sunglint + Coastal SSS + City Lights (Linear HDR before ToneMapping)
      frag = frag.replace(
        '#include <tonemapping_fragment>',
        `
        vec3 L_sun = normalize(uSunDir);
        vec3 V_cam = normalize(cameraPosition - vEarthWorldPos);
        vec3 N_geom = normalize(vEarthWorldNormal);
        vec3 N_ocean = normalize(N_geom + worldWaveDelta * liquidOcean * 0.055);

        float sunDot = dot(N_geom, L_sun);
        float sunDay = smoothstep(-0.08, 0.24, sunDot);
        float sunHorizon = smoothstep(-0.18, 0.45, sunDot);

        vec2 cloudUv = vec2(fract(vEarthUv.x - uCloudOffset), vEarthUv.y);
        float cloudAlpha = texture2D(uCloudMap, cloudUv).a;

        // Subtle drifting cloud shadow over sunlit oceans & continents
        gl_FragColor.rgb *= mix(1.0, 0.78, cloudAlpha * sunDay);

        // Physically-based Schlick Fresnel ocean reflection (F0 = 0.02 for water IOR 1.333)
        float NdotV = clamp(dot(N_ocean, V_cam), 0.0, 1.0);
        float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 4.6);
        vec3 daySkyCol = mix(vec3(0.02, 0.09, 0.24), vec3(0.18, 0.48, 0.86), sunHorizon);
        vec3 twilightSkyCol = mix(daySkyCol, vec3(0.16, 0.09, 0.18), exp(-pow(sunDot * 9.0, 2.0)) * 0.50);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, twilightSkyCol, fresnel * liquidOcean * 0.44);

        // Cox-Munk solar sunglint sparkle on animated ocean micro-waves
        vec3 H_sun = normalize(L_sun + V_cam);
        float NdotH = max(0.0, dot(N_ocean, H_sun));
        float glintCore = pow(NdotH, 110.0) * 0.58;
        float glintHalo = pow(NdotH, 24.0) * 0.085;
        float cloudAtten = 1.0 - cloudAlpha * 0.85;
        gl_FragColor.rgb += vec3(1.0, 0.94, 0.82) * (glintCore + glintHalo) * liquidOcean * sunDay * cloudAtten;

        // Shallow turquoise coastal shelf subsurface scattering
        float shallowMask = smoothstep(0.18, 0.82, elevShelf) * liquidOcean * sunDay;
        gl_FragColor.rgb += vec3(0.012, 0.13, 0.18) * shallowMask * 0.30;

        // Subtle orbital Rayleigh aerial-perspective haze on distant grazing continents
        float limbHaze = pow(1.0 - NdotV, 3.8);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.14, 0.36, 0.72), limbHaze * landMask * sunHorizon * 0.22);

        // Restrained warm sunset scatter along narrow terminator edge
        float twilight = exp(-pow(sunDot * 16.0, 2.0));
        gl_FragColor.rgb += vec3(0.08, 0.03, 0.006) * twilight * (1.0 - cloudAlpha * 0.5);

        // Deepen night hemisphere cleanly so golden city lights glow crisply
        float nightWeight = smoothstep(0.05, -0.18, sunDot);
        gl_FragColor.rgb *= mix(1.0, 0.28, nightWeight);

        if (uNightEnabled > 0.5) {
          vec3 cityLights = texture2D(uNightMap, vEarthUv).rgb;
          float strictLand = smoothstep(0.32, 0.72, landMask);
          gl_FragColor.rgb += cityLights * strictLand * nightWeight * 2.6;
        }
        #include <tonemapping_fragment>
        `
      );

      shader.fragmentShader = frag;
    };
    this.earthMesh = new THREE.Mesh(earthGeo, this.earthMat);
    this.globeSpinGroup.add(this.earthMesh);

    // 2. Dynamic Cyclonic Cloud Deck (translucent wisps with terminator shading)
    const cloudGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.016, 60, 44);
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.clouds,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      roughness: 0.96,
      metalness: 0.0,
      envMapIntensity: 0.06,
    });
    this.cloudMat.userData.uSunDir = { value: this.sunDir.clone() };
    this.cloudMat.onBeforeCompile = (shader) => {
      shader.uniforms.uSunDir = this.cloudMat.userData.uSunDir;
      shader.vertexShader =
        `
        varying vec3 vCloudWorldNormal;
        ` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vCloudWorldNormal = normalize(mat3(modelMatrix) * normal);
          `
        );
      shader.fragmentShader =
        `
        uniform vec3 uSunDir;
        varying vec3 vCloudWorldNormal;
        ` +
        shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          float cSun = dot(normalize(vCloudWorldNormal), normalize(uSunDir));
          float cDay = smoothstep(-0.14, 0.28, cSun);
          float cSunset = exp(-pow(cSun * 14.0, 2.0));
          gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.04, gl_FragColor.rgb, cDay);
          gl_FragColor.rgb += vec3(0.14, 0.05, 0.015) * cSunset * gl_FragColor.a;
          #include <dithering_fragment>
          `
        );
    };
    this.cloudMesh = new THREE.Mesh(cloudGeo, this.cloudMat);
    this.globeSpinGroup.add(this.cloudMesh);

    // 3a. Inner Rayleigh Atmospheric Limb Haze (Crisp Azure Horizon Glow)
    const atmoInnerGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.007, 56, 40);
    this.atmoInnerMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: this.sunDir.clone() },
        uDayColor: { value: new THREE.Color('#38BDF8') },
        uHorizonColor: { value: new THREE.Color('#60A5FA') },
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uDayColor;
        uniform vec3 uHorizonColor;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 N = normalize(vWorldNormal);
          vec3 V = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(0.0, dot(N, V)), 4.8);
          float sunDot = dot(N, normalize(uSunDir));
          float dayScatter = smoothstep(-0.14, 0.56, sunDot);
          vec3 scatterCol = mix(uHorizonColor, uDayColor, dayScatter);
          gl_FragColor = vec4(scatterCol, clamp(fresnel * (0.03 + dayScatter * 0.56), 0.0, 0.50));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const atmoInnerMesh = new THREE.Mesh(atmoInnerGeo, this.atmoInnerMat);
    this.earthGroup.add(atmoInnerMesh);

    // 3b. Outer Atmospheric Space Corona (Tight BackSide Rayleigh Rim)
    const atmoOuterGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.058, 56, 40);
    this.atmoOuterMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: this.sunDir.clone() },
        glowColor: { value: new THREE.Color('#38BDF8') },
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vNormalView;
        varying vec3 vViewPos;
        void main() {
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vNormalView = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 glowColor;
        varying vec3 vWorldNormal;
        varying vec3 vNormalView;
        varying vec3 vViewPos;
        void main() {
          vec3 viewDir = normalize(vViewPos);
          float rim = pow(clamp(0.68 - dot(vNormalView, -viewDir), 0.0, 1.0), 3.4);
          float sunLit = smoothstep(-0.24, 0.72, dot(normalize(vWorldNormal), normalize(uSunDir)));
          gl_FragColor = vec4(glowColor, clamp(rim * (0.12 + sunLit * 0.62), 0.0, 0.58));
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const atmoOuterMesh = new THREE.Mesh(atmoOuterGeo, this.atmoOuterMat);
    this.earthGroup.add(atmoOuterMesh);

    // 4. Composite Gimbal & Orbital Rings (brass + cyan precision atlas rings)
    this.ringGroup = this.buildOrbitalRings();
    this.earthGroup.add(this.ringGroup);

    // 5. Orbital Flag Satellites (6 composite miniature flag frames)
    this.buildOrbitalFlags(maxAniso);

    // 6. Animated Great-Circle Data & Flight Visualization Arcs
    this.arcGroup = this.buildVisualizationArcs();
    this.globeSpinGroup.add(this.arcGroup);

    // 7. Instanced Country Markers (195 countries)
    this.markerMesh = this.buildCountryMarkers();
    this.globeSpinGroup.add(this.markerMesh);

    // 8. Composite Selected Country Beacon (3-part pin: base ring, stem, glowing crystal)
    this.selectedBeacon = this.buildSelectedBeacon();
    this.selectedBeacon.visible = false;
    this.globeSpinGroup.add(this.selectedBeacon);

    // 9. Clickable Landmark & Capital Hotspot Markers (composite 3-part pins + invisible raycast proxy)
    this.hotspotGroup = this.buildHotspotMarkers();
    this.globeSpinGroup.add(this.hotspotGroup);

    // Bind events
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.applyImmediateFraming();
    this.startLoop();
  }

  private buildStarfield(
    count: number,
    size: number,
    opacity: number,
    initialSeed: number
  ): THREE.Points {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    let seed = initialSeed;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < count; i++) {
      const r = 18 + rand() * 34;
      const theta = rand() * Math.PI * 2;
      const inBand = i < count * 0.35;
      const rawPhi = inBand
        ? Math.PI * 0.5 + (rand() - 0.5) * 0.42
        : Math.acos(2 * rand() - 1);
      const x = r * Math.sin(rawPhi) * Math.cos(theta);
      const y0 = r * Math.cos(rawPhi);
      const z0 = r * Math.sin(rawPhi) * Math.sin(theta);
      const tilt = 0.49;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
      positions[i * 3 + 2] = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);

      const brightness = inBand ? 0.55 + rand() * 0.45 : 0.45 + rand() * 0.55;
      const tint = rand();
      if (tint < 0.22) {
        colors[i * 3] = 1.0 * brightness;
        colors[i * 3 + 1] = 0.86 * brightness;
        colors[i * 3 + 2] = 0.62 * brightness;
      } else if (tint < 0.58) {
        colors[i * 3] = 0.66 * brightness;
        colors[i * 3 + 1] = 0.86 * brightness;
        colors[i * 3 + 2] = 1.0 * brightness;
      } else {
        colors[i * 3] = 0.96 * brightness;
        colors[i * 3 + 1] = 0.97 * brightness;
        colors[i * 3 + 2] = 1.0 * brightness;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size,
      map: this.textures.starSprite,
      vertexColors: true,
      transparent: true,
      opacity,
      alphaTest: 0.01,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }

  private buildVisualizationArcs(): THREE.Group {
    const group = new THREE.Group();
    const routes: [number, number, number, number, string][] = [
      [40.71, -74.01, 51.51, -0.13, '#38BDF8'], // New York -> London
      [51.51, -0.13, 30.04, 31.24, '#FBBF24'], // London -> Cairo
      [48.86, 2.35, 35.68, 139.69, '#38BDF8'], // Paris -> Tokyo
      [30.04, 31.24, -1.29, 36.82, '#FBBF24'], // Cairo -> Nairobi
      [35.68, 139.69, -33.87, 151.21, '#38BDF8'], // Tokyo -> Sydney
      [40.71, -74.01, -22.91, -43.17, '#FBBF24'], // New York -> Rio
      [19.43, -99.13, 40.42, -3.7, '#38BDF8'], // Mexico City -> Madrid
      [19.08, 72.88, 1.35, 103.82, '#FBBF24'], // Mumbai -> Singapore
      [-12.05, -77.04, -23.55, -46.63, '#38BDF8'], // Lima -> Sao Paulo
      [39.9, 116.41, 51.51, -0.13, '#FBBF24'], // Beijing -> London
      [-33.92, 18.42, -1.29, 36.82, '#38BDF8'], // Cape Town -> Nairobi
      [-33.87, 151.21, 1.35, 103.82, '#FBBF24'], // Sydney -> Singapore
    ];

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const hubRingGeo = new THREE.RingGeometry(0.018, 0.032, 20);
    const hubMatCyan = new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const hubMatGold = new THREE.MeshBasicMaterial({
      color: '#FBBF24',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    routes.forEach(([lat1, lng1, lat2, lng2, hex], idx) => {
      latLngToVector3(lat1, lng1, GLOBE_RADIUS + 0.012, vA);
      latLngToVector3(lat2, lng2, GLOBE_RADIUS + 0.012, vB);
      const chordDist = vA.distanceTo(vB);
      const apexHeight = GLOBE_RADIUS + 0.14 + chordDist * 0.16;

      const pts: THREE.Vector3[] = [];
      const steps = 28;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        mid.copy(vA).lerp(vB, t).normalize();
        const elev = THREE.MathUtils.lerp(GLOBE_RADIUS + 0.014, apexHeight, Math.sin(t * Math.PI));
        pts.push(mid.clone().multiplyScalar(elev));
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 44, 0.0062, 6, false);
      const arcMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPhase: { value: idx * 0.23 },
          uColor: { value: new THREE.Color(hex) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uPhase;
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            float edgeFade = sin(vUv.x * 3.14159265);
            float track = 0.20 * edgeFade;
            float pulsePos = fract(vUv.x - uTime * 0.36 + uPhase);
            float pulse = exp(-pow((pulsePos - 0.5) * 10.5, 2.0)) * edgeFade;
            float alpha = clamp(track + pulse * 0.92, 0.0, 1.0);
            vec3 col = mix(uColor, vec3(1.0, 0.98, 0.9), pulse * 0.58);
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const arcMesh = new THREE.Mesh(tubeGeo, arcMat);
      group.add(arcMesh);
      this.arcMaterials.push(arcMat);

      // Subtle glowing telemetry hub ring at route origin
      const hubMesh = new THREE.Mesh(hubRingGeo, hex === '#FBBF24' ? hubMatGold : hubMatCyan);
      hubMesh.position.copy(vA);
      _vec3.copy(vA).normalize();
      hubMesh.quaternion.setFromUnitVectors(up, _vec3);
      hubMesh.rotateX(Math.PI / 2);
      group.add(hubMesh);
    });

    // 4 Low-Earth-Orbit Telemetry Satellites gliding smoothly around Earth
    const bodyGeo = new THREE.BoxGeometry(0.026, 0.016, 0.016);
    const panelGeo = new THREE.BoxGeometry(0.075, 0.022, 0.003);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#FBBF24',
      emissive: '#D97706',
      emissiveIntensity: 0.7,
      metalness: 0.85,
      roughness: 0.25,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#0284C7',
      emissiveIntensity: 0.55,
      metalness: 0.75,
      roughness: 0.2,
    });
    const leoConfigs = [
      { radius: GLOBE_RADIUS * 1.14, speed: 0.42, phase: 0.2, inclination: 0.68, ascNode: 0.4 },
      { radius: GLOBE_RADIUS * 1.19, speed: -0.34, phase: 2.1, inclination: -0.92, ascNode: 1.7 },
      { radius: GLOBE_RADIUS * 1.16, speed: 0.37, phase: 3.8, inclination: 1.12, ascNode: -0.9 },
      { radius: GLOBE_RADIUS * 1.21, speed: 0.31, phase: 5.1, inclination: -0.45, ascNode: 2.6 },
    ];
    for (const cfg of leoConfigs) {
      const sat = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      const panel = new THREE.Mesh(panelGeo, panelMat);
      sat.add(body, panel);
      group.add(sat);
      this.leoSatellites.push({ mesh: sat, ...cfg });
    }

    return group;
  }

  private buildOrbitalRings(): THREE.Group {
    const group = new THREE.Group();

    const goldRingMat = new THREE.MeshStandardMaterial({
      color: '#E5B84B',
      metalness: 0.88,
      roughness: 0.24,
      transparent: true,
      opacity: 0.48,
    });

    const cyanTrackMat = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      metalness: 0.55,
      roughness: 0.35,
      transparent: true,
      opacity: 0.3,
    });

    // Primary equatorial gimbal + aligned ticks sharing one parent group (zero stray misalignment!)
    const eqGroup = new THREE.Group();
    eqGroup.rotation.x = -0.14;
    eqGroup.rotation.y = 0.22;

    const eqRing = new THREE.Mesh(new THREE.TorusGeometry(GLOBE_RADIUS * 1.24, 0.0055, 10, 128), goldRingMat);
    eqRing.rotation.x = Math.PI / 2;
    eqGroup.add(eqRing);

    const tickCount = 36;
    const tickGeo = new THREE.BoxGeometry(0.012, 0.028, 0.012);
    const ticks = new THREE.InstancedMesh(tickGeo, goldRingMat, tickCount);
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2;
      const r = GLOBE_RADIUS * 1.24;
      _dummy.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      _dummy.rotation.set(0, -angle, 0);
      _dummy.scale.set(1, i % 3 === 0 ? 1.4 : 0.75, 1);
      _dummy.updateMatrix();
      ticks.setMatrixAt(i, _dummy.matrix);
    }
    ticks.instanceMatrix.needsUpdate = true;
    ticks.computeBoundingSphere();
    eqGroup.add(ticks);
    group.add(eqGroup);

    const orbit2 = new THREE.Mesh(new THREE.TorusGeometry(GLOBE_RADIUS * 1.36, 0.005, 10, 120), cyanTrackMat);
    orbit2.rotation.x = Math.PI / 2 + 0.42;
    orbit2.rotation.z = -0.35;
    group.add(orbit2);

    const orbit3 = new THREE.Mesh(new THREE.TorusGeometry(GLOBE_RADIUS * 1.46, 0.004, 10, 120), cyanTrackMat);
    orbit3.rotation.x = Math.PI / 2 - 0.55;
    orbit3.rotation.z = 0.48;
    group.add(orbit3);

    return group;
  }

  private buildOrbitalFlags(maxAniso: number): void {
    const featuredCodes = ['jp', 'br', 'gb', 'ke', 'ca', 'fr'];
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#CBD5E1',
      metalness: 0.85,
      roughness: 0.28,
    });
    const hubMat = new THREE.MeshStandardMaterial({
      color: '#E5B84B',
      metalness: 0.9,
      roughness: 0.2,
    });

    const planeGeo = new THREE.PlaneGeometry(0.36, 0.27);
    const frameGeo = new THREE.BoxGeometry(0.39, 0.30, 0.016);
    const mastGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8);
    const finialGeo = new THREE.SphereGeometry(0.024, 10, 10);

    featuredCodes.forEach((code, idx) => {
      const tex = createFlagSatelliteTexture(code, maxAniso);
      const flagMat = new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.55,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });

      const satGroup = new THREE.Group();
      const frame = new THREE.Mesh(frameGeo, frameMat);
      const frontFlag = new THREE.Mesh(planeGeo, flagMat);
      frontFlag.position.z = 0.01;
      const backFlag = new THREE.Mesh(planeGeo, flagMat);
      backFlag.position.z = -0.01;
      backFlag.rotation.y = Math.PI;

      const mast = new THREE.Mesh(mastGeo, frameMat);
      mast.position.x = -0.205;
      const finial = new THREE.Mesh(finialGeo, hubMat);
      finial.position.set(-0.205, 0.19, 0);

      satGroup.add(frame, frontFlag, backFlag, mast, finial);
      this.earthGroup.add(satGroup);

      this.orbitalFlags.push({
        group: satGroup,
        radius: GLOBE_RADIUS * (1.26 + (idx % 3) * 0.10),
        speed: 0.28 + (idx % 2) * 0.09,
        phase: (idx / featuredCodes.length) * Math.PI * 2,
        tiltX: idx % 2 === 0 ? 0.34 : -0.44,
        tiltZ: idx % 3 === 0 ? 0.28 : -0.24,
        textures: [tex],
      });
    });
  }

  private buildCountryMarkers(): THREE.InstancedMesh {
    const geo = new THREE.CylinderGeometry(0.022, 0.022, 0.018, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.45,
      emissive: '#0C4A6E',
      emissiveIntensity: 0.45,
    });
    const inst = new THREE.InstancedMesh(geo, mat, SOVEREIGN_COUNTRIES.length);
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();

    SOVEREIGN_COUNTRIES.forEach((c, idx) => {
      latLngToVector3(c.lat, c.lng, GLOBE_RADIUS + 0.008, _dummy.position);
      dir.copy(_dummy.position).normalize();
      _dummy.quaternion.setFromUnitVectors(up, dir);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      inst.setMatrixAt(idx, _dummy.matrix);
      _color.set('#38BDF8');
      inst.setColorAt(idx, _color);
    });

    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    return inst;
  }

  private buildSelectedBeacon(): THREE.Group {
    const g = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#FBBF24',
      emissive: '#D97706',
      emissiveIntensity: 0.65,
      metalness: 0.7,
      roughness: 0.2,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.01, 8, 28), goldMat);
    ring.rotation.x = Math.PI / 2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.018, 0.18, 8), goldMat);
    stem.position.y = 0.09;
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 0), goldMat);
    diamond.position.y = 0.21;
    g.add(ring, stem, diamond);
    return g;
  }

  private buildHotspotMarkers(): THREE.Group {
    const group = new THREE.Group();
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();

    const baseRingGeo = new THREE.TorusGeometry(0.046, 0.0085, 8, 24);
    const collarGeo = new THREE.TorusGeometry(0.018, 0.0045, 6, 16);
    const spireGeo = new THREE.CylinderGeometry(0.0065, 0.011, 0.11, 8);
    const landmarkBeaconGeo = new THREE.OctahedronGeometry(0.036, 0);
    const capitalBeaconGeo = new THREE.DodecahedronGeometry(0.033, 0);
    const hitGeo = new THREE.SphereGeometry(0.145, 8, 8);

    const spireMat = new THREE.MeshStandardMaterial({
      color: '#E2E8F0',
      metalness: 0.85,
      roughness: 0.22,
    });
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    GLOBE_HOTSPOTS.forEach((hotspot, idx) => {
      const isLandmark = hotspot.kind === 'landmark';
      const ringColor = isLandmark ? '#F59E0B' : '#38BDF8';
      const beaconColor = isLandmark ? '#FBBF24' : '#7DD3FC';
      const beaconEmissive = isLandmark ? '#D97706' : '#0284C7';
      const baseEmissive = 0.65;

      const ringMat = new THREE.MeshStandardMaterial({
        color: ringColor,
        emissive: ringColor,
        emissiveIntensity: 0.35,
        metalness: 0.72,
        roughness: 0.25,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });

      const beaconMat = new THREE.MeshStandardMaterial({
        color: beaconColor,
        emissive: beaconEmissive,
        emissiveIntensity: baseEmissive,
        metalness: 0.65,
        roughness: 0.18,
      });

      const markerGroup = new THREE.Group();
      latLngToVector3(hotspot.lat, hotspot.lng, GLOBE_RADIUS + 0.008, markerGroup.position);
      dir.copy(markerGroup.position).normalize();
      markerGroup.quaternion.setFromUnitVectors(up, dir);

      const baseRing = new THREE.Mesh(baseRingGeo, ringMat);
      baseRing.rotation.x = Math.PI / 2;

      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.y = 0.055;

      const collar = new THREE.Mesh(collarGeo, ringMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.095;

      const beaconMesh = new THREE.Mesh(
        isLandmark ? landmarkBeaconGeo : capitalBeaconGeo,
        beaconMat
      );
      beaconMesh.position.y = 0.132;

      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.y = 0.085;
      hitMesh.userData.hotspotIndex = idx;

      markerGroup.add(baseRing, spire, collar, beaconMesh, hitMesh);
      group.add(markerGroup);

      this.hotspotHitMeshes.push(hitMesh);
      this.hotspotEntries.push({
        hotspot,
        group: markerGroup,
        beaconMesh,
        beaconMat,
        ringMat,
        hitMesh,
        baseEmissive,
      });
    });

    return group;
  }

  public setMode(nextMode: GlobeViewMode): void {
    const prev = this.mode;
    this.mode = nextMode;
    this.controls.enabled = nextMode === 'explore';

    if (prev !== nextMode) {
      if (this.hoveredHotspotIndex !== -1) {
        this.hoveredHotspotIndex = -1;
        this.callbacks.onHoverHotspot?.(null);
      }
      if (this.hoveredIndex !== -1) {
        this.hoveredIndex = -1;
        this.callbacks.onHoverCountry?.(null);
      }
      this.selectedHotspotId = null;
      this.renderer.domElement.style.cursor = nextMode === 'explore' ? 'grab' : 'default';
    }

    if (nextMode === 'intro' && prev !== 'intro') {
      this.introElapsed = 0;
    }
    if (nextMode === 'explore') {
      this.flyToActive = false;
      this.controls.target.set(0, 0, 0);
      if (prev === 'hub') {
        this.flyTargetCamPos.set(0, 0.8, 5.35);
        this.flyToActive = true;
      }
    }
  }

  public setDiscoveredCountries(codes: string[]): void {
    this.discoveredSet = new Set(codes);
    SOVEREIGN_COUNTRIES.forEach((c, idx) => {
      if (this.selectedCountryCode === c.code) {
        _color.set('#FBBF24');
      } else if (this.discoveredSet.has(c.code)) {
        _color.set('#34D399');
      } else {
        _color.set('#38BDF8');
      }
      this.markerMesh.setColorAt(idx, _color);
    });
    if (this.markerMesh.instanceColor) {
      this.markerMesh.instanceColor.needsUpdate = true;
    }
  }

  public focusCountry(country: Country | null): void {
    this.selectedCountryCode = country?.code ?? null;
    if (country) {
      this.selectedHotspotId = null;
    }
    this.setDiscoveredCountries(Array.from(this.discoveredSet));

    if (!country) {
      this.selectedBeacon.visible = false;
      return;
    }

    const pos = latLngToVector3(country.lat, country.lng, GLOBE_RADIUS + 0.01, _vec3);
    this.selectedBeacon.position.copy(pos);
    const up = new THREE.Vector3(0, 1, 0);
    const dir = pos.clone().normalize();
    this.selectedBeacon.quaternion.setFromUnitVectors(up, dir);
    this.selectedBeacon.visible = true;

    if (this.mode === 'explore') {
      // Transform local surface direction into world space (accounting for globeSpinGroup rotation)
      this.globeSpinGroup.updateMatrixWorld();
      const worldDir = pos.clone().applyMatrix4(this.globeSpinGroup.matrixWorld).normalize();
      const dist = Math.max(3.6, Math.min(5.2, this.camera.position.length()));
      this.flyTargetCamPos.copy(worldDir).multiplyScalar(dist);
      this.flyToActive = true;
    }
  }

  public focusHotspot(hotspot: GlobeHotspot | null): void {
    this.selectedHotspotId = hotspot?.id ?? null;

    if (hotspot) {
      this.selectedCountryCode = null;
      this.selectedBeacon.visible = false;
      this.setDiscoveredCountries(Array.from(this.discoveredSet));

      if (this.mode === 'explore') {
        const pos = latLngToVector3(hotspot.lat, hotspot.lng, GLOBE_RADIUS + 0.01, _vec3);
        this.globeSpinGroup.updateMatrixWorld();
        const worldDir = pos.clone().applyMatrix4(this.globeSpinGroup.matrixWorld).normalize();
        const dist = Math.max(3.5, Math.min(4.85, this.camera.position.length()));
        this.flyTargetCamPos.copy(worldDir).multiplyScalar(dist);
        this.flyToActive = true;
      }
    }
  }

  public getVisibleHotspotPositions(): { id: string; name: string; kind: string; x: number; y: number }[] {
    if (this.mode !== 'hub' && this.mode !== 'explore') return [];
    this.scene.updateMatrixWorld();
    const rect = this.renderer.domElement.getBoundingClientRect();
    const results: { id: string; name: string; kind: string; x: number; y: number }[] = [];

    for (const entry of this.hotspotEntries) {
      if (!this.isHotspotFrontFacing(entry.hitMesh)) continue;
      entry.beaconMesh.getWorldPosition(_projVec);
      _projVec.project(this.camera);
      if (_projVec.z < -1 || _projVec.z > 1) continue;
      const x = rect.left + (_projVec.x * 0.5 + 0.5) * rect.width;
      const y = rect.top + (-_projVec.y * 0.5 + 0.5) * rect.height;
      if (x >= rect.left + 20 && x <= rect.right - 20 && y >= rect.top + 60 && y <= rect.bottom - 20) {
        results.push({ id: entry.hotspot.id, name: entry.hotspot.name, kind: entry.hotspot.kind, x, y });
      }
    }
    return results;
  }

  public setReducedMotion(val: boolean): void {
    this.reducedMotion = val;
  }

  public setVisualOptions(next: Partial<GlobeVisualOptions>): void {
    this.visualOptions = { ...this.visualOptions, ...next };
    this.cloudMesh.visible = this.visualOptions.showClouds;
    this.arcGroup.visible = this.visualOptions.showArcs;
    this.earthMat.userData.uNightEnabled.value = this.visualOptions.showNightLights ? 1 : 0;
    this.earthMat.userData.uShowSnow.value = this.visualOptions.showSnow ? 1 : 0;
  }

  private applyImmediateFraming(): void {
    if (this.mode === 'hub') {
      this.earthGroup.position.set(1.25, -0.08, 0);
      this.camera.position.set(0, 0.55, 5.85);
      this.camera.lookAt(0, 0, 0);
    } else if (this.mode === 'explore') {
      this.earthGroup.position.set(0, 0, 0);
      this.camera.position.set(0, 0.85, 5.4);
      this.camera.lookAt(0, 0, 0);
    }
  }

  private onResize = (): void => {
    if (this.isDisposed) return;
    const width = Math.max(320, this.container.clientWidth || window.innerWidth);
    const height = Math.max(240, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.render(this.scene, this.camera);
  };

  private isHotspotFrontFacing(target: THREE.Object3D): boolean {
    target.getWorldPosition(_hotspotWorldPos);
    this.earthGroup.getWorldPosition(_globeCenterWorldPos);
    _hotspotNormal.copy(_hotspotWorldPos).sub(_globeCenterWorldPos).normalize();
    _camToHotspot.copy(this.camera.position).sub(_hotspotWorldPos).normalize();
    return _hotspotNormal.dot(_camToHotspot) > 0.08;
  }

  private raycastVisibleHotspot(): number {
    const hits = _raycaster.intersectObjects(this.hotspotHitMeshes, false);
    for (const hit of hits) {
      const idx = hit.object.userData.hotspotIndex;
      if (typeof idx === 'number' && this.isHotspotFrontFacing(hit.object)) {
        return idx;
      }
    }
    return -1;
  }

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.pointerNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNormY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.mode !== 'explore' && this.mode !== 'hub') return;
    const now = performance.now();
    if (now - this.lastRaycastMs < 45) return;
    this.lastRaycastMs = now;

    _pointer.set(this.pointerNormX, this.pointerNormY);
    _raycaster.setFromCamera(_pointer, this.camera);

    const hotspotIdx = this.raycastVisibleHotspot();
    if (hotspotIdx !== -1) {
      this.hoveredHotspotIndex = hotspotIdx;
      if (this.hoveredIndex !== -1) {
        this.hoveredIndex = -1;
        this.callbacks.onHoverCountry?.(null);
      }
      this.renderer.domElement.style.cursor = 'pointer';
      this.callbacks.onHoverHotspot?.(this.hotspotEntries[hotspotIdx].hotspot, {
        x: e.clientX,
        y: e.clientY,
      });
      return;
    }

    if (this.hoveredHotspotIndex !== -1) {
      this.hoveredHotspotIndex = -1;
      this.callbacks.onHoverHotspot?.(null);
    }

    if (this.mode !== 'explore') {
      this.renderer.domElement.style.cursor = 'default';
      return;
    }

    const hits = _raycaster.intersectObject(this.markerMesh, false);
    if (hits.length > 0 && hits[0].instanceId !== undefined) {
      const idx = hits[0].instanceId;
      this.hoveredIndex = idx;
      this.renderer.domElement.style.cursor = 'pointer';
      this.callbacks.onHoverCountry?.(SOVEREIGN_COUNTRIES[idx], {
        x: e.clientX,
        y: e.clientY,
      });
    } else if (this.hoveredIndex !== -1) {
      this.hoveredIndex = -1;
      this.renderer.domElement.style.cursor = 'grab';
      this.callbacks.onHoverCountry?.(null);
    } else {
      this.renderer.domElement.style.cursor = 'grab';
    }
  };

  private pointerDownPos = { x: 0, y: 0 };

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.mode !== 'explore' && this.mode !== 'hub') return;
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    if (dx * dx + dy * dy > 36) return; // Dragged camera, not a click

    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    _raycaster.setFromCamera(_pointer, this.camera);

    const hotspotIdx = this.raycastVisibleHotspot();
    if (hotspotIdx !== -1) {
      const hotspot = this.hotspotEntries[hotspotIdx].hotspot;
      this.focusHotspot(hotspot);
      this.callbacks.onSelectHotspot?.(hotspot);
      return;
    }

    if (this.mode !== 'explore') return;

    const hits = _raycaster.intersectObject(this.markerMesh, false);
    if (hits.length > 0 && hits[0].instanceId !== undefined) {
      const country = SOVEREIGN_COUNTRIES[hits[0].instanceId];
      if (country) {
        this.focusCountry(country);
        this.callbacks.onSelectCountry?.(country);
      }
    }
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
  }

  private startLoop(): void {
    this.lastClockMs = performance.now();
    const tick = () => {
      if (this.isDisposed) return;

      const now = performance.now();
      const rawDt = (now - this.lastClockMs) / 1000;
      this.lastClockMs = now;
      const dt = Math.min(rawDt, 0.05);

      if (!document.hidden) {
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    // Render frame 0 immediately so the first visible paint has the 3D globe ready
    this.update(0.016);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number): void {
    const motionScale = this.reducedMotion ? 0.18 : 1.0;
    this.totalTime += dt * motionScale;

    if (this.mode === 'intro') {
      this.introElapsed += dt;
      // Scene 1 (0-1.4s): Earth emerges from darkness
      const lightRamp = THREE.MathUtils.smoothstep(this.introElapsed, 0.1, 1.8);
      this.keyLight.intensity = 0.25 + lightRamp * 2.1;
      this.rimLight.intensity = 0.35 + lightRamp * 0.95;

      // Scene 2-4: Orbital flags glide in + camera approaches smoothly
      const camApproach = THREE.MathUtils.smoothstep(this.introElapsed, 1.0, 5.2);
      const targetZ = THREE.MathUtils.lerp(7.9, 5.65, camApproach);
      const targetX = THREE.MathUtils.lerp(0.0, 1.15, THREE.MathUtils.smoothstep(this.introElapsed, 3.8, 5.8));

      _targetCamPos.set(0, THREE.MathUtils.lerp(0.95, 0.55, camApproach), targetZ);
      this.camera.position.lerp(_targetCamPos, 1 - Math.exp(-3.2 * dt));
      this.earthGroup.position.x = THREE.MathUtils.damp(this.earthGroup.position.x, targetX, 3.0, dt);
      this.earthGroup.position.y = THREE.MathUtils.damp(this.earthGroup.position.y, -0.05, 3.0, dt);
      this.camera.lookAt(0, 0, 0);

      this.globeSpinGroup.rotation.y += dt * 0.22 * motionScale;
      this.cloudMesh.rotation.y += dt * 0.07 * motionScale;
    } else if (this.mode === 'hub') {
      this.keyLight.intensity = THREE.MathUtils.damp(this.keyLight.intensity, 3.1, 4, dt);
      this.rimLight.intensity = THREE.MathUtils.damp(this.rimLight.intensity, 0.14, 4, dt);

      const isNarrow = (this.container.clientWidth || window.innerWidth) < 900;
      const hubX = isNarrow ? 0 : 1.35;
      const hubY = isNarrow ? -0.55 : -0.06;
      const parallaxX = this.reducedMotion ? 0 : this.pointerNormX * 0.18;
      const parallaxY = this.reducedMotion ? 0 : this.pointerNormY * 0.12;

      this.earthGroup.position.x = THREE.MathUtils.damp(this.earthGroup.position.x, hubX, 4.5, dt);
      this.earthGroup.position.y = THREE.MathUtils.damp(this.earthGroup.position.y, hubY, 4.5, dt);

      _targetCamPos.set(parallaxX, 0.52 + parallaxY, isNarrow ? 6.6 : 5.75);
      this.camera.position.lerp(_targetCamPos, 1 - Math.exp(-3.8 * dt));
      _targetLookAt.set(0, 0, 0);
      this.camera.lookAt(_targetLookAt);

      const hubSpinFactor =
        this.hoveredHotspotIndex !== -1 || this.selectedHotspotId !== null ? 0.0 : 0.12;
      this.globeSpinGroup.rotation.y += dt * hubSpinFactor * motionScale;
      this.cloudMesh.rotation.y += dt * 0.05 * motionScale;
    } else if (this.mode === 'explore') {
      this.keyLight.intensity = THREE.MathUtils.damp(this.keyLight.intensity, 3.15, 5, dt);
      this.rimLight.intensity = THREE.MathUtils.damp(this.rimLight.intensity, 0.12, 5, dt);
      this.earthGroup.position.x = THREE.MathUtils.damp(this.earthGroup.position.x, 0, 8.5, dt);
      this.earthGroup.position.y = THREE.MathUtils.damp(this.earthGroup.position.y, 0, 8.5, dt);
      this.cloudMesh.rotation.y += dt * 0.036 * motionScale;

      if (
        this.visualOptions.autoSpin &&
        !this.flyToActive &&
        this.hoveredHotspotIndex === -1 &&
        !this.selectedHotspotId &&
        !this.selectedCountryCode
      ) {
        this.globeSpinGroup.rotation.y += dt * 0.09 * motionScale;
      }

      if (this.flyToActive) {
        this.camera.position.lerp(this.flyTargetCamPos, 1 - Math.exp(-8.0 * dt));
        if (this.camera.position.distanceTo(this.flyTargetCamPos) < 0.04) {
          this.flyToActive = false;
        }
      }
      this.controls.update();
    } else {
      // paused-bg (2D active game mode behind subtle backdrop)
      this.keyLight.intensity = THREE.MathUtils.damp(this.keyLight.intensity, 2.1, 4, dt);
      this.rimLight.intensity = THREE.MathUtils.damp(this.rimLight.intensity, 0.25, 4, dt);
      this.earthGroup.position.x = THREE.MathUtils.damp(this.earthGroup.position.x, 0, 4, dt);
      this.earthGroup.position.y = THREE.MathUtils.damp(this.earthGroup.position.y, 0, 4, dt);
      this.globeSpinGroup.rotation.y += dt * 0.045 * motionScale;
      this.cloudMesh.rotation.y += dt * 0.025 * motionScale;
    }

    // Subtle animated solar terminator angle & ocean wave clock
    const sunOrbit = this.mode === 'intro'
      ? 0.25 + THREE.MathUtils.smoothstep(this.introElapsed, 0.2, 4.5) * 0.38
      : 0.48 + Math.sin(this.totalTime * 0.14) * 0.18;
    this.sunDir
      .set(Math.cos(sunOrbit) * 0.92, 0.30 + Math.sin(this.totalTime * 0.09) * 0.08, Math.sin(sunOrbit) * 0.92)
      .normalize();
    this.keyLight.position.copy(this.sunDir).multiplyScalar(10);
    this.globeSpinGroup.updateMatrixWorld();
    this.earthMat.userData.uTime.value = this.totalTime;
    this.earthMat.userData.uSunDir.value.copy(this.sunDir);
    this.earthMat.userData.uCloudOffset.value = (this.cloudMesh.rotation.y / (Math.PI * 2)) % 1;
    this.earthMat.userData.uEarthWorldMat3.value.setFromMatrix4(this.earthMesh.matrixWorld);
    this.cloudMat.userData.uSunDir.value.copy(this.sunDir);
    this.atmoInnerMat.uniforms.uSunDir.value.copy(this.sunDir);
    this.atmoOuterMat.uniforms.uSunDir.value.copy(this.sunDir);

    // Animate great-circle visualization arcs, data packets & LEO satellites
    const showArcs =
      this.visualOptions.showArcs && (this.mode === 'hub' || this.mode === 'explore' || this.mode === 'intro');
    this.arcGroup.visible = showArcs;
    if (showArcs) {
      for (let i = 0; i < this.arcMaterials.length; i++) {
        this.arcMaterials[i].uniforms.uTime.value = this.totalTime;
      }
      for (let i = 0; i < this.leoSatellites.length; i++) {
        const sat = this.leoSatellites[i];
        const ang = this.totalTime * sat.speed + sat.phase;
        const cx = Math.cos(ang) * sat.radius;
        const cz = Math.sin(ang) * sat.radius;
        const yInc = cz * Math.sin(sat.inclination);
        const zInc = cz * Math.cos(sat.inclination);
        const cosA = Math.cos(sat.ascNode);
        const sinA = Math.sin(sat.ascNode);
        sat.mesh.position.set(cx * cosA - zInc * sinA, yInc, cx * sinA + zInc * cosA);
        sat.mesh.lookAt(0, 0, 0);
      }
    }

    // Update landmark & capital hotspot beacons
    const showHotspots = this.mode === 'hub' || this.mode === 'explore';
    this.hotspotGroup.visible = showHotspots;
    if (showHotspots) {
      for (let i = 0; i < this.hotspotEntries.length; i++) {
        const entry = this.hotspotEntries[i];
        const isSelected = entry.hotspot.id === this.selectedHotspotId;
        const isHovered = i === this.hoveredHotspotIndex;

        const targetScale = isSelected ? 1.55 : isHovered ? 1.32 : 1.0;
        const nextScale = THREE.MathUtils.damp(entry.group.scale.x, targetScale, 10, dt);
        entry.group.scale.setScalar(nextScale);

        const bob = this.reducedMotion ? 0 : Math.sin(this.totalTime * 2.4 + i * 0.7) * 0.009;
        entry.beaconMesh.position.y = 0.132 + bob;
        entry.beaconMesh.rotation.y += dt * (isSelected || isHovered ? 1.8 : 0.75) * motionScale;

        const targetEmissive = isSelected ? 1.35 : isHovered ? 1.05 : entry.baseEmissive;
        entry.beaconMat.emissiveIntensity = THREE.MathUtils.damp(
          entry.beaconMat.emissiveIntensity,
          targetEmissive,
          10,
          dt
        );
        entry.ringMat.emissiveIntensity = isSelected ? 0.95 : isHovered ? 0.65 : 0.35;
      }
    }

    // Update orbital flag satellites (hidden cleanly in explore mode to keep globe unobstructed)
    const showSatellites = this.mode === 'intro' || this.mode === 'hub';
    const satScaleTarget = showSatellites ? 1 : 0.001;
    for (const sat of this.orbitalFlags) {
      const s = THREE.MathUtils.damp(sat.group.scale.x, satScaleTarget, 14, dt);
      sat.group.scale.setScalar(s);
      sat.group.visible = showSatellites || s > 0.12;

      const angle = this.totalTime * sat.speed + sat.phase;
      const x = Math.cos(angle) * sat.radius;
      const z = Math.sin(angle) * sat.radius;
      const y = Math.sin(angle) * sat.radius * Math.sin(sat.tiltX);
      sat.group.position.set(x, y, z);
      sat.group.lookAt(this.camera.position);
    }

    // Architectural gimbal rings shown on Intro & Hub only (keep Explore mode realistically unobstructed)
    this.ringGroup.visible = this.mode === 'intro' || this.mode === 'hub';
    this.ringGroup.rotation.y = this.totalTime * 0.04;
    this.starPoints.rotation.y = this.totalTime * 0.008;
    this.microStarPoints.rotation.y = this.totalTime * 0.005;
  }

  public dispose(): void {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);

    this.controls.dispose();
    this.textures.dispose();
    this.envRT.dispose();

    for (const sat of this.orbitalFlags) {
      sat.textures.forEach((t) => t.dispose());
    }

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
