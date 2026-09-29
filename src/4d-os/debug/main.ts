import { DISPLAY_MODES, RetroDisplay, type DisplayMode } from '../../engine/display/RetroDisplay';
import { Engine } from '../../engine/engine/Engine';
import { loadPack, type Pack } from '../../engine/pack/loader';
import { TimeController, playbackLabel, timecode } from '../../engine/time/TimeController';
import { checkBlocks, countColors, drawnPoints, instrumentUploads, litStats, viewRect, visibleByFrame } from '../../engine/viewer/debug';
import { TimeViewer } from '../../engine/viewer/TimeViewer';

// Development page /debug: the technical core with a minimal UI for verification (D11, step 1).

const params = new URLSearchParams(location.search);
const packUrl = params.get('pack') ?? '/packs/cat-stairs/';
// ?world=a|b|c|d|e loads that world's tokens (palettes and scene colors) before the display.
const world = params.get('world');
if (world && /^[a-e]$/.test(world)) await import(`../worlds/${world}/tokens.css`);

document.title = '4D.OS · debug (dev)';
document.body.innerHTML = `
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0c0c0c; color: #ddd; font: 12px/1.45 ui-monospace, monospace; overflow: hidden; }
  #viewer { position: fixed; inset: 0 320px 0 0; }
  #panel { position: fixed; top: 0; right: 0; bottom: 0; width: 320px; overflow: auto; padding: 10px; box-sizing: border-box;
    background: #161616; border-left: 1px solid #333; z-index: 10; }
  fieldset { border: 1px solid #333; margin: 0 0 8px; padding: 6px 8px; }
  legend { color: #8a8; }
  button { font: inherit; background: #262626; color: #eee; border: 1px solid #555; padding: 3px 6px; cursor: pointer; }
  button:focus-visible, input:focus-visible { outline: 2px solid #2fd0e0; outline-offset: 1px; }
  input[type=range] { width: 100%; }
  #hud { position: fixed; left: 8px; top: 8px; z-index: 10; white-space: pre; pointer-events: none; }
  #synthetic { position: fixed; left: 8px; bottom: 8px; z-index: 10; background: #ddd; color: #111; padding: 1px 6px; }
  #boot { position: fixed; inset: 0; display: grid; place-items: center; z-index: 20; background: #0c0c0c; }
  #boot.done { display: none; }
  pre { white-space: pre-wrap; margin: 0; }
</style>
<div id="viewer" aria-label="4D viewer"></div>
<div id="hud"></div>
<aside id="panel">
  <fieldset><legend>time</legend>
    <button data-act="rewind">J ◀◀</button> <button data-act="hold">K ■</button> <button data-act="forward">L ▶▶</button>
    <button data-act="toggle">space</button> <button data-act="prev">←</button> <button data-act="next">→</button>
    <input id="scrub" type="range" min="0" value="0" aria-label="scrub">
    <label><input type="radio" name="mode" value="memory" checked> memory</label>
    <label><input type="radio" name="mode" value="all"> all</label>
  </fieldset>
  <fieldset><legend>layers</legend>
    <label><input type="checkbox" data-layer="trail" checked> trail</label>
    <label><input type="checkbox" data-layer="background" checked> background</label>
    <label><input type="checkbox" data-layer="frustum" checked> frustum</label>
    <label><input type="checkbox" data-layer="trajectory" checked> trajectory</label><br>
    <label>trail stride <input id="stride" type="number" min="1" value="1" style="width:4em"></label>
    <label><input type="checkbox" id="light" checked> frustum light</label>
  </fieldset>
  <fieldset><legend>display</legend>
    <div id="modes"></div>
    <label>pixel scale <input id="scale" type="number" min="1" max="8" value="3" style="width:4em"></label>
  </fieldset>
  <fieldset><legend>checks</legend>
    <button id="colors">count colors</button> <button id="blocks">check blocks</button>
    <pre id="checks"></pre>
  </fieldset>
</aside>
<div id="synthetic" hidden>synthetic</div>
<div id="boot"><pre id="boot-text">loading…</pre></div>`;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;

const engine = new Engine();
const uploads = instrumentUploads(engine.renderer);
const display = new RetroDisplay();

