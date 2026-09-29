import {
  BufferAttribute,
  BufferGeometry,
  CameraHelper,
  Color,
  Line,
  LineBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadPack } from '../../engine/pack/loader';
import type { PackCamera } from '../../engine/pack/format';
import type { PointSet } from '../../engine/pack/writer';
import { LAYER_PREVIEW, LAYER_SUBJECT, LAYER_WORLD, SyntheticScene, type BakeParams, type BakeResult } from './SyntheticScene';
import { RECIPES, recipeFromUrl } from './recipes';

// Development page /bake (D3). An internal tool: no world styles.

document.title = '4D.OS · bake (dev)';
document.body.innerHTML = `
<style>
  body { margin: 0; font: 12px/1.4 ui-monospace, monospace; background: #1b1b1b; color: #ddd; }
  #app { display: grid; grid-template-columns: 280px 1fr 660px; height: 100vh; }
  aside { padding: 12px; overflow: auto; border-right: 1px solid #333; }
  label { display: grid; grid-template-columns: 1fr 110px; gap: 6px; align-items: center; margin: 4px 0; }
  input { font: inherit; background: #111; color: #eee; border: 1px solid #444; padding: 2px 4px; }
  button { font: inherit; width: 100%; margin: 4px 0; padding: 6px; background: #2c2c2c; color: #eee; border: 1px solid #555; cursor: pointer; }
  button:hover { background: #3a3a3a; }
  pre { white-space: pre-wrap; margin: 8px 0 0; color: #9c9; }
  #preview { position: relative; }
  #preview canvas { width: 100%; height: 100%; display: block; }
  #right { padding: 12px; border-left: 1px solid #333; overflow: auto; }
  #source { width: 640px; image-rendering: pixelated; border: 1px solid #444; }
  .row { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
  .row input[type=range] { flex: 1; }
</style>
<div id="app">
  <aside>
    <strong>Synthetic bake</strong>
    <form id="params"></form>
    <button id="preview-btn">Preview</button>
    <button id="bake-btn">Bake + save to public/packs/</button>
    <button id="download-btn">Download files</button>
    <button id="verify-btn">Verify saved pack</button>
    <button id="silhouette-btn">Check silhouettes (all frames)</button>
    <label><span>show world meshes</span><input id="show-world" type="checkbox"></label>
    <label><span>show subject mesh</span><input id="show-deer" type="checkbox" checked></label>
    <label><span>highlight points</span><input id="highlight" type="checkbox" checked></label>
    <pre id="log"></pre>
  </aside>
  <div id="preview"></div>
  <div id="right">
    <div class="row"><span>frame</span><input id="frame" type="range" min="0" max="0" value="0"><span id="frame-label">0</span></div>
    <canvas id="source"></canvas>
    <pre id="metric"></pre>
  </div>
</div>`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const log = (line: string) => {
  $('log').textContent += `${line}\n`;
  console.log(`[bake] ${line}`);
};

// --- parameters -------------------------------------------------------------------------------

// The recipe is picked with ?scene=<id>; changing it reloads the page (each recipe builds its own scene).
const recipe = recipeFromUrl();
const DEFAULT_PARAMS = recipe.defaults;

const FIELDS: [keyof BakeParams, string, string][] = [
  ['name', 'pack name', 'text'],
  ['fps', 'fps', 'number'],
  ['duration', 'duration (s)', 'number'],
  ['pointsPerFrame', 'points / frame', 'number'],
  ['envDensity', 'env density (pts/m²)', 'number'],
  ['sourceWidth', 'source width (px)', 'number'],
  ['seed', 'seed', 'number'],
  ['depthNoise', 'depth noise (0–1)', 'number'],
];
const form = $('params') as HTMLFormElement;
form.insertAdjacentHTML(
  'beforeend',
  `<label><span>scene</span><select name="scene">${Object.entries(RECIPES)
    .map(([id]) => `<option value="${id}" ${id === recipe.id ? 'selected' : ''}>${id}</option>`)
    .join('')}</select></label>`,
);
(form.elements.namedItem('scene') as HTMLSelectElement).onchange = (event) => {
  const url = new URL(location.href);
  url.searchParams.set('scene', (event.target as HTMLSelectElement).value);
  location.href = url.href;
};
for (const [key, label, type] of FIELDS) {
  form.insertAdjacentHTML(
    'beforeend',
    `<label><span>${label}</span><input name="${key}" type="${type}" step="any" value="${DEFAULT_PARAMS[key]}"></label>`,
  );
}
function readParams(): BakeParams {
  const data = new FormData(form);
  const params = { ...DEFAULT_PARAMS };
  for (const [key, , type] of FIELDS) {
    const raw = String(data.get(key));
    (params as Record<string, unknown>)[key] = type === 'number' ? Number(raw) : raw;
  }
  return params;
}
function writeParams(params: BakeParams) {
  for (const [key] of FIELDS) (form.elements.namedItem(key) as HTMLInputElement).value = String(params[key]);
}

