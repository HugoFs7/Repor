import * as THREE from './node_modules/three/build/three.module.js';

const W = 720, H = 1280;
const OUT = '#231b2e';

// ---------- utils ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const seg = (t, a, b) => ease(clamp((t - a) / (b - a)));
const lin = (t, a, b) => clamp((t - a) / (b - a));
const backOut = t => { const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const elastic = t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1;
const L2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(pa >> 16, pb >> 16, t)), g = Math.round(lerp(pa >> 8 & 255, pb >> 8 & 255, t)), bl = Math.round(lerp(pa & 255, pb & 255, t));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}
const f = n => n.toFixed(1);

// ---------- three ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const grad = (() => { const d = new Uint8Array([110, 190, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const EDGE = new THREE.LineBasicMaterial({ color: 0x2a2036 });
const mat = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...o });

function add(g, geo, color, pos, o = {}) {
  const m = new THREE.Mesh(geo, o.material || mat(color, o.m || {}));
  m.position.set(...pos); if (o.rot) m.rotation.set(...o.rot);
  m.castShadow = o.cast !== false; m.receiveShadow = true; g.add(m);
  if (o.edges !== false) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), EDGE));
  return m;
}
// box with y = bottom
const box = (g, w, h, d, c, x, y, z, o) => add(g, new THREE.BoxGeometry(w, h, d), c, [x, y + h / 2, z], o);
const cyl = (g, rt, rb, h, c, x, y, z, o = {}) => add(g, new THREE.CylinderGeometry(rt, rb, h, o.seg || 14), c, [x, y + h / 2, z], o);
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  t.anisotropy = 4; return t;
}
function floorPlane(sc, w, d, tex, color = '#ffffff', y = 0, cx = 0, cz = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color, { map: tex }));
  m.rotation.x = -Math.PI / 2; m.position.set(cx, y, cz); m.receiveShadow = true; sc.add(m); return m;
}
function basicPlane(sc, w, h, tex, pos, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(...pos); m.rotation.set(...rot); sc.add(m); return m;
}
function lights(sc, { hemi = [0xfff6ea, 0x8f7d70, 1.5], sun = [0xfff0d6, 2.3], pos = [3, 6, 5], range = 8 } = {}) {
  const h = new THREE.HemisphereLight(...hemi); sc.add(h);
  const d = new THREE.DirectionalLight(...sun); d.position.set(...pos); d.castShadow = true;
  d.shadow.mapSize.set(1024, 1024); const c = d.shadow.camera; c.left = -range; c.right = range; c.top = range; c.bottom = -range; c.far = 60;
  d.shadow.bias = -0.0008; sc.add(d); sc.add(d.target); return { h, d };
}
const woodTex = (rep) => canvasTex(256, 256, (x, w, h) => {
  for (let i = 0; i < 8; i++) {
    x.fillStyle = ['#c9965f', '#c08b55', '#cf9e68', '#c4905a'][i % 4]; x.fillRect(0, i * 32, w, 32);
    x.strokeStyle = '#8a5d36'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, i * 32); x.lineTo(w, i * 32); x.stroke();
    const off = (i * 97) % w; x.beginPath(); x.moveTo(off, i * 32); x.lineTo(off, i * 32 + 32); x.stroke();
  }
}, rep);
const tileTex = (rep, a = '#ece4d6', b = '#d9cfbd') => canvasTex(128, 128, (x, w, h) => {
  x.fillStyle = a; x.fillRect(0, 0, w, h); x.fillStyle = b; x.fillRect(0, 0, 64, 64); x.fillRect(64, 64, 64, 64);
  x.strokeStyle = '#b9ad98'; x.lineWidth = 3; x.strokeRect(0, 0, 64, 64); x.strokeRect(64, 64, 64, 64); x.strokeRect(64, 0, 64, 64); x.strokeRect(0, 64, 64, 64);
}, rep);
const skyTex = (top, bot, clouds = true) => canvasTex(128, 128, (x, w, h) => {
  const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); x.fillStyle = gr; x.fillRect(0, 0, w, h);
  if (clouds) { x.fillStyle = 'rgba(255,255,255,.9)'; [[40, 50, 18], [58, 44, 22], [78, 52, 16], [95, 90, 12], [110, 86, 15]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }); }
});
function windowsTex(base, lit, dark, cols = 4, rows = 6, litChance = .5, seed = 3) {
  const r = rng(seed);
  return canvasTex(128, 192, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    const cw = w / cols, rh = h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      x.fillStyle = r() < litChance ? lit : dark; x.fillRect(i * cw + cw * .22, j * rh + rh * .2, cw * .56, rh * .55);
      x.strokeStyle = 'rgba(30,20,50,.6)'; x.lineWidth = 2; x.strokeRect(i * cw + cw * .22, j * rh + rh * .2, cw * .56, rh * .55);
    }
  });
}

// ---------- scene: bedroom ----------
function buildQuarto() {
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#e6eef6');
  const L = lights(sc, { pos: [2.5, 5, 4.5] });
  floorPlane(sc, 14, 14, woodTex([5, 5]));
  box(sc, 14, 3.4, .12, '#b7d0ea', 0, 0, -3.1, { cast: false });
  box(sc, .12, 3.4, 12, '#a3bfdd', -3.3, 0, 1, { cast: false });
  box(sc, 14, .14, .06, '#f3efe6', 0, 0, -3.02, { cast: false });
  // window
  basicPlane(sc, 1.3, 1.15, skyTex('#7fc4f2', '#cfeaff'), [1.0, 1.75, -3.02]);
  box(sc, 1.46, .09, .1, '#f7f5ef', 1.0, 1.12, -2.98); box(sc, 1.46, .09, .1, '#f7f5ef', 1.0, 2.33, -2.98);
  box(sc, .09, 1.3, .1, '#f7f5ef', .31, 1.12, -2.98); box(sc, .09, 1.3, .1, '#f7f5ef', 1.69, 1.12, -2.98); box(sc, .05, 1.2, .08, '#f7f5ef', 1.0, 1.15, -2.98);
  box(sc, .32, 1.75, .07, '#f0a9b4', .02, .7, -2.9); box(sc, .32, 1.75, .07, '#f0a9b4', 1.98, .7, -2.9);
  box(sc, 2.3, .06, .1, '#d9d2c4', 1.0, 2.5, -2.9);
  // bed
  box(sc, 2.4, .32, 1.75, '#9a6a45', -2.0, 0, -2.15);
  box(sc, 2.3, .22, 1.65, '#f4f1ea', -2.0, .32, -2.15);
  box(sc, 1.55, .08, 1.69, '#5f7fd6', -1.6, .5, -2.15);
  box(sc, .1, .03, 1.69, '#4a68bf', -2.38, .55, -2.15, { edges: false });
  box(sc, .45, .16, 1.1, '#ffffff', -2.9, .54, -2.15);
  box(sc, .12, 1.05, 1.8, '#8a5c3b', -3.22, 0, -2.15);
  // nightstand + lamp + clock
  box(sc, .5, .55, .45, '#b07b51', -.35, 0, -2.75);
  cyl(sc, .05, .07, .32, '#e9e2d6', -.42, .55, -2.75);
  cyl(sc, .1, .2, .22, '#ffd36b', -.42, .82, -2.75, { m: { emissive: '#7a5a10' } });
  box(sc, .16, .12, .08, '#e2483d', -.18, .55, -2.65);
  // poster above bed
  basicPlane(sc, .8, 1.0, canvasTex(128, 160, (x, w, h) => {
    x.fillStyle = '#2d2350'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffcf3f'; x.beginPath(); x.arc(64, 70, 34, 0, 7); x.fill();
    x.strokeStyle = '#ff7ab8'; x.lineWidth = 8; x.beginPath(); x.ellipse(64, 70, 58, 14, -.3, 0, 7); x.stroke();
    x.fillStyle = '#fff'; for (let i = 0; i < 18; i++) { x.fillRect((i * 53) % 120 + 4, (i * 37) % 150 + 4, 3, 3); }
    x.strokeStyle = '#f3efe6'; x.lineWidth = 8; x.strokeRect(0, 0, w, h);
  }), [-1.9, 1.75, -3.03]);
  // shelf with books
  box(sc, 1.0, .05, .25, '#8a5c3b', -.45, 1.6, -2.95);
  ['#e2483d', '#3e9f6e', '#f2b63d', '#5f7fd6', '#a05fd6'].forEach((c, i) => box(sc, .1, .26 + (i % 2) * .05, .18, c, -.85 + i * .13, 1.65, -2.95));
  // wardrobe
  box(sc, 1.3, 2.2, .6, '#d9b48a', 2.55, 0, -2.75);
  box(sc, .02, 2.0, .02, '#8a5c3b', 2.55, .1, -2.44, { edges: false });
  // standing mirror
  box(sc, .9, 1.9, .08, '#8a5c3b', .75, .05, -2.2, { rot: [0, -.25, 0] });
  basicPlane(sc, .74, 1.7, canvasTex(64, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#d8eefc'); g.addColorStop(1, '#9cc6e6'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 6; x.beginPath(); x.moveTo(8, 50); x.lineTo(40, 18); x.moveTo(14, 70); x.lineTo(54, 30); x.stroke(); }), [.75 - Math.sin(.25) * .05, 1.05, -2.2 + Math.cos(.25) * .05], [0, -.25, 0]);
  box(sc, .5, .05, .3, '#8a5c3b', .75, 0, -2.1, { rot: [0, -.25, 0] });
  // rug
  cyl(sc, 1.15, 1.15, .02, '#8e6fd8', -.6, 0, -.4, { seg: 28, cast: false });
  cyl(sc, .8, .8, .025, '#a98bea', -.6, 0, -.4, { seg: 28, cast: false });
  // slippers
  box(sc, .12, .06, .26, '#ff8fa3', -.25, 0, -.55); box(sc, .12, .06, .26, '#ff8fa3', -.05, 0, -.5);
  return { sc, L };
}

// ---------- scene: living room ----------
function buildSala() {
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#f2e7d8');
  const L = lights(sc, { pos: [3, 7, 4], range: 12, sun: [0xfff2dd, 2.0] });
  floorPlane(sc, 7, 16, woodTex([3, 7]), '#ffffff', 0, 0, -3);
  box(sc, 7, 3.2, .12, '#f0c987', 0, 0, -9.9, { cast: false });
  box(sc, .12, 3.2, 16, '#e9b46f', -2.8, 0, -3, { cast: false });
  box(sc, .12, 3.2, 16, '#f3d39f', 2.8, 0, -3, { cast: false });
  // windows on right wall
  [-1.5, -4.5, -7.2].forEach(z => {
    basicPlane(sc, 1.4, 1.1, skyTex('#7fc4f2', '#d7efff'), [2.73, 1.7, z], [0, -Math.PI / 2, 0]);
    box(sc, .08, .08, 1.5, '#fffaf0', 2.7, 1.12, z); box(sc, .08, .08, 1.5, '#fffaf0', 2.7, 2.24, z);
  });
  // frames on left wall
  [[-2.5, '#5f7fd6'], [-5.5, '#e2483d'], [-8.0, '#3e9f6e']].forEach(([z, c], i) => {
    basicPlane(sc, .9, .7, canvasTex(96, 72, (x, w, h) => { x.fillStyle = '#fff6e6'; x.fillRect(0, 0, w, h); x.fillStyle = c; x.beginPath(); x.moveTo(10, 62); x.lineTo(40, 18); x.lineTo(60, 44); x.lineTo(72, 30); x.lineTo(88, 62); x.fill(); x.strokeStyle = '#5a3d22'; x.lineWidth = 8; x.strokeRect(0, 0, w, h); }), [-2.73, 1.8, z], [0, Math.PI / 2, 0]);
  });
  // rug runner
  box(sc, 2.2, .02, 9, '#c85a5a', .2, 0, -4.2, { cast: false, edges: false });
  box(sc, 1.8, .025, 8.6, '#e07a6a', .2, 0, -4.2, { cast: false, edges: false });
  // sofa (front-left)
  box(sc, 2.1, .42, .95, '#3fa38f', -1.1, 0, .35);
  box(sc, 2.1, .62, .25, '#358b7a', -1.1, .3, -.1);
  box(sc, .22, .62, .95, '#358b7a', -2.25, 0, .35); box(sc, .22, .62, .95, '#358b7a', .05, 0, .35);
  box(sc, .9, .14, .8, '#46b39d', -1.6, .42, .42); box(sc, .9, .14, .8, '#46b39d', -.6, .42, .42);
  box(sc, .4, .35, .12, '#f2c14e', -2.0, .56, .05, { rot: [-.2, 0, .1] });
  // coffee table mid
  box(sc, 1.0, .4, .6, '#9a6a45', .6, 0, -2.6);
  cyl(sc, .12, .1, .12, '#f7f5ef', .45, .4, -2.6); cyl(sc, .02, .02, .25, '#3e9f6e', .45, .52, -2.6);
  // lamp + plant
  cyl(sc, .03, .03, 1.6, '#3a3340', -2.2, 0, -6.5); cyl(sc, .18, .3, .35, '#fff0c2', -2.2, 1.55, -6.5, { m: { emissive: '#6b5a20' } });
  cyl(sc, .22, .18, .4, '#d4774f', 2.3, 0, -8.8);
  add(sc, new THREE.IcosahedronGeometry(.42, 0), '#3e9f6e', [2.3, .8, -8.8]);
  // TV stand far
  box(sc, 2.0, .5, .5, '#6e4a2f', 1.5, 0, -9.45);
  box(sc, 1.6, .9, .08, '#1f1b26', 1.5, .8, -9.6);
  basicPlane(sc, 1.48, .78, canvasTex(64, 32, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#4c7bd9'); g.addColorStop(1, '#9b6bea'); x.fillStyle = g; x.fillRect(0, 0, w, h); }), [1.5, 1.25, -9.55]);
  const remote = box(sc, .28, .05, .1, '#2a2533', 1.0, .5, -9.3);
  return { sc, L, remote };
}

// ---------- scene: street (storm / sun) ----------
function buildRua(mode) {
  const storm = mode === 'storm', retro = mode === '80s';
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(storm ? '#232b4a' : retro ? '#f7c08a' : '#8fd0ff');
  sc.fog = new THREE.Fog(storm ? '#232b4a' : retro ? '#f3cfa2' : '#bfe6ff', 18, 60);
  const L = lights(sc, storm
    ? { hemi: [0x8090c0, 0x302840, 1.0], sun: [0xa8b8ff, .8], pos: [-4, 8, 6], range: 14 }
    : retro ? { hemi: [0xffe6c4, 0x9a7a68, 1.6], sun: [0xffd49a, 2.6], pos: [-6, 7, 5], range: 14 } : { hemi: [0xfff3df, 0x9a8a78, 1.6], sun: [0xffe7b8, 2.8], pos: [-6, 9, 5], range: 14 });
  const road = floorPlane(sc, 7, 90, canvasTex(64, 64, (x, w, h) => { x.fillStyle = storm ? '#2c2a33' : '#4a4752'; x.fillRect(0, 0, w, h); }), '#ffffff', 0, 0, -30);
  // lane marks
  for (let z = 4; z > -60; z -= 4) if (storm || retro || z < -.5 || z > 3.5) box(sc, .14, .01, 1.8, '#f4c430', 0, .005, z, { edges: false, cast: false });
  // sidewalks
  [-1, 1].forEach(s => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(3, .16, 90), mat('#ffffff', { map: tileTex([3, 90], storm ? '#8e8aa0' : retro ? '#e6cfae' : '#ece4d6', storm ? '#7f7b92' : retro ? '#d2b48e' : '#d9cfbd') }));
    sw.position.set(s * 5, .08, -30); sw.receiveShadow = true; sc.add(sw);
    sw.add(new THREE.LineSegments(new THREE.EdgesGeometry(sw.geometry), EDGE));
  });
  // buildings
  const palette = storm ? ['#4b3f78', '#3c4f7a', '#5a3f6e', '#3f5f66', '#6a4a5e'] : retro ? ['#e07a5f', '#f2cc8f', '#81b29a', '#3d8b8b', '#c97b9e', '#d9a05b'] : ['#8e63e8', '#b3a6e6', '#3fb4a0', '#f08a4b', '#ef7fa8', '#7aa8e8'];
  const r = rng(storm ? 11 : 7);
  [-1, 1].forEach(s => {
    let z = 6;
    while (z > -60) {
      const d = 4 + r() * 4, h = 5 + r() * 12, c = palette[Math.floor(r() * palette.length)];
      const tex = windowsTex(c, storm ? '#ffd76b' : retro ? '#ffe3a0' : '#cfe8ff', storm ? '#1d1a2c' : '#4d6ea8', 4, Math.round(h / 2), storm ? .45 : .15, Math.floor(r() * 999));
      const m = new THREE.Mesh(new THREE.BoxGeometry(5, h, d - .2), [mat(c), mat(c), mat(c), mat(c), mat('#ffffff', { map: tex }), mat('#ffffff', { map: tex })]);
      m.position.set(s * 9, h / 2, z - d / 2); m.castShadow = true; m.receiveShadow = true; sc.add(m);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), EDGE));
      const side = new THREE.Mesh(new THREE.PlaneGeometry(d - .2, h), mat('#ffffff', { map: tex }));
      side.rotation.y = -s * Math.PI / 2; side.position.set(s * 6.49, h / 2, z - d / 2); sc.add(side);
      z -= d;
    }
  });
  // street lamps
  for (let z = -5; z > -50; z -= 9) {
    cyl(sc, .05, .07, 4, '#3a3340', 3.8, .16, z);
    box(sc, .9, .06, .1, '#3a3340', 3.4, 4.1, z);
    const bulb = cyl(sc, .14, .2, .14, storm ? '#ffe7a0' : '#f2efe6', 3.0, 3.98, z, { m: storm ? { emissive: '#ffcf55' } : {} });
  }
  // props near character
  cyl(sc, .25, .22, .7, '#3e9f6e', 5.9, .16, -2.4);
  box(sc, .05, 2.6, .05, '#3a3340', 6.0, .16, -4.6); box(sc, .6, .35, .04, '#3f6fd6', 6.0, 2.5, -4.6);
  let car = null;
  if (retro) {
    car = new THREE.Group(); sc.add(car);
    box(car, 2.0, .5, 4.8, '#2f8f8a', 0, .25, 0); box(car, 1.8, .5, 2.2, '#2f8f8a', 0, .75, -.4); box(car, 1.7, .4, .04, '#2b3f66', 0, .8, .72, { edges: false });
    box(car, 2.1, .12, .12, '#d8d8e0', 0, .3, 2.42); box(car, 2.1, .12, .12, '#d8d8e0', 0, .3, -2.42);
    [[-.9, 1.5], [.9, 1.5], [-.9, -1.5], [.9, -1.5]].forEach(([x, z]) => add(car, new THREE.CylinderGeometry(.32, .32, .22, 14), '#1f1b26', [x, .32, z], { rot: [0, 0, Math.PI / 2] }));
    car.position.set(-2.2, 0, -6);
    const neon = (txt, c1) => canvasTex(256, 96, (x, w, h) => { x.fillStyle = '#231b2e'; x.fillRect(0, 0, w, h); x.font = 'bold 54px Inter'; x.textAlign = 'center'; x.shadowColor = c1; x.shadowBlur = 18; x.fillStyle = c1; x.fillText(txt, w / 2, 68); x.strokeStyle = c1; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16); });
    basicPlane(sc, 2.6, 1.0, neon('DISCOS', '#ff5fa2'), [6.4, 3.4, -3.2], [0, -Math.PI / 2, 0]);
    basicPlane(sc, 2.6, 1.0, neon('LANCHES', '#3ff0d8'), [-6.4, 3.0, -9], [0, Math.PI / 2, 0]);
    cyl(sc, .05, .05, 1.3, '#55606f', 5.6, .16, -1.2);
    const dome = add(sc, new THREE.SphereGeometry(.42, 16, 12, 0, Math.PI), '#f08a2c', [5.6, 1.55, -1.2], { rot: [0, Math.PI / 2, 0], m: { side: THREE.DoubleSide } });
  }
  if (!storm && !retro) {
    for (let x = -3.0; x <= 3.0; x += .9) box(sc, .5, .012, 2.2, '#f4f2ea', x, 0, 1.6, { edges: false, cast: false });
    car = new THREE.Group(); sc.add(car);
    box(car, 1.8, .55, 4.0, '#e2483d', 0, .3, 0);
    box(car, 1.55, .55, 2.0, '#e2483d', 0, .85, -.3);
    box(car, 1.45, .45, .04, '#2b3f66', 0, .9, .72, { edges: false, rot: [-.35, 0, 0] });
    box(car, .3, .14, .04, '#fff6c2', -.6, .55, 2.0, { m: { emissive: '#d8c060' } }); box(car, .3, .14, .04, '#fff6c2', .6, .55, 2.0, { m: { emissive: '#d8c060' } });
    box(car, 1.7, .12, .06, '#3a3340', 0, .3, 2.02);
    [[-.85, 1.25], [.85, 1.25], [-.85, -1.25], [.85, -1.25]].forEach(([x, z]) => add(car, new THREE.CylinderGeometry(.34, .34, .24, 14), '#1f1b26', [x, .34, z], { rot: [0, 0, Math.PI / 2] }));
    car.position.set(1.75, 0, -40);
    [[1.0, -6], [-1.2, -14]].forEach(([x, z]) => add(sc, new THREE.ConeGeometry(.18, .45, 8), '#f08a2c', [x, .22, z]));
  }
  return { sc, L, storm, car };
}