let pack: Pack;
try {
  pack = await loadPack(packUrl, {
    onProgress: (progress) => ($('#boot-text').textContent = `loading ${(progress * 100).toFixed(1)}%`),
  });
} catch (error) {
  $('#boot-text').textContent = `load failed\n${error instanceof Error ? error.message : String(error)}`;
  Object.assign(window, { __4d: { error: String(error) } });
  throw error;
}
$('#boot').classList.add('done');
$('#synthetic').hidden = !pack.meta.synthetic;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const time = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps });
engine.addTicker((dt) => time.update(dt));
const viewer = new TimeViewer({ engine, element: $('#viewer'), pack, time, display });
engine.add(viewer);
if (!reducedMotion && !params.has('hold')) time.play(1);

// --- panel ---------------------------------------------------------------------------------------

const scrub = $('#scrub') as HTMLInputElement;
scrub.max = String(pack.meta.frameCount - 1);
scrub.oninput = () => time.seek(Number(scrub.value));
const actions: Record<string, () => void> = {
  rewind: () => time.rewind(),
  hold: () => time.hold(),
  forward: () => time.forward(),
  toggle: () => time.togglePlay(),
  prev: () => time.step(-1),
  next: () => time.step(1),
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-act]')) button.onclick = () => actions[button.dataset.act!]();
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name=mode]')) {
  radio.onchange = () => time.setMode(radio.value as 'memory' | 'all');
}
for (const box of document.querySelectorAll<HTMLInputElement>('[data-layer]')) {
  box.onchange = () => viewer.setLayers({ [box.dataset.layer!]: box.checked });
}
($('#stride') as HTMLInputElement).oninput = (event) => viewer.setTrailStride(Number((event.target as HTMLInputElement).value));
($('#light') as HTMLInputElement).onchange = (event) => viewer.setFrustumLight((event.target as HTMLInputElement).checked);
($('#scale') as HTMLInputElement).oninput = (event) => (display.pixelScale = Number((event.target as HTMLInputElement).value));
$('#modes').innerHTML = DISPLAY_MODES.map(
  (m) => `<label><input type="radio" name="display" value="${m.id}" ${m.id === display.mode ? 'checked' : ''}> ${m.label}</label>`,
).join(' ');
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name=display]')) {
  radio.onchange = () => (display.mode = radio.value as DisplayMode);
}

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.type !== 'radio' && event.target.type !== 'checkbox') return;
  const key = event.key.toLowerCase();
  if (key === ' ') actions.toggle();
  else if (key === 'j') actions.rewind();
  else if (key === 'k') actions.hold();
  else if (key === 'l') actions.forward();
  else if (key === 'arrowleft') actions.prev();
  else if (key === 'arrowright') actions.next();
  else return;
  event.preventDefault();
});

const checksOut = $('#checks');
$('#colors').onclick = () => {
  const result = countColors(engine.renderer, viewRect(engine, viewer));
  checksOut.textContent = `distinct colors: ${result.distinct}\n${result.colors.slice(0, 16).map((c) => `${c.hex} ${c.count}`).join('\n')}`;
};
$('#blocks').onclick = () => {
  const rect = viewRect(engine, viewer);
  const result = checkBlocks(engine.renderer, rect, display.blockSize(rect.dpr));
  checksOut.textContent = `blocks ${display.blockSize(rect.dpr)}×: ${result.uniform}/${result.blocks} uniform`;
};

const hud = $('#hud');
const updateHud = () => {
  const s = time.state;
  hud.textContent =
    `${timecode(s.frame, pack.meta.fps)}  ${playbackLabel(s)}  ${s.mode}\n` +
    `frames ${engine.stats.frames}  viewer renders ${engine.rendersOf(viewer)}  display ${display.mode}`;
  if (document.activeElement !== scrub) scrub.value = String(s.frame);
};
time.subscribe(updateHud);
setInterval(updateHud, 250);
updateHud();

Object.assign(window, {
  __4d: {
    ready: true,
    engine,
    time,
    viewer,
    display,
    pack,
    uploads,
    rect: () => viewRect(engine, viewer),
    countColors: () => countColors(engine.renderer, viewRect(engine, viewer)),
    checkBlocks: (block?: number) => {
      const rect = viewRect(engine, viewer);
      return checkBlocks(engine.renderer, rect, block ?? display.blockSize(rect.dpr));
    },
    visibleByFrame: (layer?: 'dynamic' | 'static') => visibleByFrame(engine.renderer, viewer, layer),
    litStats: () => litStats(engine.renderer, viewer),
    drawnPoints: () => drawnPoints(engine.renderer, viewer),
    info: () => ({ ...engine.renderer.info.memory, programs: engine.renderer.info.programs?.length }),
  },
});