// --- 3D preview ---------------------------------------------------------------------------------

const host = $('preview');
const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
host.append(renderer.domElement);
const synthetic = new SyntheticScene(renderer, recipe);
const scene = synthetic.scene;

const camera = new PerspectiveCamera(50, 1, 0.1, 500);
camera.layers.set(LAYER_SUBJECT);
camera.layers.enable(LAYER_PREVIEW);
camera.position.set(-10, 14, -34);
const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('change', () => render());

const envPoints = new Points(new BufferGeometry(), new PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true }));
const subjectPoints = new Points(new BufferGeometry(), new PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true }));
subjectPoints.renderOrder = 1;
const trajectory = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0x00e5ff }));
const frustumCamera = new PerspectiveCamera(45, 16 / 9, 0.3, 6);
const frustumHelper = new CameraHelper(frustumCamera);
for (const object of [envPoints, subjectPoints, trajectory, frustumHelper]) {
  object.layers.set(LAYER_PREVIEW);
  scene.add(object);
}

function resize() {
  const { clientWidth, clientHeight } = host;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  render();
}
window.addEventListener('resize', resize);

let renderQueued = false;
function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderer.setClearColor(0x101010);
    renderer.shadowMap.enabled = false;
    renderer.render(scene, camera);
  });
}

function setPoints(points: Points, set: PointSet, highlight?: Color) {
  const geometry = points.geometry;
  geometry.setAttribute('position', new BufferAttribute(set.positions, 3));
  let colors: BufferAttribute;
  if (highlight) {
    const tinted = new Float32Array(set.positions.length);
    for (let i = 0; i < tinted.length; i += 3) highlight.toArray(tinted, i);
    colors = new BufferAttribute(tinted, 3);
  } else {
    // The pack colors are sRGB; three works in linear.
    const linear = new Float32Array(set.colors.length);
    const color = new Color();
    for (let i = 0; i < linear.length; i += 3) {
      color.setRGB(set.colors[i] / 255, set.colors[i + 1] / 255, set.colors[i + 2] / 255, SRGBColorSpace).toArray(linear, i);
    }
    colors = new BufferAttribute(linear, 3);
  }
  geometry.setAttribute('color', colors);
  geometry.computeBoundingSphere();
}

// --- state ----------------------------------------------------------------------------------

let cameras: PackCamera[] = [];
let result: BakeResult | null = null;
const HIGHLIGHT = new Color(0xff2bd6);

async function preview() {
  const params = readParams();
  synthetic.setup(params);
  cameras = Array.from({ length: synthetic.frameCount }, (_, f) => synthetic.cameraAt(f));
  const env = synthetic.sampleEnvironment(cameras);
  setPoints(envPoints, env);
  trajectory.geometry.setAttribute('position', new BufferAttribute(new Float32Array(cameras.flatMap((c) => c.pos)), 3));
  const slider = $('frame') as HTMLInputElement;
  slider.max = String(synthetic.frameCount - 1);
  log(`preview: ${synthetic.frameCount} frames, ${env.positions.length / 3} static points`);
  showFrame(Number(slider.value));
}