// ---------- scene: snow ----------
function buildNeve() {
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#cfe4f5'); sc.fog = new THREE.Fog('#dcebf7', 14, 55);
  const L = lights(sc, { hemi: [0xeaf4ff, 0x9fb4cc, 1.7], sun: [0xf2f7ff, 1.9], pos: [-5, 7, 6], range: 14 });
  floorPlane(sc, 120, 120, canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#f4f8fc'; x.fillRect(0, 0, w, h); }), '#ffffff', 0, 0, -30);
  const r = rng(5);
  for (let i = 0; i < 16; i++) {
    const x = (r() - .5) * 60, z = -14 - r() * 35, h = 4 + r() * 10;
    add(sc, new THREE.ConeGeometry(2 + r() * 5, h, 5), i % 3 ? '#eef5fb' : '#bcd8ee', [x, h / 2, z], { rot: [0, r() * 3, 0] });
  }
  for (let i = 0; i < 14; i++) {
    const x = (r() - .5) * 14, z = -2 - r() * 12;
    if (Math.abs(x - 1.2) < 1.6 && z > -4) continue;
    const s = .3 + r() * .8;
    add(sc, new THREE.IcosahedronGeometry(s, 0), r() > .5 ? '#ffffff' : '#d6e8f5', [x, s * .35, z], { rot: [r(), r(), r()] });
  }
  // ice shards
  [[-2.4, -3.2], [-1.6, -4.0], [3.6, -5.0], [4.2, -3.6]].forEach(([x, z], i) => add(sc, new THREE.ConeGeometry(.35, 1.4 + i * .3, 4), '#a9d4f0', [x, .6 + i * .12, z], { rot: [0, i, .15 * (i % 2 ? 1 : -1)], m: { transparent: true, opacity: .9 } }));
  // research hut
  box(sc, 2.6, 1.6, 2.0, '#f0752e', 3.8, 0, -9);
  add(sc, new THREE.CylinderGeometry(1.5, 1.5, 2.0, 3, 1, false, 0, Math.PI), '#e8e8ee', [3.8, 1.6, -9], { rot: [Math.PI / 2, 0, Math.PI / 2] });
  box(sc, .6, 1.1, .05, '#2f3a55', 3.4, 0, -7.99);
  cyl(sc, .03, .03, 2.6, '#55606f', 5.3, 0, -8.5);
  box(sc, .5, .3, .02, '#3f6fd6', 5.55, 2.2, -8.5);
  return { sc, L };
}

const SCN = { quarto: buildQuarto(), sala: buildSala(), storm: buildRua('storm'), sun: buildRua('sun'), neve: buildNeve() };
const cam = new THREE.PerspectiveCamera(46, W / H, .05, 200);

function project(p) {
  const v = new THREE.Vector3(...p).project(cam);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}
function anchorOf(p) {
  const a = project(p), b = project([p[0], p[1] + 1, p[2]]);
  return { ox: a[0], oy: a[1], s: Math.abs(a[1] - b[1]) };
}

// ---------- 2D character ----------
const SKIN = '#f2c39b', SKIN_D = '#d99d74', HOOD = '#7b48d8', HOOD_D = '#5a2fb0', HOOD_L = '#9a6cf0', PANTS = '#2a2840', PANTS_D = '#1c1a2e', HAIR = '#7a4523', HAIR_D = '#4e2a12';
const q = (p0, c, p1, t) => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]];
function qlen(p0, c, p1) { let l = 0, prev = p0; for (let i = 1; i <= 24; i++) { const p = q(p0, c, p1, i / 24); l += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p; } return l; }
function qsplit(p0, c, p1, t) { return [p0, L2(p0, c, t), q(p0, c, p1, t)]; }
function qnorm(p0, c, p1, t) { const d = [2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]), 2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1])]; const l = Math.hypot(...d) || 1; return [-d[1] / l, d[0] / l]; }
const pth = (p0, c, p1) => `M${f(p0[0])},${f(p0[1])} Q${f(c[0])},${f(c[1])} ${f(p1[0])},${f(p1[1])}`;
function tube(p0, c, p1, w, color, hl, ow = 3.2) {
  const d = pth(p0, c, p1);
  let s = `<path d="${d}" stroke="${OUT}" stroke-width="${f(w + ow * 2)}" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${d}" stroke="${color}" stroke-width="${f(w)}" fill="none" stroke-linecap="round"/>`;
  if (hl && w > 7) s += `<path d="${d}" stroke="${hl}" stroke-width="${f(w * .28)}" fill="none" stroke-linecap="round" transform="translate(${f(-w * .2)},${f(-w * .08)})" opacity=".8"/>`;
  return s;
}
// precomputed crack patterns (in tube coords t, offset)
function makeCracks(seed, n) {
  const r = rng(seed); const out = [];
  for (let i = 0; i < n; i++) {
    const t0 = .25 + r() * .7, o0 = (r() - .5) * .7; const pts = [[t0, o0]];
    let t = t0, o = o0; for (let k = 0; k < 4; k++) { t += (r() - .5) * .12; o += (r() - .5) * .5; pts.push([clamp(t, .05, .98), clamp(o, -.48, .48)]); }
    out.push(pts);
  }
  return out;
}
const CR = { aL: makeCracks(21, 5), aR: makeCracks(22, 5), lL: makeCracks(23, 3), lR: makeCracks(24, 3) };
const FACE_CR = (() => { const r = rng(9); return Array.from({ length: 6 }, () => { const a = r() * Math.PI * 2, d = .45 + r() * .4; let p = [Math.cos(a) * d, Math.sin(a) * d * .9 + .1]; const pts = [p]; for (let k = 0; k < 4; k++) { p = [p[0] + (r() - .5) * .35, p[1] + (r() - .5) * .35]; pts.push(p); } return pts; }); })();

function crackPath(p0, c, p1, w, pts, level, color, sw) {
  const P = pts.map(([t, o]) => { const b = q(p0, c, p1, t), n = qnorm(p0, c, p1, t); return [b[0] + n[0] * o * w, b[1] + n[1] * o * w]; });
  const d = 'M' + P.map(p => f(p[0]) + ',' + f(p[1])).join(' L');
  return `<path d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${f(1 - level)}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
}

/*
  P: ox,oy,s  | hipY, shY | lean(deg) | arms/legs in local meters: armL {h:[x,y], c:[x,y]}
  expr: eyes, mouth, brows, look[dx,dy] | fx: veins, swell, cracks, freeze, glass, zap, hairUp, soot, jitter
*/
function character(P) {
  const s = P.s, ox = P.ox + (P.jx || 0), oy = P.oy + (P.jy || 0);
  const X = x => ox + x * s, Y = y => oy - y * s, V = p => [X(p[0]), Y(p[1])];
  const fz = P.freeze || 0;
  const C = P.c || {};
  const skin = mixHex(C.skin || SKIN, '#bfe4f7', fz), skinD = mixHex(SKIN_D, '#86b9dc', fz), skinHL = mixHex('#ffe0c4', '#f2fbff', fz);
  const hood = mixHex(C.hood || HOOD, '#9fb2ea', fz * .8), hoodD = mixHex(C.hoodD || HOOD_D, '#7488c8', fz * .8), hoodL = mixHex(C.hoodL || HOOD_L, '#c6d3f5', fz * .8);
  const pants = mixHex(C.pants || PANTS, '#6f84b0', fz * .7), hair = mixHex(P.soot ? '#3a2a22' : (C.hair || HAIR), '#d6e6f3', fz), hairD = mixHex(C.hairD || HAIR_D, '#9ab8d2', fz);
  const ow = Math.max(2.4, s * .018);
  const hipY = P.hipY, shY = P.shY;
  const BO = 1 - (P.invis || 0), GH = clamp(((P.invis || 0) - .45) * 2.2);
  const ghost = (d) => GH > 0 ? `<g opacity="${f(GH * .9)}" fill="none" stroke-linecap="round">${d.replace(/STK/g, `stroke="${OUT}" stroke-width="${f(ow * 2.2)}" stroke-dasharray="${f(ow * 3)} ${f(ow * 2.6)}" opacity=".35"`)}${d.replace(/STK/g, `stroke="#ffffff" stroke-width="${f(ow * 1.1)}" stroke-dasharray="${f(ow * 3)} ${f(ow * 2.6)}"`)}</g>` : '';
  let o = '';
  // ground shadow
  if (!P.noShadow) o += `<ellipse cx="${f(X(0))}" cy="${f(oy)}" rx="${f(s * .42)}" ry="${f(s * .07)}" fill="#1a1030" opacity=".22"/>`;
  // legs
  const legW = s * .14 * (1 + (P.swell || 0) * .35);
  const legs = [['L', -1], ['R', 1]].map(([k, sg]) => {
    const lg = P['leg' + k] || {}; const h0 = [sg * .09, hipY + .02], ft = lg.f || [sg * .13, .06], c = lg.c || [sg * .12, (hipY + .06) / 2];
    return { k, sg, a: V(h0), c: V(c), b: V(ft) };
  });
  legs.forEach(L => {
    o += tube(L.a, L.c, L.b, legW, pants, '#3c3a5a', ow);
    if (P.swell) { const m = q(L.a, L.c, L.b, .62); o += `<ellipse cx="${f(m[0])}" cy="${f(m[1])}" rx="${f(legW * (.5 + P.swell * .22))}" ry="${f(legW * (.6 + P.swell * .3))}" fill="${pants}" stroke="${OUT}" stroke-width="${ow}"/><path d="M${f(m[0] - legW * .25)},${f(m[1] - legW * .3)} q${f(legW * .2)},${f(legW * .25)} 0,${f(legW * .55)}" stroke="#4a4870" stroke-width="${f(ow)}" fill="none"/>`; }
  });
  // shoes
  legs.forEach(L => {
    const fx = L.b[0] + L.sg * s * .03, fy = L.b[1] + s * .02;
    o += `<path d="M${f(fx - s * .11)},${f(fy)} q0,${f(-s * .1)} ${f(s * .1)},${f(-s * .1)} q${f(s * .1)},0 ${f(s * .13)},${f(s * .09)} q0,${f(s * .03)} ${f(-s * .04)},${f(s * .03)} z" fill="#f4f2f7" stroke="${OUT}" stroke-width="${ow}" stroke-linejoin="round"/>`;
    o += `<path d="M${f(fx - s * .11)},${f(fy - s * .01)} h${f(s * .19)}" stroke="#b9b4c8" stroke-width="${f(s * .025)}"/>`;
    if (P.skates) [-.07, .07].forEach(d => o += `<circle cx="${f(fx + d * s)}" cy="${f(fy + s * .035)}" r="${f(s * .035)}" fill="#ff5fa2" stroke="${OUT}" stroke-width="${f(ow * .8)}"/>`);
  });
  // upper body group (lean)
  const hx = X(0), hy = Y(hipY);
  o += `<g transform="rotate(${f(P.lean || 0)} ${f(hx)} ${f(hy)})">`;
  // torso hoodie
  const tw = .19, sw2 = .22;
  const torso = `M${f(X(-tw))},${f(Y(hipY - .04))} C${f(X(-tw - .03))},${f(Y(hipY + .2))} ${f(X(-sw2 - .02))},${f(Y(shY - .14))} ${f(X(-sw2 + .02))},${f(Y(shY - .02))} Q${f(X(0))},${f(Y(shY + .08))} ${f(X(sw2 - .02))},${f(Y(shY - .02))} C${f(X(sw2 + .02))},${f(Y(shY - .14))} ${f(X(tw + .03))},${f(Y(hipY + .2))} ${f(X(tw))},${f(Y(hipY - .04))} Z`;
  o += `<path d="${torso}" fill="${hood}" stroke="${OUT}" stroke-width="${ow}" stroke-linejoin="round"/>`;
  o += `<path d="M${f(X(tw * .35))},${f(Y(hipY - .03))} C${f(X(tw + .01))},${f(Y(hipY + .2))} ${f(X(sw2 - .02))},${f(Y(shY - .12))} ${f(X(sw2 - .06))},${f(Y(shY - .02))} L${f(X(sw2 - .02))},${f(Y(shY - .02))} C${f(X(sw2 + .02))},${f(Y(shY - .14))} ${f(X(tw + .03))},${f(Y(hipY + .2))} ${f(X(tw))},${f(Y(hipY - .04))} Z" fill="${hoodD}" opacity=".55"/>`;
  o += `<path d="M${f(X(-tw + .005))},${f(Y(hipY + .03))} L${f(X(tw - .005))},${f(Y(hipY + .03))}" stroke="${hoodD}" stroke-width="${f(s * .05)}"/>`;
  o += `<path d="M${f(X(-tw))},${f(Y(hipY - .04))} L${f(X(tw))},${f(Y(hipY - .04))}" stroke="${OUT}" stroke-width="${ow}"/>`;
  // pocket
  if (!P.jacket) o += `<path d="M${f(X(-.11))},${f(Y(hipY + .06))} L${f(X(-.08))},${f(Y(hipY + .19))} L${f(X(.08))},${f(Y(hipY + .19))} L${f(X(.11))},${f(Y(hipY + .06))}" fill="${hoodL}" stroke="${OUT}" stroke-width="${f(ow * .8)}" opacity=".9"/>`;
  // hood collar + strings
  o += `<path d="M${f(X(-.14))},${f(Y(shY + .0))} Q${f(X(0))},${f(Y(shY - .13))} ${f(X(.14))},${f(Y(shY + .0))} Q${f(X(0))},${f(Y(shY + .07))} ${f(X(-.14))},${f(Y(shY))} Z" fill="${hoodD}" stroke="${OUT}" stroke-width="${ow}"/>`;
  if (P.jacket) { o += `<path d="M${f(X(-.2))},${f(Y(shY - .2))} L${f(X(.2))},${f(Y(hipY + .22))} L${f(X(.2))},${f(Y(hipY + .32))} L${f(X(-.2))},${f(Y(shY - .1))} Z" fill="${C.stripe || '#ff5fa2'}" stroke="${OUT}" stroke-width="${f(ow * .7)}"/><path d="M${f(X(0))},${f(Y(shY - .04))} V${f(Y(hipY - .03))}" stroke="${OUT}" stroke-width="${f(ow * .8)}"/>`; }
  else [-.05, .05].forEach(dx => o += `<path d="M${f(X(dx))},${f(Y(shY - .06))} l${f(dx * s * .2)},${f(s * .17)}" stroke="#f4f2f7" stroke-width="${f(ow * .9)}" stroke-linecap="round"/>`);
  if (P.veins) o += `<path d="M${f(X(-.04))},${f(Y(shY + .02))} q${f(s * .02)},${f(-s * .05)} 0,${f(-s * .09)}" stroke="#6a52c8" stroke-width="${f(ow * P.veins)}" fill="none"/>`;
  // neck
  if (BO > 0) o += `<rect opacity="${f(BO)}" x="${f(X(-.055))}" y="${f(Y(shY + .07))}" width="${f(s * .11)}" height="${f(s * .08)}" fill="${skinD}" stroke="${OUT}" stroke-width="${ow}"/>`;
  // arms
  const arms = [['L', -1], ['R', 1]].map(([k, sg]) => {
    const A = P['arm' + k] || {}; const sh = [sg * (sw2 - .04), shY - .07];
    const h = A.h || [sg * .3, hipY + .02], c = A.c || [sg * .3, (shY + hipY) / 2];
    let hh = h, c2 = c;
    if (!P.rubber) { const dx = h[0] - sh[0], dy = h[1] - sh[1], d = Math.hypot(dx, dy), mx = .62; if (d > mx) { hh = [sh[0] + dx * mx / d, sh[1] + dy * mx / d]; c2 = [sh[0] + (c[0] - sh[0]) * mx / d, sh[1] + (c[1] - sh[1]) * mx / d]; } }
    const a = V(sh), cc = V(c2), b = V(hh);
    const len = qlen(a, cc, b) / s; const w = s * clamp(.1 * Math.sqrt(.6 / Math.max(len, .3)), .022, .12) * (A.wMul || 1);
    return { k, sg, a, c: cc, b, len, w, sleeve: clamp(.3 / Math.max(len, .3), 0, .62) };
  });
  const armSVG = (A) => {
    let t = `<g opacity="${f(BO)}">` + tube(A.a, A.c, A.b, A.w, skin, skinHL, ow);
    if (P.veins) {
      [.55, .75, .9].forEach((tt, i) => { const m = q(A.a, A.c, A.b, tt); const n = qnorm(A.a, A.c, A.b, tt); const rr = A.w * (.18 + .28 * P.veins) * (i === 1 ? 1.2 : 1); t += `<circle cx="${f(m[0] + n[0] * A.w * .3)}" cy="${f(m[1] + n[1] * A.w * .3)}" r="${f(rr)}" fill="#8b6fe0" stroke="${OUT}" stroke-width="${f(ow * .7)}" opacity="${f(clamp(P.veins * 1.4))}"/>`; });
      t += `<path d="${pth(...qsplit(A.a, A.c, A.b, .95))}" stroke="#6a52c8" stroke-width="${f(A.w * .14 * P.veins)}" fill="none" transform="translate(${f(A.w * .12)},0)" opacity="${f(P.veins)}"/>`;
    }
    if (P.cracks) (A.k === 'L' ? CR.aL : CR.aR).forEach((pts, i) => t += crackPath(A.a, A.c, A.b, A.w, pts, clamp(P.cracks * 1.6 - i * .15), '#5a3020', f(Math.max(1.4, ow * .6))));
    if (P.glass) (A.k === 'L' ? CR.aL : CR.aR).forEach((pts, i) => { t += crackPath(A.a, A.c, A.b, A.w, pts, clamp(P.glass * 1.6 - i * .12), '#ffffff', f(ow * 1.1)); t += crackPath(A.a, A.c, A.b, A.w, pts, clamp(P.glass * 1.6 - i * .12), '#4f86b8', f(ow * .45)); });
    t += '</g>';
    const [p0, c0, p1] = qsplit(A.a, A.c, A.b, A.sleeve);
    const sw3 = Math.max(A.w * 1.3, s * .12);
    t += tube(p0, c0, p1, sw3, hood, hoodL, ow);
    t += `<path d="${pth(q(A.a, A.c, A.b, Math.max(0, A.sleeve - .07)), q(A.a, A.c, A.b, Math.max(0, A.sleeve - .035)), q(A.a, A.c, A.b, A.sleeve))}" stroke="${hoodD}" stroke-width="${f(sw3)}" fill="none" stroke-linecap="butt"/>`;
    // hand
    const hr = Math.max(s * .062, A.w * .75);
    const dir = qnorm(A.a, A.c, A.b, .99);
    t += ghost(`<circle cx="${f(A.b[0])}" cy="${f(A.b[1])}" r="${f(hr)}" STK/>`);
    t += `<g opacity="${f(BO)}">`;
    t += `<circle cx="${f(A.b[0])}" cy="${f(A.b[1])}" r="${f(hr)}" fill="${skin}" stroke="${OUT}" stroke-width="${ow}"/>`;
    t += `<circle cx="${f(A.b[0] + dir[0] * hr * .85 * -A.sg)}" cy="${f(A.b[1] + dir[1] * hr * .85 * -A.sg)}" r="${f(hr * .42)}" fill="${skin}" stroke="${OUT}" stroke-width="${f(ow * .8)}"/></g>`;
    if (P.holdRemote && A.k === 'R') t += `<rect x="${f(A.b[0] - hr * .4)}" y="${f(A.b[1] - hr * 1.7)}" width="${f(hr * .8)}" height="${f(hr * 2.0)}" rx="${f(hr * .2)}" fill="#2a2533" stroke="${OUT}" stroke-width="${f(ow * .7)}"/><circle cx="${f(A.b[0])}" cy="${f(A.b[1] - hr * 1.35)}" r="${f(hr * .16)}" fill="#e2483d"/>`;
    return t;
  };
  arms.forEach(A => o += armSVG(A));
  // head
  const hc = [X(P.headX || 0), Y(shY + .3)], r = s * .23;
  o += `<g transform="rotate(${f(P.headTilt || 0)} ${f(hc[0])} ${f(hc[1] + r)})"><g opacity="${f(BO)}">`;
  [-1, 1].forEach(sg => o += `<ellipse cx="${f(hc[0] + sg * r * .98)}" cy="${f(hc[1] + r * .1)}" rx="${f(r * .17)}" ry="${f(r * .22)}" fill="${skin}" stroke="${OUT}" stroke-width="${ow}"/>`);
  o += `<circle cx="${f(hc[0])}" cy="${f(hc[1])}" r="${f(r)}" fill="${skin}" stroke="${OUT}" stroke-width="${ow}"/>`;
  o += `<path d="M${f(hc[0] + r * .55)},${f(hc[1] - r * .75)} A${f(r)},${f(r)} 0 0 1 ${f(hc[0] + r * .2)},${f(hc[1] + r * .98)} A${f(r * 1.1)},${f(r * 1.1)} 0 0 0 ${f(hc[0] + r * .55)},${f(hc[1] - r * .75)} Z" fill="${skinD}" opacity=".45"/>`;
  if (P.soot) o += `<circle cx="${f(hc[0])}" cy="${f(hc[1])}" r="${f(r * .96)}" fill="#3a2c2c" opacity="${f(P.soot * .35)}"/>`;
  // face features
  const E = P.eyes || 'open', lk = P.look || [0, 0];
  const ey = hc[1] + r * .05, ex = r * .36, erx = r * .2, ery = r * .27;
  [-1, 1].forEach(sg => {
    const cx = hc[0] + sg * ex;
    if (E === 'closed') o += `<path d="M${f(cx - erx)},${f(ey)} q${f(erx)},${f(ery * .7)} ${f(erx * 2)},0" stroke="${OUT}" stroke-width="${f(ow * 1.1)}" fill="none" stroke-linecap="round"/>`;
    else if (E === 'dizzy') o += `<path d="M${f(cx)},${f(ey)} m${f(-erx * .2)},0 a${f(erx * .2)},${f(erx * .2)} 0 1 1 ${f(erx * .4)},0 a${f(erx * .45)},${f(erx * .45)} 0 1 1 ${f(-erx * .85)},0 a${f(erx * .75)},${f(erx * .75)} 0 1 1 ${f(erx * 1.4)},0" stroke="${OUT}" stroke-width="${f(ow * .9)}" fill="none"/>`;
    else {
      const big = E === 'wide' ? 1.25 : 1;
      o += `<ellipse cx="${f(cx)}" cy="${f(ey)}" rx="${f(erx * big)}" ry="${f(ery * big)}" fill="#fff" stroke="${OUT}" stroke-width="${ow}"/>`;
      const pr = E === 'wide' ? erx * .38 : erx * .55;
      o += `<circle cx="${f(cx + lk[0] * erx * .45)}" cy="${f(ey + lk[1] * ery * .45)}" r="${f(pr)}" fill="${OUT}"/><circle cx="${f(cx + lk[0] * erx * .45 - pr * .35)}" cy="${f(ey + lk[1] * ery * .45 - pr * .35)}" r="${f(pr * .3)}" fill="#fff"/>`;
      if (E === 'sleepy') o += `<path d="M${f(cx - erx * 1.1)},${f(ey + ery * .1)} L${f(cx - erx * 1.1)},${f(ey - ery * 1.2)} L${f(cx + erx * 1.1)},${f(ey - ery * 1.2)} L${f(cx + erx * 1.1)},${f(ey + ery * .1)} Z" fill="${skin}"/><path d="M${f(cx - erx * 1.05)},${f(ey + ery * .1)} L${f(cx + erx * 1.05)},${f(ey + ery * .1)}" stroke="${OUT}" stroke-width="${f(ow * 1.1)}" stroke-linecap="round"/>`;
    }
    // brows
    const B = P.brows || 'neutral';
    const by = ey - ery * (E === 'wide' ? 1.75 : 1.45) - (B === 'raised' ? r * .08 : 0);
    const tilt = B === 'worried' ? -sg * r * .08 : B === 'angry' ? sg * r * .08 : 0;
    o += `<path d="M${f(cx - erx)},${f(by - tilt)} L${f(cx + erx)},${f(by + tilt)}" stroke="${hairD}" stroke-width="${f(ow * 1.6)}" stroke-linecap="round"/>`;
  });
  // nose
  o += `<path d="M${f(hc[0] + r * .02)},${f(hc[1] + r * .2)} q${f(r * .1)},${f(r * .1)} 0,${f(r * .18)}" stroke="${skinD}" stroke-width="${f(ow * .9)}" fill="none" stroke-linecap="round"/>`;
  // mouth
  const M = P.mouth || 'smile', my = hc[1] + r * .55, mx = hc[0];
  if (M === 'smile') o += `<path d="M${f(mx - r * .25)},${f(my - r * .04)} q${f(r * .25)},${f(r * .2)} ${f(r * .5)},0" stroke="${OUT}" stroke-width="${f(ow * 1.1)}" fill="none" stroke-linecap="round"/>`;
  else if (M === 'grin') o += `<path d="M${f(mx - r * .3)},${f(my - r * .08)} q${f(r * .3)},${f(r * .38)} ${f(r * .6)},0 z" fill="#6b1f2e" stroke="${OUT}" stroke-width="${ow}" stroke-linejoin="round"/><path d="M${f(mx - r * .24)},${f(my - r * .05)} h${f(r * .48)}" stroke="#fff" stroke-width="${f(r * .07)}"/>`;
  else if (M === 'yawn') o += `<ellipse cx="${f(mx)}" cy="${f(my)}" rx="${f(r * .16)}" ry="${f(r * .22)}" fill="#6b1f2e" stroke="${OUT}" stroke-width="${ow}"/><ellipse cx="${f(mx)}" cy="${f(my + r * .12)}" rx="${f(r * .1)}" ry="${f(r * .07)}" fill="#e2687a"/>`;
  else if (M === 'o') o += `<ellipse cx="${f(mx)}" cy="${f(my)}" rx="${f(r * .1)}" ry="${f(r * .13)}" fill="#6b1f2e" stroke="${OUT}" stroke-width="${ow}"/>`;
  else if (M === 'shock') o += `<path d="M${f(mx - r * .22)},${f(my - r * .1)} h${f(r * .44)} q${f(r * .04)},${f(r * .3)} ${f(-r * .22)},${f(r * .3)} q${f(-r * .26)},0 ${f(-r * .22)},${f(-r * .3)} z" fill="#6b1f2e" stroke="${OUT}" stroke-width="${ow}" stroke-linejoin="round"/>`;
  else if (M === 'worried') o += `<path d="M${f(mx - r * .25)},${f(my + r * .04)} q${f(r * .12)},${f(-r * .12)} ${f(r * .25)},0 t${f(r * .25)},0" stroke="${OUT}" stroke-width="${f(ow * 1.1)}" fill="none" stroke-linecap="round"/>`;
  else o += `<path d="M${f(mx - r * .18)},${f(my)} h${f(r * .36)}" stroke="${OUT}" stroke-width="${f(ow * 1.1)}" stroke-linecap="round"/>`;
  // forehead veins
  if (P.veins) o += `<path d="M${f(hc[0] - r * .55)},${f(hc[1] - r * .62)} l${f(r * .1)},${f(r * .1)} l${f(-r * .05)},${f(r * .1)} M${f(hc[0] - r * .45)},${f(hc[1] - r * .55)} l${f(r * .12)},${f(-r * .02)}" stroke="#6a52c8" stroke-width="${f(ow * P.veins)}" fill="none" stroke-linecap="round"/>`;
  // face cracks
  if (P.cracks) FACE_CR.forEach((pts, i) => { const lv = clamp(P.cracks * 1.5 - i * .12); o += `<path d="M${pts.map(p => f(hc[0] + p[0] * r) + ',' + f(hc[1] + p[1] * r)).join(' L')}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${f(1 - lv)}" stroke="#5a3020" stroke-width="${f(Math.max(1.4, ow * .6))}" fill="none" stroke-linejoin="round"/>`; });
  if (P.glass) FACE_CR.forEach((pts, i) => { const lv = clamp(P.glass * 1.5 - i * .1); const d = `M${pts.map(p => f(hc[0] + p[0] * r) + ',' + f(hc[1] + p[1] * r)).join(' L')}`; o += `<path d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${f(1 - lv)}" stroke="#fff" stroke-width="${f(ow * 1.1)}" fill="none"/><path d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${f(1 - lv)}" stroke="#4f86b8" stroke-width="${f(ow * .45)}" fill="none"/>`; });
  // hair (quiff)
  const R = (x, y) => `${f(hc[0] + x * r)},${f(hc[1] + y * r)}`;
  if (P.hairStyle === 'curly') {
    let d = ''; for (let i = 0; i <= 9; i++) { const a = Math.PI * (1.02 + i / 9 * .96); d += `<circle cx="${f(hc[0] + Math.cos(a) * r * 1.0)}" cy="${f(hc[1] + Math.sin(a) * r * .95 - r * .12)}" r="${f(r * .36)}"/>`; }
    d += `<circle cx="${f(hc[0])}" cy="${f(hc[1] - r * .9)}" r="${f(r * .5)}"/><circle cx="${f(hc[0] - r * .45)}" cy="${f(hc[1] - r * .8)}" r="${f(r * .45)}"/><circle cx="${f(hc[0] + r * .45)}" cy="${f(hc[1] - r * .8)}" r="${f(r * .45)}"/>`;
    o += `<g fill="${OUT}" transform="translate(0,0)">${d.replace(/r="([0-9.]+)"/g, (m, v) => `r="${f(+v + ow)}"`)}</g><g fill="${hair}">${d}</g>`;
  } else if (P.hairUp) {
    const k = P.hairUp; let d = `M${R(-1.0, -.05)} `;
    const spikes = 7; for (let i = 0; i <= spikes; i++) { const a = Math.PI + i / spikes * Math.PI; const bx = Math.cos(a) * 1.0, byy = Math.sin(a) * 1.0; const tx = Math.cos(a) * (1.0 + .8 * k), ty = Math.sin(a) * (1.0 + .8 * k) - .15 * k; d += `L${R(tx, ty)} L${R(Math.cos(a + Math.PI / spikes / 2) * .95, Math.sin(a + Math.PI / spikes / 2) * .95 - .05)} `; }
    d += `L${R(1.0, -.05)} Q${R(.3, -.55)} ${R(-1.0, -.05)} Z`;
    o += `<path d="${d}" fill="${hair}" stroke="${OUT}" stroke-width="${ow}" stroke-linejoin="round"/>`;
  } else {
    o += `<path d="M${R(-1.02, .05)} C${R(-1.12, -.75)} ${R(-.45, -1.2)} ${R(.15, -1.08)} C${R(.35, -1.55)} ${R(1.05, -1.75)} ${R(1.25, -1.15)} C${R(1.35, -.8)} ${R(1.12, -.45)} ${R(1.0, -.02)} C${R(.85, -.38)} ${R(.55, -.5)} ${R(.2, -.48)} C${R(-.2, -.5)} ${R(-.6, -.38)} ${R(-.78, .02)} C${R(-.86, -.05)} ${R(-.95, 0)} ${R(-1.02, .05)} Z" fill="${hair}" stroke="${OUT}" stroke-width="${ow}" stroke-linejoin="round"/>`;
    o += `<path d="M${R(.0, -.75)} C${R(.25, -1.2)} ${R(.75, -1.42)} ${R(1.05, -1.2)}" stroke="${hairD}" stroke-width="${f(ow * 1.2)}" fill="none" stroke-linecap="round"/><path d="M${R(-.5, -.6)} C${R(-.3, -.95)} ${R(.1, -1.0)} ${R(.35, -.95)}" stroke="${hairD}" stroke-width="${f(ow)}" fill="none" stroke-linecap="round"/>`;
    o += `<path d="M${R(.55, -1.35)} C${R(.75, -1.48)} ${R(.95, -1.4)} ${R(1.05, -1.25)}" stroke="#a8693d" stroke-width="${f(ow * 1.4)}" fill="none" stroke-linecap="round" opacity="${f(1 - fz)}"/>`;
  }
  if (P.headband) o += `<path d="M${f(hc[0] - r * 1.02)},${f(hc[1] - r * .3)} Q${f(hc[0])},${f(hc[1] - r * 1.25)} ${f(hc[0] + r * 1.02)},${f(hc[1] - r * .3)}" stroke="${OUT}" stroke-width="${f(r * .26)}" fill="none"/><path d="M${f(hc[0] - r * 1.02)},${f(hc[1] - r * .3)} Q${f(hc[0])},${f(hc[1] - r * 1.25)} ${f(hc[0] + r * 1.02)},${f(hc[1] - r * .3)}" stroke="${P.headband}" stroke-width="${f(r * .17)}" fill="none"/>`;
  if (P.hoops) [-1, 1].forEach(sg => o += `<circle cx="${f(hc[0] + sg * r * 1.0)}" cy="${f(hc[1] + r * .42)}" r="${f(r * .17)}" fill="none" stroke="${OUT}" stroke-width="${f(ow * 1.9)}"/><circle cx="${f(hc[0] + sg * r * 1.0)}" cy="${f(hc[1] + r * .42)}" r="${f(r * .17)}" fill="none" stroke="${P.hoops}" stroke-width="${f(ow * .9)}"/>`);
  if (P.mustache) o += `<path d="M${f(hc[0] - r * .3)},${f(hc[1] + r * .5)} q${f(r * .15)},${f(-r * .17)} ${f(r * .3)},${f(-r * .08)} q${f(r * .15)},${f(-r * .09)} ${f(r * .3)},${f(r * .08)} q${f(-r * .3)},${f(r * .02)} ${f(-r * .6)},0 Z" fill="${P.mustache}" stroke="${OUT}" stroke-width="${f(ow * .8)}" stroke-linejoin="round"/>`;
  if (P.shades) { [-1, 1].forEach(sg => o += `<path d="M${f(hc[0] + sg * r * .1)},${f(hc[1] - r * .12)} h${f(sg * r * .5)} q0,${f(r * .38)} ${f(-sg * r * .28)},${f(r * .36)} q${f(-sg * r * .22)},0 ${f(-sg * r * .22)},${f(-r * .36)} Z" fill="#1d1a2c" stroke="${OUT}" stroke-width="${f(ow)}" stroke-linejoin="round"/><path d="M${f(hc[0] + sg * r * .5)},${f(hc[1] - r * .05)} l${f(sg * r * .06)},${f(r * .08)}" stroke="#fff" stroke-width="${f(ow)}"/>`); o += `<path d="M${f(hc[0] - r * .1)},${f(hc[1] - r * .1)} h${f(r * .2)}" stroke="${OUT}" stroke-width="${f(ow * 1.2)}"/>`; }
  if (P.phones) { o += `<path d="M${f(hc[0] - r * 1.05)},${f(hc[1])} C${f(hc[0] - r * 1.15)},${f(hc[1] - r * 1.9)} ${f(hc[0] + r * 1.15)},${f(hc[1] - r * 1.9)} ${f(hc[0] + r * 1.05)},${f(hc[1])}" stroke="${OUT}" stroke-width="${f(ow * 2.6)}" fill="none"/><path d="M${f(hc[0] - r * 1.05)},${f(hc[1])} C${f(hc[0] - r * 1.15)},${f(hc[1] - r * 1.9)} ${f(hc[0] + r * 1.15)},${f(hc[1] - r * 1.9)} ${f(hc[0] + r * 1.05)},${f(hc[1])}" stroke="#c9c6d4" stroke-width="${f(ow * 1.2)}" fill="none"/>`; [-1, 1].forEach(sg => o += `<rect x="${f(hc[0] + sg * r * 1.05 - r * .14)}" y="${f(hc[1] - r * .1)}" width="${f(r * .28)}" height="${f(r * .4)}" rx="${f(r * .1)}" fill="#ff9a3c" stroke="${OUT}" stroke-width="${f(ow)}"/>`); }
  if (fz > .3) { o += `<path d="M${R(-.6, .85)} l${f(r * .05)},${f(r * .22)} l${f(r * .05)},${f(-r * .2)} M${R(.35, .9)} l${f(r * .04)},${f(r * .18)} l${f(r * .04)},${f(-r * .16)}" fill="#e8f6ff" stroke="#6aa0c8" stroke-width="1.5" opacity="${f(fz)}"/>`; }
  o += `</g>` + ghost(`<circle cx="${f(hc[0])}" cy="${f(hc[1])}" r="${f(r)}" STK/><path d="M${f(hc[0] - r * .55)},${f(hc[1] - r * .82)} C${f(hc[0])},${f(hc[1] - r * 1.5)} ${f(hc[0] + r * .9)},${f(hc[1] - r * 1.75)} ${f(hc[0] + r * 1.1)},${f(hc[1] - r * 1.2)}" STK/>`) + `</g></g>`;
  if (P.zap) {
    return `<g filter="url(#zapglow)">${o}</g>`;
  }
  return o;
}