function showFrame(frame: number) {
  if (!cameras.length) return;
  frame = Math.min(frame, cameras.length - 1);
  $('frame-label').textContent = String(frame);
  const points = result?.frames[frame] ?? synthetic.sampleSubject(frame, cameras);
  synthetic.pose(frame);
  setPoints(subjectPoints, points, ($('highlight') as HTMLInputElement).checked ? HIGHLIGHT : undefined);
  synthetic.applyCamera(frustumCamera, cameras[frame]);
  frustumCamera.far = 6;
  frustumCamera.updateProjectionMatrix();
  frustumHelper.update();

  // Source frame with the projected points on top, and the silhouette metric.
  const image = synthetic.renderSource(frame, cameras[frame]);
  const check = synthetic.checkSilhouette(frame, cameras[frame], points);
  const scale = 2;
  const canvas = $('source') as HTMLCanvasElement;
  canvas.width = image.width * scale;
  canvas.height = image.height * scale;
  const context = canvas.getContext('2d')!;
  const bitmap = new OffscreenCanvas(image.width, image.height);
  bitmap.getContext('2d')!.putImageData(new ImageData(image.pixels as Uint8ClampedArray<ArrayBuffer>, image.width, image.height), 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(255, 43, 214, 0.85)';
  const overlay = ($('highlight') as HTMLInputElement).checked;
  for (let i = 0; overlay && i < check.projected.length; i += 2) {
    context.fillRect(check.projected[i] * scale - 0.5, check.projected[i + 1] * scale - 0.5, 1, 1);
  }
  $('metric').textContent =
    `frame ${frame}\n` +
    `points inside silhouette (±1px): ${(check.inside * 100).toFixed(2)}%\n` +
    `silhouette pixels covered (±1px): ${(check.covered * 100).toFixed(2)}%`;
  render();
  return check;
}

// --- bake, save and verification --------------------------------------------------------------------

async function bake(params = readParams()): Promise<BakeResult> {
  writeParams(params);
  const started = performance.now();
  result = null;
  const baked = await synthetic.bake(params, (done, total, stage) => {
    $('log').dataset.progress = `${stage} ${done}/${total}`;
  });
  result = baked;
  const { meta } = baked.output;
  log(
    `baked "${meta.name}" in ${((performance.now() - started) / 1000).toFixed(1)}s: ${meta.frameCount} frames, ` +
      `${meta.counts.static} static + ${meta.counts.dynamic} dynamic points, ${baked.pages.length} atlas pages`,
  );
  return baked;
}

function packFiles(baked: BakeResult): { name: string; data: Blob }[] {
  return [
    { name: 'scene.json', data: new Blob([baked.output.sceneJson], { type: 'application/json' }) },
    { name: 'static.bin', data: new Blob([baked.output.staticBin]) },
    { name: 'dynamic.bin', data: new Blob([baked.output.dynamicBin]) },
    ...baked.pages.map((page) => ({ name: page.name, data: page.blob })),
  ];
}

async function hashes(baked: BakeResult): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const file of packFiles(baked)) {
    const digest = await crypto.subtle.digest('SHA-256', await file.data.arrayBuffer());
    out[file.name] = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return out;
}