// ---------- overlays helpers ----------
function bolt(x0, y0, x1, y1, seed, w) {
  const r = rng(seed); let pts = [[x0, y0]]; const n = 9;
  for (let i = 1; i < n; i++) { const t = i / n; pts.push([lerp(x0, x1, t) + (r() - .5) * 70, lerp(y0, y1, t)]); }
  pts.push([x1, y1]);
  const d = 'M' + pts.map(p => f(p[0]) + ',' + f(p[1])).join(' L');
  return `<path d="${d}" stroke="#7fd8ff" stroke-width="${w * 2.6}" fill="none" opacity=".55" stroke-linejoin="round"/><path d="${d}" stroke="#fffbe0" stroke-width="${w}" fill="none" stroke-linejoin="round"/>`;
}
function sfx(text, x, y, size, rot, fill = '#ffd23f', k = 1) {
  const sc = backOut(clamp(k));
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${rot}) scale(${f(sc)})"><text x="0" y="0" text-anchor="middle" font-family="Inter" font-weight="900" font-style="italic" font-size="${size}" fill="${fill}" stroke="${OUT}" stroke-width="${size * .14}" paint-order="stroke" stroke-linejoin="round">${text}</text></g>`;
}
function card(x, y, w, h, inner, k = 1, rot = 0) {
  const sc = backOut(clamp(k));
  return `<g transform="translate(${f(x + w / 2)},${f(y + h / 2)}) rotate(${rot}) scale(${f(sc)}) translate(${f(-w / 2)},${f(-h / 2)})" opacity="${f(clamp(k * 3))}"><rect x="6" y="7" width="${w}" height="${h}" fill="${OUT}"/><rect x="0" y="0" width="${w}" height="${h}" fill="#fbf7ee" stroke="${OUT}" stroke-width="4"/>${inner}</g>`;
}
const T = (x, y, s, txt, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || 'middle'}" font-family="Inter" font-weight="${o.w || 800}" ${o.i ? 'font-style="italic"' : ''} font-size="${s}" fill="${o.c || OUT}" ${o.st ? `stroke="${o.st}" stroke-width="${o.sw || 6}" paint-order="stroke" stroke-linejoin="round"` : ''} letter-spacing="${o.ls || 0}">${txt}</text>`;

const LOGO = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><circle cx="0" cy="0" r="11" fill="none" stroke="#7b48d8" stroke-width="4.5"/><path d="M7,7 L13,13" stroke="#7b48d8" stroke-width="5" stroke-linecap="round"/><ellipse cx="0" cy="0" rx="6.5" ry="4.2" fill="#fff" stroke="#231b2e" stroke-width="1.6"/><circle cx="0.5" cy="0" r="2.4" fill="#231b2e"/></g>`;

// ---------- space scene ----------
function buildEspaco() {
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#06041a');
  sc.add(new THREE.AmbientLight(0x6a6aa0, .5));
  const sunL = new THREE.DirectionalLight(0xfff2d0, 3.2); sunL.position.set(-30, 8, 10); sc.add(sunL);
  const r = rng(99), pos = [];
  for (let i = 0; i < 900; i++) { const a = r() * Math.PI * 2, b = Math.acos(2 * r() - 1), R = 90; pos.push(R * Math.sin(b) * Math.cos(a), R * Math.cos(b), R * Math.sin(b) * Math.sin(a)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sc.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false })));
  const earthTex = canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = '#2f6fd8'; x.fillRect(0, 0, w, h);
    const rr = rng(4); x.fillStyle = '#4fb05a';
    for (let i = 0; i < 9; i++) { const cx = rr() * w, cy = 20 + rr() * (h - 40); x.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28, d = 10 + rr() * 22; x.lineTo(cx + Math.cos(a) * d * 1.4, cy + Math.sin(a) * d); } x.fill(); }
    x.fillStyle = '#f4f8ff'; x.fillRect(0, 0, w, 10); x.fillRect(0, h - 10, w, 10);
    x.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 14; i++) { x.beginPath(); x.ellipse(rr() * w, rr() * h, 14 + rr() * 16, 4, 0, 0, 7); x.fill(); }
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(3, 40, 28), mat('#ffffff', { map: earthTex }));
  sc.add(earth);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(.8, 20, 14), mat('#c9c6d4')); sc.add(moon);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffd23f' })); sun.position.set(-45, 12, -70); sc.add(sun);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(7.5, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffb81f', transparent: true, opacity: .25 })); halo.position.copy(sun.position); sc.add(halo);
  return { sc, earth, moon };
}
SCN.espaco = buildEspaco();

// ---------- timeline ----------
function phone(x, y, s, rot = 0, broken = false) {
  const w = s * .085, h = s * .16;
  let cr = '';
  if (broken) cr = `<path d="M${f(-w * .1)},${f(-h * .1)} l${f(w * .3)},${f(-h * .25)} M${f(-w * .1)},${f(-h * .1)} l${f(-w * .32)},${f(h * .12)} M${f(-w * .1)},${f(-h * .1)} l${f(w * .2)},${f(h * .35)} M${f(-w * .1)},${f(-h * .1)} l${f(-w * .25)},${f(-h * .3)}" stroke="#fff" stroke-width="2" fill="none"/>`;
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${f(rot)})"><rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(w * .18)}" fill="#2a2533" stroke="${OUT}" stroke-width="3"/><rect x="${f(-w / 2 + 3)}" y="${f(-h / 2 + 4)}" width="${f(w - 6)}" height="${f(h - 8)}" rx="${f(w * .1)}" fill="${broken ? '#3a4a6a' : '#5f8fe8'}"/>${cr}</g>`;
}
function clockFace(cx, cy, R, ang, k = 1) {
  let ticks = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ticks += `<path d="M${f(cx + Math.sin(a) * R * .78)},${f(cy - Math.cos(a) * R * .78)} L${f(cx + Math.sin(a) * R * .9)},${f(cy - Math.cos(a) * R * .9)}" stroke="${OUT}" stroke-width="${i % 3 ? 3 : 6}"/>`; }
  const hand = (a, l, w) => `<path d="M${cx},${cy} L${f(cx + Math.sin(a) * l)},${f(cy - Math.cos(a) * l)}" stroke="${OUT}" stroke-width="${w}" stroke-linecap="round"/>`;
  return `<g opacity="${f(k)}"><circle cx="${cx}" cy="${cy}" r="${f(R * 1.25)}" fill="url(#portal)"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="#fbf7ee" stroke="${OUT}" stroke-width="6"/>${ticks}${hand(ang / 12, R * .5, 9)}${hand(ang, R * .75, 5)}<circle cx="${cx}" cy="${cy}" r="8" fill="#e2483d" stroke="${OUT}" stroke-width="3"/>
  <path d="M${f(cx - R * 1.05)},${f(cy - R * .35)} a${f(R * 1.1)},${f(R * 1.1)} 0 0 1 ${f(R * .5)},${f(-R * .75)}" stroke="#ffd23f" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M${f(cx - R * 1.12)},${f(cy - R * .62)} l${f(R * .07)},${f(R * .3)} l${f(R * .22)},${f(-R * .15)}" fill="#ffd23f" stroke="${OUT}" stroke-width="2"/></g>`;
}
function vhs(lt, label) {
  let o = '';
  for (let i = 0; i < 5; i++) { const y = ((lt * 900 + i * 260) % 1400) - 60; o += `<rect x="0" y="${f(y)}" width="720" height="${12 + (i % 3) * 8}" fill="#ffffff" opacity=".18"/>`; }
  for (let y = 0; y < 1280; y += 6) o += `<rect x="0" y="${y}" width="720" height="2" fill="#000" opacity=".08"/>`;
  o += T(48, 300, 40, label, { w: 900, a: 'start', c: '#fff', st: OUT, sw: 9 });
  return o;
}
function bubble(x, y, w, lines, k, tailTo) {
  const h = 26 + lines.length * 36, sc = backOut(clamp(k));
  return `<g transform="translate(${f(x)},${f(y)}) scale(${f(sc)})" opacity="${f(clamp(k * 3))}"><path d="M${f(-w / 2 + 30)},${f(h / 2 - 4)} L${f(tailTo[0] - x)},${f(tailTo[1] - y)} L${f(-w / 2 + 80)},${f(h / 2 - 4)} Z" fill="#fbf7ee" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/><rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${w}" height="${h}" rx="28" fill="#fbf7ee" stroke="${OUT}" stroke-width="4"/><rect x="${f(-w / 2 + 24)}" y="${f(h / 2 - 8)}" width="66" height="10" fill="#fbf7ee"/>${lines.map((l, i) => T(0, f(-h / 2 + 46 + i * 36), 30, l, { w: 900, i: 1 })).join('')}</g>`;
}