async function save(baked: BakeResult) {
  const name = baked.output.meta.name;
  for (const file of packFiles(baked)) {
    const response = await fetch(`/__pack/save?name=${encodeURIComponent(name)}&file=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      body: file.data,
    });
    if (!response.ok) throw new Error(`save ${file.name}: HTTP ${response.status}`);
  }
  // The dev server picks up new files in public/ with a short delay; until then it answers with the
  // HTML fallback. We wait until each file is served with its real size.
  for (const file of packFiles(baked)) {
    const url = `/packs/${name}/${file.name}`;
    for (let attempt = 0; ; attempt++) {
      const head = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (head.ok && Number(head.headers.get('content-length')) === file.data.size) break;
      if (attempt > 50) throw new Error(`save: ${url} is not served yet`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  log(`saved to public/packs/${name}/`);
}

function download(baked: BakeResult) {
  for (const file of packFiles(baked)) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file.data);
    link.download = `${baked.output.meta.name}__${file.name.replace('/', '__')}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
}

async function verify(name = readParams().name) {
  try {
    const pack = await loadPack(`/packs/${name}/`, { fetch: (url) => fetch(url, { cache: 'no-store' }) });
    const empty = Array.from({ length: pack.meta.frameCount }, (_, f) => pack.dynamic.offsets[f + 1] - pack.dynamic.offsets[f]).filter(
      (n) => n === 0,
    ).length;
    const report = {
      ok: true,
      frames: pack.meta.frameCount,
      synthetic: pack.meta.synthetic,
      static: pack.static.count,
      dynamic: pack.dynamic.count,
      framesWithoutPoints: empty,
      bytes: pack.bytes,
      sourceLayers: pack.source.data.length / (pack.source.width * pack.source.height * 4),
      correspondence: pack.correspondence,
    };
    log(`verify: ${JSON.stringify(report)}`);
    return report;
  } catch (error) {
    log(`verify FAILED: ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, error: String(error) };
  }
}

function checkAllSilhouettes() {
  if (!result) throw new Error('bake first');
  let minInside = 1;
  let minCovered = 1;
  let sumInside = 0;
  let sumCovered = 0;
  const frames = result.frames.length;
  for (let f = 0; f < frames; f++) {
    const check = synthetic.checkSilhouette(f, result.output.meta.cameras[f], result.frames[f]);
    minInside = Math.min(minInside, check.inside);
    minCovered = Math.min(minCovered, check.covered);
    sumInside += check.inside;
    sumCovered += check.covered;
  }
  const report = { frames, minInside, avgInside: sumInside / frames, minCovered, avgCovered: sumCovered / frames };
  log(`silhouettes: ${JSON.stringify(report)}`);
  return report;
}

// --- wiring -------------------------------------------------------------------------------------

$('preview-btn').onclick = () => void preview();
$('bake-btn').onclick = async () => {
  const baked = await bake();
  await save(baked);
  await verify(baked.output.meta.name);
  showFrame(Number(($('frame') as HTMLInputElement).value));
};
$('download-btn').onclick = () => (result ? download(result) : log('bake first'));
$('verify-btn').onclick = () => void verify();
$('silhouette-btn').onclick = () => checkAllSilhouettes();
$('frame').oninput = (event) => showFrame(Number((event.target as HTMLInputElement).value));
$('highlight').onchange = () => showFrame(Number(($('frame') as HTMLInputElement).value));
$('show-world').onchange = (event) => {
  camera.layers[(event.target as HTMLInputElement).checked ? 'enable' : 'disable'](LAYER_WORLD);
  render();
};
$('show-deer').onchange = (event) => {
  camera.layers[(event.target as HTMLInputElement).checked ? 'enable' : 'disable'](LAYER_SUBJECT);
  render();
};

/** API for automating the verification (Playwright). */
const api = {
  ready: false,
  preview,
  showFrame: (frame: number) => {
    ($('frame') as HTMLInputElement).value = String(frame);
    return showFrame(frame);
  },
  bake: async (params: Partial<BakeParams> = {}) => {
    const baked = await bake({ ...readParams(), ...params });
    return { meta: baked.output.meta, hashes: await hashes(baked) };
  },
  save: async () => result && save(result),
  verify,
  checkAllSilhouettes,
  hashes: async () => (result ? hashes(result) : null),
  lookAt: (position: [number, number, number], target: [number, number, number]) => {
    camera.position.set(...position);
    controls.target.set(...target);
    controls.update();
    render();
  },
  deerPosition: () => synthetic.recipe.subject.position.toArray(),
  focus: () => synthetic.recipe.focus().toArray(),
  layers: (world: boolean, deer: boolean) => {
    camera.layers[world ? 'enable' : 'disable'](LAYER_WORLD);
    camera.layers[deer ? 'enable' : 'disable'](LAYER_SUBJECT);
    render();
  },
  highlight: (on: boolean) => {
    ($('highlight') as HTMLInputElement).checked = on;
    showFrame(Number(($('frame') as HTMLInputElement).value));
  },
};
Object.assign(window, { __bake: api, __bakeScene: synthetic });

await synthetic.load();
resize();
await preview();
controls.target.copy(new Vector3(0, 0, 0));
controls.update();
api.ready = true;
log(`scene: ${recipe.id} (${recipe.title})`);