SCN.retro = buildRua('80s');
// ---------- timeline ----------
const SCENES = [
  { id: 's1', a: 0, b: 4.2, cap: ['O CAIO ACHOU ISSO NA RUA...'], sub: 'O Caio achou um aparelho estranho no meio da rua.' },
  { id: 's2', a: 4.2, b: 7.4, cap: ['ELE APERTOU O BOTÃO'], sub: 'Ele aperta o botão... e nada parece mudar.' },
  { id: 's3', a: 7.4, b: 11.2, cap: ['ELE NÃO PERCEBEU NADA'], sub: 'Mas o celular fica sem sinal. E a rua parece antiga.' },
  { id: 's4', a: 11.2, b: 15.8, cap: ['ELE SÓ PEDIU INFORMAÇÃO'], sub: 'O Caio pede informação. O moço se distrai e cai feio.' },
  { id: 's5', a: 15.8, b: 20.8, cap: ['ERA O AVÔ DO CAIO'], sub: 'No documento: nascido em 1962. É o avô do Caio.' },
  { id: 'sG', a: 20.8, b: 25.8, cap: ['AÍ CHEGOU A AVÓ DELE'], sub: 'Aí chega uma moça pra ajudar. É a avó do Caio!' },
  { id: 'sR', a: 25.8, b: 30.0, cap: ['ESTAVA TUDO ESCRITO'], sub: 'Foi assim que eles se conheceram. Nada podia ser mudado.' },
  { id: 's8', a: 30.0, b: 33.4, cap: ['DE VOLTA PRO PRESENTE'], sub: 'O Caio aperta o botão e volta pra casa.' },
  { id: 's9', a: 33.4, b: 39.4, cap: ['E SE ELE FOR PRO FUTURO?'], sub: 'Mas o aparelho começa a apitar... 2085.', subEnd: 3.0 },
];
export const DURATION = 39.4;

function setCam(pos, tgt, fov = 46) { cam.fov = fov; cam.position.set(...pos); cam.lookAt(...tgt); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
const LP = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const DEFS = `<defs>
<radialGradient id="vig" cx="50%" cy="42%" r="70%"><stop offset="35%" stop-color="#0b0614" stop-opacity="0"/><stop offset="100%" stop-color="#0b0614" stop-opacity="1"/></radialGradient>
<linearGradient id="finalbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1858"/><stop offset="1" stop-color="#5a2fb0"/></linearGradient>
<radialGradient id="portal" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".45" stop-color="#9a6cf0" stop-opacity=".8"/><stop offset="1" stop-color="#5a2fb0" stop-opacity="0"/></radialGradient>
<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#7ff6ff" stop-opacity=".9"/><stop offset="1" stop-color="#7ff6ff" stop-opacity="0"/></radialGradient>
</defs>`;

function device(x, y, sz, t, year = '1985', press = 0) {
  const w = sz, h = sz * 1.35, blink = Math.sin(t * 9) > 0;
  return `<g transform="translate(${f(x)},${f(y)})">
<circle r="${f(sz * 1.2)}" fill="url(#glow)" opacity="${f(.5 + .3 * Math.sin(t * 6))}"/>
<path d="M${f(w * .25)},${f(-h / 2)} L${f(w * .38)},${f(-h * .95)}" stroke="${OUT}" stroke-width="${f(sz * .06)}" stroke-linecap="round"/><circle cx="${f(w * .38)}" cy="${f(-h * .95)}" r="${f(sz * .08)}" fill="${blink ? '#ff4a6a' : '#7a2a3a'}" stroke="${OUT}" stroke-width="2"/>
<rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(sz * .16)}" fill="#8f8aa8" stroke="${OUT}" stroke-width="${f(Math.max(2.5, sz * .05))}"/>
<rect x="${f(-w / 2 + sz * .1)}" y="${f(-h / 2 + sz * .12)}" width="${f(w - sz * .2)}" height="${f(h * .34)}" rx="${f(sz * .06)}" fill="#1a1426" stroke="${OUT}" stroke-width="2"/>
<text x="0" y="${f(-h / 2 + sz * .12 + h * .26)}" text-anchor="middle" font-family="DejaVu Sans Mono" font-weight="700" font-size="${f(sz * .3)}" fill="#ff4a6a">${year}</text>
<circle cx="0" cy="${f(h * .22)}" r="${f(sz * (.2 - press * .03))}" fill="${press ? '#ff9a3c' : '#e2483d'}" stroke="${OUT}" stroke-width="${f(Math.max(2, sz * .04))}"/>
<path d="M${f(-w * .32)},${f(h * .4)} h${f(w * .18)} M${f(w * .14)},${f(h * .4)} h${f(w * .18)}" stroke="${OUT}" stroke-width="${f(Math.max(2, sz * .04))}" stroke-linecap="round"/></g>`;
}
const GMA = { c: { hood: '#ff5fa2', hoodD: '#d23f84', hoodL: '#ff9ac8', pants: '#6a3fd0', hair: '#6a2f1c', hairD: '#3e1a0e', stripe: '#3ff0d8', skin: '#e9b48c' }, hairStyle: 'curly', headband: '#3ff0d8', hoops: '#ffd23f', jacket: true };
const OLD_GPA = { c: { ...{ hood: '#2fb5a8' }, hair: '#e8e8ee', hairD: '#b9b4c8', hood: '#8a5a3a', hoodD: '#6a4228', hoodL: '#a87a52', pants: '#3b5ba8' }, hairStyle: 'curly', mustache: '#e8e8ee' };
const OLD_GMA = { c: { hair: '#f1f1f6', hairD: '#c9c6d4', hood: '#b48ad8', hoodD: '#8a62b4', hoodL: '#cfaef0', pants: '#5a4a7a', skin: '#e9b48c' }, hairStyle: 'curly', hoops: '#ffd23f' };
const MAN = { c: { hood: '#2fb5a8', hoodD: '#1f8c82', hoodL: '#5fd6c8', pants: '#3b5ba8', hair: '#3a2216', hairD: '#22130a', stripe: '#ff5fa2' }, hairStyle: 'curly', mustache: '#3a2216', shades: true, phones: true, skates: true, jacket: true };
const STAND = { hipY: .8, shY: 1.3 };
const REST_L = { h: [-.3, .82], c: [-.3, 1.05] }, REST_R = { h: [.3, .82], c: [.3, 1.05] };
const HOLD_R = { h: [.1, 1.12], c: [.36, .92] };
const toLocal = (pt, A) => [(pt[0] - A.ox) / A.s, (A.oy - pt[1]) / A.s];
function walk(ph, amp = 1) { const a = Math.sin(ph), b = Math.sin(ph + Math.PI); return { legL: { f: [-.13, .05 + Math.max(0, a) * .12 * amp], c: [-.13, .44 + Math.max(0, a) * .08 * amp] }, legR: { f: [.13, .05 + Math.max(0, b) * .12 * amp], c: [.13, .44 + Math.max(0, b) * .08 * amp] }, jy: -Math.abs(Math.cos(ph)) * 4 * amp }; }
function photoFrame(x, y, w, h, inner, label, k = 1, rot = 0) {
  const sc = backOut(clamp(k)), id = 'pf' + Math.round(x + y);
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${rot}) scale(${f(sc)})" opacity="${f(clamp(k * 3))}"><clipPath id="${id}"><rect x="${f(-w / 2 + 12)}" y="${f(-h / 2 + 12)}" width="${f(w - 24)}" height="${f(h - 60)}"/></clipPath>
<rect x="${f(-w / 2 + 6)}" y="${f(-h / 2 + 7)}" width="${w}" height="${h}" fill="${OUT}"/><rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${w}" height="${h}" fill="#fbf7ee" stroke="${OUT}" stroke-width="4"/>
<rect x="${f(-w / 2 + 12)}" y="${f(-h / 2 + 12)}" width="${f(w - 24)}" height="${f(h - 60)}" fill="#e9d6b4"/><g clip-path="url(#${id})">${inner}</g>${T(0, f(h / 2 - 18), 26, label, { w: 900, i: 1 })}</g>`;
}

function renderAt(t) {
  const S = SCENES.find(s => t >= s.a && t < s.b) || SCENES[SCENES.length - 1];
  const lt = t - S.a, dur = S.b - S.a;
  let fx = DEFS, three = null, top = '';
  canvas.style.visibility = 'visible'; canvas.style.filter = 'none';
  let flash = 0;
  if (SCN.sun.car) SCN.sun.car.position.z = -40;

  if (S.id === 's1') {
    three = SCN.sun.sc;
    setCam(LP([3.4, 1.6, 7.6], [3.5, 1.5, 6.9], ease(lt / dur)), [4.1, 1.05, -3], 46);
    const z = lerp(-2.2, .9, seg(lt, 0, 1.6));
    const A = anchorOf([4.35, .16, z]);
    const dv = project([4.56, .2, .98]);
    const squat = seg(lt, 2.3, 2.7) * (1 - seg(lt, 3.1, 3.5));
    const got = lt > 2.9;
    const walking = lt < 1.6;
    const hp = [A.ox + HOLD_R.h[0] * A.s, A.oy - HOLD_R.h[1] * A.s];
    const armR = squat > .01 ? { h: L2(REST_R.h, toLocal(dv, A), squat), c: [.34, lerp(1.05, .45, squat)] } : got ? HOLD_R : REST_R;
    fx += character({
      ...A, hipY: lerp(.8, .34, squat), shY: lerp(1.3, .84, squat), ...(walking ? walk(lt * 7) : { legL: { f: [-.17, .05], c: [lerp(-.13, -.4, squat), lerp(.44, .36, squat)] }, legR: { f: [.17, .05], c: [lerp(.13, .4, squat), lerp(.44, .36, squat)] } }),
      armL: REST_L, armR, eyes: lt > 1.6 ? 'wide' : 'open', mouth: lt > 1.6 ? 'o' : 'smile', brows: lt > 1.6 ? 'raised' : 'neutral', look: got ? [.5, .9] : [.6, 1],
    });
    if (!got) fx += device(dv[0], dv[1] - 10, A.s * .12, lt);
    else { const p = squat > .01 ? L2(dv, [hp[0] + 6, hp[1] - 22], 1 - squat) : [hp[0] + 6, hp[1] - 22]; fx += device(p[0], p[1], A.s * .12, lt); }
    if (lt > .2 && lt < 1.9) { const k = lin(lt, .2, .45); const nx = A.ox - A.s * .55, ny = A.oy - A.s * 1.55; fx += `<g opacity="${f(k)}"><path d="M${f(nx + 40)},${f(ny + 22)} L${f(A.ox - A.s * .2)},${f(ny + 52)}" stroke="${OUT}" stroke-width="4"/><rect x="${f(nx - 60)}" y="${f(ny - 26)}" width="120" height="48" rx="10" fill="#ffd23f" stroke="${OUT}" stroke-width="4"/>` + T(f(nx), f(ny + 10), 28, 'CAIO', { w: 900 }) + `</g>`; }
    if (lt > 1.7 && lt < 2.4) fx += sfx('?', A.ox + A.s * .45, A.oy - A.s * 2.0, 80, 8, '#ffd23f', lin(lt, 1.7, 1.9));
  }

  if (S.id === 's2') {
    three = SCN.sun.sc;
    setCam(LP([3.9, 1.6, 4.2], [3.95, 1.58, 3.8], ease(lt / dur)), [4.35, 1.35, .9], 46);
    const A = anchorOf([4.35, .16, .9]);
    const press = lt > 1.8 && lt < 2.1 ? 1 : 0;
    fx += character({ ...A, ...STAND, armL: { h: [-.06, 1.1], c: [-.36, .92] }, armR: HOLD_R, eyes: 'open', mouth: lt > 1.8 ? 'grin' : 'o', brows: 'raised', look: [.4, .9] });
    const hp = [A.ox + HOLD_R.h[0] * A.s, A.oy - HOLD_R.h[1] * A.s];
    fx += device(hp[0] + 6, hp[1] - 22, A.s * .12, lt, '1985', press);
    const k = lin(lt, .3, .6);
    if (k > 0) {
      const inner = `<g transform="translate(150,170)">${device(0, 0, 120, lt, '1985', press).replace('<circle r=', '<circle opacity="0" r=')}</g>` + T(150, 330, 18, 'NA TELA: 1985', { w: 900, c: '#e2483d' }) + T(150, 356, 15, '(ELE NEM REPAROU)', { w: 800, c: '#5a2fb0' });
      fx += card(390, 300, 300, 380, inner, k, 2);
    }
    if (lt > 1.8) fx += sfx('CLICK!', A.ox - A.s * .55, A.oy - A.s * 1.9, 52, -8, '#ffd23f', lin(lt, 1.8, 2.0));
    if (lt > 2.1) { const k2 = lin(lt, 2.1, 2.9); for (let i = 0; i < 6; i++) { const rr = (k2 * 900 + i * 120) % 900; fx += `<circle cx="${f(hp[0])}" cy="${f(hp[1] - 22)}" r="${f(rr)}" fill="none" stroke="${i % 2 ? '#9a6cf0' : '#7ff6ff'}" stroke-width="${f(18 - rr / 60)}" opacity="${f(.8 * (1 - rr / 900))}"/>`; } }
    if (lt > 2.7) flash = lin(lt, 2.7, 3.1);
  }

  if (S.id === 's3') {
    three = SCN.retro.sc; canvas.style.filter = 'sepia(.3) saturate(1.15)';
    setCam(LP([3.4, 1.6, 7.6], [3.5, 1.55, 7.0], ease(lt / dur)), [4.0, 1.1, -3], 46);
    const z = lerp(-2.0, 1.0, lt / dur);
    const A = anchorOf([4.3, .16, z]);
    fx += character({ ...A, ...STAND, ...walk(lt * 6), armL: REST_L, armR: HOLD_R, eyes: 'open', mouth: lt > 1.5 ? 'worried' : 'flat', brows: lt > 1.5 ? 'worried' : 'neutral', look: [.5, .9], headTilt: lt > 2.2 ? 6 : 0 });
    const hp = [A.ox + HOLD_R.h[0] * A.s, A.oy - HOLD_R.h[1] * A.s];
    fx += phone(hp[0] + 4, hp[1] - 10, A.s, -12);
    const k = lin(lt, .9, 1.2);
    if (k > 0) { const bx = Math.min(600, hp[0] + 125), by = hp[1] + 20; fx += `<g transform="translate(${f(bx)},${f(by)}) scale(${f(backOut(k))})"><rect x="-82" y="-30" width="164" height="60" rx="14" fill="#fbf7ee" stroke="${OUT}" stroke-width="4"/>${[0, 1, 2, 3].map(i => `<rect x="${-62 + i * 14}" y="${12 - i * 8}" width="9" height="${6 + i * 8}" fill="#c9c6d4" stroke="${OUT}" stroke-width="1.5"/>`).join('')}<path d="M-66,-16 L-10,16 M-10,-16 L-66,16" stroke="#e2483d" stroke-width="5"/>${T(30, 9, 19, 'SEM SINAL', { w: 900, c: '#e2483d' })}</g>`; }
    if (lt > 2.2) fx += sfx('?', A.ox - A.s * .5, A.oy - A.s * 2.0, 78, -8, '#ffd23f', lin(lt, 2.2, 2.4));
  }

  if (S.id === 's4' || S.id === 's5' || S.id === 's6') {
    three = SCN.retro.sc; canvas.style.filter = 'sepia(.3) saturate(1.15)';
    const s4 = S.id === 's4', s5 = S.id === 's5', s6 = S.id === 's6';
    if (s4) setCam(LP([3.0, 1.7, 7.4], [3.1, 1.65, 7.0], ease(lt / dur)), [lerp(4.8, 5.5, seg(lt, 2.3, 3.0)), 1.0, -2.5], 46);
    if (s5) setCam(LP([3.1, 1.65, 7.0], [3.7, 1.6, 5.6], ease(clamp(lt / 1.5))), LP([5.5, 1.0, -2.5], [5.5, .8, -.8], ease(clamp(lt / 1.5))), 46);
    if (s6) setCam(LP([3.7, 1.6, 4.4], [3.85, 1.6, 3.7], ease(lt / dur)), [4.25, 1.35, 1.0], 46);
    const H = anchorOf([s6 ? 4.2 : 3.95, .16, 1.0]);
    // the man
    const crashT = 2.35;
    const mz = s4 ? lerp(-11, -1.75, clamp(lt / crashT)) : -1.75;
    const M = anchorOf([5.5, .16, mz]);
    const fallK = s4 ? seg(lt, crashT, crashT + .35) : 1;
    const turned = s4 ? seg(lt, 1.5, 1.9) : 1;
    const glide = s4 && lt < crashT ? Math.sin(lt * 5) * 5 : 0;
    const manSVG = character({
      ...M, ...STAND, ...MAN, lean: glide * .6 + (s4 ? 0 : 0), noShadow: fallK > .5,
      legL: { f: [-.16 + Math.max(0, Math.sin(lt * 5)) * .06, .05], c: [-.13, .44] }, legR: { f: [.16 - Math.max(0, -Math.sin(lt * 5)) * .06, .05], c: [.13, .44] },
      armL: fallK > .3 ? { h: [-.55, 1.0], c: [-.45, 1.2] } : { h: [-.4, .9], c: [-.32, 1.05] }, armR: fallK > .3 ? { h: [.5, 1.45], c: [.45, 1.2] } : { h: [.4, .9], c: [.32, 1.05] },
      eyes: fallK > .5 ? 'dizzy' : 'open', mouth: fallK > .5 ? 'worried' : turned > .5 ? 'o' : 'smile', brows: turned > .5 ? 'raised' : 'neutral', look: [-turned, 0], headTilt: -turned * 10,
    });
    const rotA = fallK * 82;
    if (!s6) fx += `<g transform="rotate(${f(rotA)} ${f(M.ox + M.s * .1)} ${f(M.oy)}) translate(0,${f(fallK * M.s * .05)})">${manSVG}</g>`;
    if (!s6 && fallK > .5) { for (let i = 0; i < 3; i++) { const a = lt * 4 + i * 2.1; const sx = M.ox + M.s * 1.25 + Math.cos(a) * M.s * .25, sy = M.oy - M.s * .35 + Math.sin(a) * M.s * .08; fx += `<path d="M${f(sx)},${f(sy - 9)} L${f(sx + 3)},${f(sy - 2)} L${f(sx + 10)},${f(sy)} L${f(sx + 3)},${f(sy + 3)} L${f(sx)},${f(sy + 10)} L${f(sx - 3)},${f(sy + 3)} L${f(sx - 10)},${f(sy)} L${f(sx - 3)},${f(sy - 2)} Z" fill="#ffd23f" stroke="${OUT}" stroke-width="2"/>`; } }
    // hero
    const wave = s4 && lt > .9 && lt < 2.3 ? Math.sin(lt * 14) * .08 : 0;
    const flick = s6 ? clamp(seg(lt, .8, 2.4) * (.55 + .45 * Math.sin(lt * 17))) : 0;
    fx += character({
      ...H, ...STAND, invis: flick,
      armL: REST_L, armR: s4 && lt < 2.3 ? { h: [.38 + wave, 1.62], c: [.45, 1.25] } : s6 ? { h: [.12, 1.15], c: [.38, .95] } : REST_R,
      eyes: s4 ? (lt > crashT ? 'wide' : 'open') : 'wide', mouth: s4 ? (lt > crashT ? 'shock' : 'smile') : 'shock', brows: s4 && lt < crashT ? 'raised' : 'worried',
      look: s6 ? [.3, .9] : [1, .3], headTilt: s6 ? 4 : 0,
    });
    if (s4) {
      if (lt > .9 && lt < 1.95) fx += bubble(Math.min(500, H.ox + 60), H.oy - H.s * 2.25, 330, ['MOÇO, ONDE', 'TEM WI-FI?'], lin(lt, .9, 1.15), [H.ox + H.s * .15, H.oy - H.s * 1.9]);
      if (lt > 1.95 && lt < 2.7) fx += bubble(Math.min(560, M.ox + 10), M.oy - M.s * 2.6, 220, ['WI-QUÊ?'], lin(lt, 1.9, 2.1), [M.ox, M.oy - M.s * 1.95]);
      if (lt > crashT) fx += sfx('CRASH!', M.ox + M.s * .3, M.oy - M.s * 1.3, 70, -10, '#ffd23f', lin(lt, crashT, crashT + .2));
      const k = lin(lt, .2, .5);
      fx += `<g opacity="${f(k)}"><g transform="rotate(-3 175 318)"><rect x="40" y="290" width="270" height="56" fill="${OUT}"/>` + T(175, 330, 26, 'MOÇO DE PATINS', { w: 900, c: '#ffd23f' }) + `</g></g>`;
    }
    if (s5) {
      // wallet + ID
      const wp = L2([M.ox + M.s * .2, M.oy - M.s * .2], [H.ox + H.s * .45, H.oy - H.s * .02], seg(lt, .1, .7));
      fx += `<g transform="translate(${f(wp[0])},${f(wp[1])}) rotate(${f(lt * 200 * (1 - seg(lt, .1, .7)))})"><rect x="-22" y="-14" width="44" height="28" rx="5" fill="#7a4523" stroke="${OUT}" stroke-width="3"/></g>`;
      const k = lin(lt, .9, 1.2);
      if (k > 0) {
        const face = character({ ox: 95, oy: 330, s: 180, ...STAND, ...MAN, shades: false, phones: false, noShadow: true, eyes: 'open', mouth: 'smile', look: [0, 0] });
        const inner = `<rect x="18" y="56" width="150" height="176" fill="#e9d6b4" stroke="${OUT}" stroke-width="3"/><clipPath id="idc"><rect x="18" y="56" width="150" height="176"/></clipPath><g clip-path="url(#idc)">${face}</g>` +
          T(190, 40, 20, 'IDENTIDADE', { w: 900, a: 'start', c: '#5a2fb0' }) + T(186, 98, 15, 'NOME', { w: 700, a: 'start', c: '#8a7fa8' }) + T(186, 124, 21, 'JOSÉ CARLOS', { w: 900, a: 'start' }) +
          T(186, 170, 15, 'NASCIDO EM', { w: 700, a: 'start', c: '#8a7fa8' }) + T(186, 204, 34, '1962', { w: 900, a: 'start', c: '#e2483d' });
        fx += card(40, 300, 360, 250, inner, k, -2);
      }
      const k2 = lin(lt, 2.2, 2.5);
      if (k2 > 0) {
        const old = character({ ox: -55, oy: 250, s: 175, ...STAND, ...OLD_GPA, noShadow: true, eyes: 'open', mouth: 'smile', look: [.3, 0] }) + character({ ox: 60, oy: 250, s: 165, ...STAND, ...OLD_GMA, noShadow: true, eyes: 'open', mouth: 'smile', look: [-.3, 0] });
        fx += photoFrame(520, 640, 290, 300, old, 'VÔ ZÉ E VÓ LÚCIA', k2, 4);
        fx += T(520, 470, 20, 'FOTO DE CASA', { w: 900, c: '#fff', st: OUT, sw: 6 });
      }
      if (lt > 3.2) fx += sfx('É O MEU AVÔ?!', 360, 860, 54, -5, '#ff6b9a', lin(lt, 3.2, 3.45));
    }
    if (s6) {
      const hp = [H.ox + .12 * H.s, H.oy - 1.15 * H.s];
      fx += device(hp[0] + 6, hp[1] - 22, H.s * .12, lt);
      const k = lin(lt, .3, .6);
      if (k > 0) fx += card(40, 300, 300, 168, T(150, 40, 22, 'PARADOXO DO AVÔ', { w: 900 }) + T(150, 80, 16, 'SE O AVÔ NÃO FICAR BEM,', { w: 800, c: '#5a2fb0' }) + T(150, 104, 16, 'O NETO NUNCA NASCE...', { w: 800, c: '#5a2fb0' }) + T(150, 140, 16, 'E QUEM VOLTOU NO TEMPO?', { w: 900, c: '#e2483d' }), k, -2);
      if (lt > 1.6) fx += sfx('1985?!', H.ox + H.s * .55, H.oy - H.s * 1.95, 60, 8, '#ffd23f', lin(lt, 1.6, 1.8));
      fx += `<rect width="720" height="1280" fill="url(#vig)" opacity="${f(seg(lt, 1.0, 3.0) * .4)}"/>`;
      if (lt > 2.9) { const k3 = lin(lt, 2.9, 3.15); top += `<g transform="translate(520,${lt > 4.3 ? 880 : 1010}) rotate(-6) scale(${f(backOut(k3) * .62)})" opacity="${f(clamp(k3 * 3))}"><rect x="-230" y="-52" width="460" height="104" fill="#e2483d" stroke="${OUT}" stroke-width="6"/>` + T(0, 20, 54, 'CONTINUA...', { w: 900, c: '#fff', i: 1 }) + `</g>`; }
      if (lt > 4.3) { const k4 = lin(lt, 4.3, 4.6); top += `<g transform="translate(360,1040) scale(${f(backOut(k4))})" opacity="${f(clamp(k4 * 3))}"><rect x="-286" y="-86" width="580" height="180" rx="22" fill="${OUT}"/><rect x="-292" y="-92" width="580" height="180" rx="22" fill="#fbf7ee" stroke="${OUT}" stroke-width="5"/>` + T(-2, -38, 26, 'NA PARTE 2', { w: 900, c: '#5a2fb0' }) + T(-2, 10, 34, 'O CAIO SALVA O AVÔ?', { w: 900 }) + T(-2, 62, 30, 'COMENTA <tspan fill="#e2483d">TEMPO</tspan>', { w: 900, i: 1 }) + `</g>`; }
    }
  }

  if (S.id === 'sG' || S.id === 'sR') {
    three = SCN.retro.sc; canvas.style.filter = 'sepia(.3) saturate(1.15)';
    const g = S.id === 'sG';
    if (g) setCam(LP([3.7, 1.6, 5.6], [3.5, 1.6, 6.5], ease(lt / dur)), LP([5.5, .8, -.8], [4.95, 1.0, -1.6], ease(lt / dur)), 46);
    else setCam(LP([3.5, 1.6, 5.4], [3.55, 1.58, 4.6], ease(lt / dur)), [4.9, 1.2, -.6], 46);
    const H = anchorOf([3.95, .16, 1.0]);
    const M = anchorOf([5.5, .16, -1.75]);
    const wz = g ? lerp(-9, -2.6, seg(lt, 0, 1.4)) : -2.6;
    const W = anchorOf([6.15, .16, wz]);
    const rise = g ? seg(lt, 2.2, 3.4) : 1;
    const rotA = 82 * (1 - rise);
    const love = g ? lin(lt, 3.4, 3.8) : 1;
    // grandpa
    const manSVG = character({
      ...M, ...STAND, ...MAN, noShadow: rise < .5,
      armL: REST_L, armR: rise > .5 ? { h: [.36, 1.0], c: [.36, 1.05] } : { h: [.5, 1.45], c: [.45, 1.2] },
      eyes: rise < .3 ? 'dizzy' : 'open', mouth: love > 0 ? 'grin' : 'o', brows: 'raised', look: [1, 0], headTilt: love * 6,
    });
    fx += `<g transform="rotate(${f(rotA)} ${f(M.ox + M.s * .1)} ${f(M.oy)})">${manSVG}</g>`;
    // young grandma
    const running = g && lt < 1.4;
    const reach = g ? seg(lt, 1.4, 2.0) * (1 - seg(lt, 3.3, 3.8)) : 0;
    fx += character({
      ...W, ...STAND, ...GMA, ...(running ? walk(lt * 8) : {}),
      armL: { h: L2(REST_L.h, [-.55, .55], reach), c: [-.42, 1.0] }, armR: REST_R,
      eyes: 'open', mouth: love > 0 ? 'grin' : 'o', brows: love > 0 ? 'raised' : 'worried', look: [-1, love > 0 ? 0 : .6], headTilt: -love * 6,
    });
    if (love > 0) { for (let i = 0; i < 4; i++) { const k = (lt * .6 + i * .25) % 1; const hx = (M.ox + W.ox) / 2 + Math.sin(k * 6 + i) * 18 + (i - 1.5) * 14, hy = Math.min(M.oy, W.oy) - M.s * (1.9 + k * .9); fx += `<path transform="translate(${f(hx)},${f(hy)}) scale(${f(.9 + i * .1)})" d="M0,6 C-14,-6 -10,-18 0,-10 C10,-18 14,-6 0,6 Z" fill="#ff5fa2" stroke="${OUT}" stroke-width="2.5" opacity="${f(love * Math.sin(k * Math.PI))}"/>`; } }
    // Caio
    fx += character({
      ...H, ...STAND, armL: REST_L, armR: REST_R,
      eyes: g && lt < 2.6 ? 'open' : 'wide', mouth: g ? (lt < 2.6 ? 'o' : 'shock') : 'grin', brows: 'raised', look: [1, .2], headTilt: g ? 0 : 4,
    });
    if (g) {
      if (lt > 1.4 && lt < 2.6) fx += bubble(Math.min(540, W.ox - 40), W.oy - W.s * 2.45, 300, ['TÁ TUDO BEM', 'AÍ, MOÇO?'], lin(lt, 1.4, 1.6), [W.ox - W.s * .1, W.oy - W.s * 1.95]);
      if (lt > 2.6) fx += bubble(380, 560, 330, ['É A VÓ LÚCIA?!'], lin(lt, 2.6, 2.8), [H.ox + H.s * .15, H.oy - H.s * 1.9]);
      const k = lin(lt, .3, .55);
      const old = character({ ox: -55, oy: 250, s: 175, ...STAND, ...OLD_GPA, noShadow: true, eyes: 'open', mouth: 'smile', look: [.3, 0] }) + character({ ox: 60, oy: 250, s: 165, ...STAND, ...OLD_GMA, noShadow: true, eyes: 'open', mouth: 'smile', look: [-.3, 0] });
      fx += `<g transform="translate(140,840) scale(.62)">` + photoFrame(0, 0, 290, 300, old, 'VÔ ZÉ E VÓ LÚCIA', k, -5) + `</g>`;
    } else {
      const k = lin(lt, .3, .6);
      if (k > 0) fx += card(40, 300, 330, 196, T(165, 36, 16, 'NA FÍSICA, UMA IDEIA FAMOSA:', { w: 800, c: '#5a2fb0' }) + T(165, 68, 20, 'AUTOCONSISTÊNCIA', { w: 900 }) + T(165, 108, 16, 'O PASSADO NÃO MUDA.', { w: 800 }) + T(165, 134, 16, 'QUEM VOLTA NO TEMPO', { w: 800 }) + T(165, 158, 16, 'JÁ FAZIA PARTE DA HISTÓRIA.', { w: 900, c: '#e2483d' }), k, -2);
      if (lt > 1.5) fx += bubble(400, H.oy - H.s * .55, 560, ['FOI POR MINHA CAUSA', 'QUE ELES SE CONHECERAM!'], lin(lt, 1.5, 1.75), [H.ox + H.s * .1, H.oy - H.s * 1.25]);
    }
  }

  if (S.id === 's8') {
    if (lt < 1.0) {
      three = SCN.retro.sc; canvas.style.filter = 'sepia(.3) saturate(1.15)';
      setCam([3.8, 1.6, 4.2], [4.3, 1.35, .9], 46);
      const A = anchorOf([4.3, .16, .9]);
      fx += character({ ...A, ...STAND, armL: { h: [-.06, 1.1], c: [-.36, .92] }, armR: HOLD_R, eyes: 'open', mouth: 'grin', brows: 'raised', look: [.4, .9] });
      const hp = [A.ox + HOLD_R.h[0] * A.s, A.oy - HOLD_R.h[1] * A.s];
      fx += device(hp[0] + 6, hp[1] - 22, A.s * .12, lt, '2026', lt > .25 ? 1 : 0);
      if (lt > .25) fx += sfx('CLICK!', A.ox - A.s * .55, A.oy - A.s * 1.9, 52, -8, '#ffd23f', lin(lt, .25, .4));
      if (lt > .35) { const k2 = lin(lt, .35, 1.0); for (let i = 0; i < 6; i++) { const rr = (k2 * 900 + i * 120) % 900; fx += `<circle cx="${f(hp[0])}" cy="${f(hp[1] - 22)}" r="${f(rr)}" fill="none" stroke="${i % 2 ? '#9a6cf0' : '#7ff6ff'}" stroke-width="${f(18 - rr / 60)}" opacity="${f(.8 * (1 - rr / 900))}"/>`; } }
      if (lt > .7) flash = lin(lt, .7, 1.0);
    } else {
      const l2 = lt - 1.0;
      three = SCN.quarto.sc;
      setCam(LP([.45, 1.45, 3.5], [.3, 1.43, 3.0], ease(l2 / 2.4)), [-.4, 1.05, -1.0], 46);
      const A = anchorOf([-.45, 0, -.55]);
      if (l2 < .3) flash = 1 - lin(l2, 0, .3);
      fx += character({ ...A, ...STAND, armL: REST_L, armR: HOLD_R, eyes: l2 > .6 ? 'closed' : 'wide', mouth: l2 > .6 ? 'grin' : 'o', brows: 'raised', look: [.5, .9] });
      const hp = [A.ox + HOLD_R.h[0] * A.s, A.oy - HOLD_R.h[1] * A.s];
      fx += phone(hp[0] + 4, hp[1] - 10, A.s, -12);
      const k = lin(l2, .5, .75);
      if (k > 0) { const bx = Math.min(600, hp[0] + 125), by = hp[1] + 20; fx += `<g transform="translate(${f(bx)},${f(by)}) scale(${f(backOut(k))})"><rect x="-82" y="-30" width="164" height="60" rx="14" fill="#fbf7ee" stroke="${OUT}" stroke-width="4"/>${[0, 1, 2, 3].map(i => `<rect x="${-66 + i * 14}" y="${12 - i * 8}" width="9" height="${6 + i * 8}" fill="#2f9e5b" stroke="${OUT}" stroke-width="1.5"/>`).join('')}${T(28, 9, 22, '2026 ✓', { w: 900, c: '#2f9e5b' })}</g>`; }
      if (l2 > .9) fx += sfx('UFA!', A.ox + A.s * .15, A.oy - A.s * 2.15, 62, 6, '#ffd23f', lin(l2, .9, 1.1));
    }
  }

  if (S.id === 's9') {
    three = SCN.quarto.sc;
    setCam(LP([.3, 1.43, 3.0], [-.05, 1.5, 1.7], ease(clamp(lt / 3.0))), LP([-.4, 1.05, -1.0], [-.45, 1.3, -.6], ease(clamp(lt / 3.0))), 46);
    const A = anchorOf([-.45, 0, -.55]);
    const beep = lt > .4 && Math.sin(lt * 14) > 0;
    fx += character({ ...A, ...STAND, armL: { h: [-.06, 1.1], c: [-.36, .92] }, armR: HOLD_R, eyes: 'wide', mouth: lt < .4 ? 'smile' : 'o', brows: 'raised', look: [.4, .9] });
    const hp = [A.ox + HOLD_R.h[0] * A.s, A.oy - HOLD_R.h[1] * A.s];
    fx += device(hp[0] + 6, hp[1] - 22, A.s * .12, lt * 2, lt > .6 ? '2085' : '2026');
    if (lt > .4) fx += sfx(beep ? 'BIP! BIP!' : '', A.ox - A.s * .55, A.oy - A.s * 1.95, 48, -8, '#ff6b9a', 1);
    const k = lin(lt, .7, 1.0);
    if (k > 0) {
      const inner = `<g transform="translate(150,165)">${device(0, 0, 120, lt * 2, '2085').replace('<circle r=', '<circle opacity="0" r=')}</g>` + T(150, 320, 20, 'NA TELA: 2085', { w: 900, c: '#e2483d' }) + T(150, 348, 16, 'DAQUI A 59 ANOS', { w: 800, c: '#5a2fb0' });
      fx += card(392, 300, 300, 370, inner, k, 2);
    }
    fx += `<rect width="720" height="1280" fill="url(#vig)" opacity="${f(seg(lt, 1.5, 3.0) * .35)}"/>`;
    if (lt > 2.6) { const k3 = lin(lt, 2.6, 2.85); top += `<g transform="translate(520,880) rotate(-6) scale(${f(backOut(k3) * .62)})" opacity="${f(clamp(k3 * 3))}"><rect x="-230" y="-52" width="460" height="104" fill="#e2483d" stroke="${OUT}" stroke-width="6"/>` + T(0, 20, 54, 'CONTINUA...', { w: 900, c: '#fff', i: 1 }) + `</g>`; }
    if (lt > 3.0) { const k4 = lin(lt, 3.0, 3.3); top += `<g transform="translate(360,1040) scale(${f(backOut(k4))})" opacity="${f(clamp(k4 * 3))}"><rect x="-286" y="-86" width="580" height="180" rx="22" fill="${OUT}"/><rect x="-292" y="-92" width="580" height="180" rx="22" fill="#fbf7ee" stroke="${OUT}" stroke-width="5"/>` + T(-2, -38, 26, 'NA PARTE 2', { w: 900, c: '#5a2fb0' }) + T(-2, 10, 32, 'O CAIO VAI PRO FUTURO?', { w: 900 }) + T(-2, 62, 30, 'COMENTA <tspan fill="#e2483d">TEMPO</tspan>', { w: 900, i: 1 }) + `</g>`; }
  }

  if (S.id === 's7') {
    canvas.style.visibility = 'hidden';
    const k = lt;
    fx += `<rect width="720" height="1280" fill="url(#finalbg)"/>`;
    fx += device(360, 300, 110, lt);
    fx += `<g transform="translate(360,520) scale(${f(backOut(clamp(k / .45)))})">` + T(0, 30, 110, 'PARTE 2', { w: 900, c: '#ffd23f', st: OUT, sw: 16, i: 1 }) + `</g>`;
    fx += `<g opacity="${f(clamp((k - .3) * 3))}">` + T(360, 650, 44, 'COMENTA', { w: 900, c: '#fff', st: OUT, sw: 10, i: 1 }) + T(360, 740, 84, 'TEMPO', { w: 900, c: '#bfe9ff', st: OUT, sw: 14, i: 1 }) + `</g>`;
    fx += `<g opacity="${f(clamp((k - .7) * 3))}">` + T(360, 820, 30, 'que eu te mando a parte 2', { w: 700, c: '#fff' }) + `</g>`;
    fx += `<g opacity="${f(clamp((k - 1.1) * 3))}"><rect x="110" y="890" width="500" height="96" rx="18" fill="#fbf7ee" stroke="${OUT}" stroke-width="4"/>` + T(360, 928, 18, 'NA PARTE 2', { w: 900, c: '#5a2fb0' }) + T(360, 966, 26, 'ELE CONSEGUE SALVAR O AVÔ?', { w: 900 }) + `</g>`;
  }

  let hud = '';
  if (S.sub) {
    const words = S.sub.split(' ');
    const span = (S.subEnd || dur) - .35; const i = Math.min(words.length - 1, Math.floor(clamp(lt / span) * words.length));
    if (lt < (S.subEnd || dur)) hud += T(360, 1115, 58, words[i], { w: 900, c: '#fff', st: OUT, sw: 12 });
  }
  hud += `<rect x="38" y="36" width="210" height="44" fill="#fbf7ee" stroke="${OUT}" stroke-width="3"/>${LOGO(62, 58, 1.0)}` + T(86, 65, 19, '@curiozando987', { w: 700, a: 'start', c: '#4a2a8a' });
  hud += T(42, 104, 13, 'ENSAIO VISUAL · SEM NARRAÇÃO', { w: 700, a: 'start', c: '#6a3fd0', st: 'rgba(255,255,255,.75)', sw: 3 });
  hud += `<rect x="440" y="40" width="242" height="36" rx="18" fill="#7b48d8" stroke="${OUT}" stroke-width="3"/>` + T(561, 64, 15, 'E SE FOSSE VOCÊ? · PARTE 1', { w: 900, c: '#fff' });
  if (S.cap) {
    const lines = S.cap, bh = 30 + lines.length * 36;
    hud += `<rect x="54" y="128" width="620" height="${bh}" fill="${OUT}"/><rect x="46" y="120" width="620" height="${bh}" fill="#fbf7ee" stroke="${OUT}" stroke-width="4"/>`;
    lines.forEach((ln, i) => hud += T(356, 160 + i * 36 + (lines.length === 1 ? 6 : 0), 30, ln, { w: 800, i: 1 }));
  }
  hud += top;
  hud += `<rect x="16" y="16" width="688" height="1248" fill="none" stroke="${OUT}" stroke-width="6"/>`;
  if (S.id !== 's1') { const k = 1 - lin(lt, 0, .18); if (k > 0) flash = Math.max(flash, k); }
  if (flash > 0) hud += `<rect width="720" height="1280" fill="#fff" opacity="${f(flash)}"/>`;

  if (three) renderer.render(three, cam);
  document.getElementById('fx').innerHTML = fx;
  document.getElementById('hud').innerHTML = hud;
}

window.renderAt = renderAt;
window.DURATION = DURATION;
window.ready = true;
