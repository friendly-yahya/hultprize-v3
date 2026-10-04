// Add 'use client'; at the top if you use this in Next.js (app router).
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';

import './Aurora.css';
import { AURORA, AURORA_PORTRAIT } from './auroraConfig.js';

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];   // [0] pastel orange, [1] pink, [2] blue
uniform vec2 uResolution;
uniform float uBlend;
uniform float uAngle;          // base ribbon angle in degrees
uniform float uPixel;
uniform float uDither;
uniform float uGoo;           // cursor-blob viscosity: neck thickness between blobs
uniform float uLava;          // lava cluster on/off
uniform float uLavaCount;
uniform float uLavaSize;
uniform float uLavaSpeed;
uniform float uLavaRange;     // vertical travel
uniform float uLavaSpread;    // horizontal spread
uniform vec2 uLavaPos;        // cluster center in screen fractions
uniform float uLavaSoft;      // 0 = crisp goo, 1 = blurry
uniform float uLavaPull;      // how much the elastic pull moves the lava
uniform vec2 uPull;            // springy point the ribbon is pulled toward
uniform float uPullAmt;        // springy pull strength (can overshoot)
uniform float uPullRadius;
uniform float uCrop;           // 0..1: which part of the sketch stays visible on narrow screens
uniform float uShape;          // 0 = band, 1 = sketch shape
uniform float uShapeMorph;     // how much the sketch shape drifts and wobbles
uniform float uRibbon;         // 0 = ribbon removed
uniform float uRibbonWidth;
uniform float uRibbonBend;
uniform vec2 uRibbonPos;       // offset of the ribbon pivot, in screen fractions
uniform float uSoft;           // blob blur 0..1

uniform vec2 uB0;              // main blob (pink), follows the mouse
uniform vec2 uB1;              // satellite (orange)
uniform vec2 uB2;              // satellite (blue)
uniform float uMouseStrength;
uniform float uMouseRadius;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float bayer8(ivec2 q) {
  int x = q.x & 7;
  int y = q.y & 7;
  int xy = x ^ y;
  int v = ((y & 1) << 5) | ((xy & 1) << 4) | ((y & 2) << 2) | ((xy & 2) << 1) | ((y & 4) >> 1) | ((xy & 4) >> 2);
  return float(v) / 64.0;
}

vec3 ramp3(float t) {
  return t < 0.5
    ? mix(uColorStops[0], uColorStops[1], t * 2.0)
    : mix(uColorStops[1], uColorStops[2], (t - 0.5) * 2.0);
}

float blobField(vec2 uv, vec2 c, float r, float aspect) {
  vec2 d = uv - c;
  d.x *= aspect;
  return exp(-dot(d, d) / (r * r));
}

// capsule between two blob centers: the viscous neck
float segField(vec2 uv, vec2 A, vec2 B, float r, float aspect) {
  vec2 pa = uv - A; pa.x *= aspect;
  vec2 ba = B - A;  ba.x *= aspect;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.00001), 0.0, 1.0);
  vec2 d = pa - ba * h;
  return exp(-dot(d, d) / (r * r));
}

// each blob carries its own slowly turning gradient
vec3 gradBlob(vec2 uv, vec2 c, float r, float lo, float hi, float seed, float aspect) {
  vec2 d = uv - c;
  d.x *= aspect;
  vec2 dir = vec2(cos(uTime * 0.25 + seed), sin(uTime * 0.25 + seed));
  float g = clamp(0.5 + 0.5 * dot(d, dir) / (r * 1.3), 0.0, 1.0);
  return ramp3(mix(lo, hi, g));
}

// Tapered, bendable leaf from A to B (A,B in uv; q is aspect-corrected).
// Returns a signed distance (<0 inside) and h = position along the blade 0..1.
float blade(vec2 q, vec2 A, vec2 B, float wMax, float skew, float plateau, float bend, float seed, float aspect, out float h) {
  float t = uTime;
  float m = uShapeMorph;
  A = vec2(A.x * aspect, A.y);
  B = vec2(B.x * aspect, B.y);
  // the endpoints drift, so the whole shape slowly re-arranges
  A += 0.03 * m * vec2(sin(t * 0.27 + seed), cos(t * 0.21 + seed * 1.3));
  B += 0.03 * m * vec2(cos(t * 0.23 + seed * 1.7), sin(t * 0.31 + seed));
  vec2 ba = B - A;
  vec2 pa = q - A;
  h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  vec2 perp = normalize(vec2(-ba.y, ba.x));
  float sway = bend * uRibbonBend + 0.035 * m * sin(t * 0.4 + seed * 2.0);
  vec2 C = A + ba * h + perp * sway * 4.0 * h * (1.0 - h);
  float prof = mix(sin(3.14159265 * pow(h, skew)), 1.0, plateau);
  float r = wMax * uRibbonWidth * clamp(aspect / 1.78, 0.4, 1.0) * (1.0 + 0.18 * m * sin(t * 0.5 + seed)) * prof;
  float d = length(q - C) - max(r, 0.003);
  if (d < 0.4) d += 0.018 * m * snoise(q * 3.5 + vec2(t * 0.2, seed)); // wobbly outline, skipped far away
  return d;
}

void addBlade(inout float acc, inout vec3 colAcc, float d, float rt0, float rt1, float h, float sf) {
  float dd = max(d, 0.0);
  if (dd > sf * 3.5) return;   // far from this blade: contributes nothing
  float f = exp(-(dd * dd) / (sf * sf));
  if (f < 0.002) return;
  acc += f;
  colAcc += f * ramp3(mix(rt0, rt1, h));
}

void main() {
  float px = max(uPixel, 1.0);
  vec2 cell = floor(gl_FragCoord.xy / px);
  vec2 uv = (cell + 0.5) * px / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime;

  // elastic pull: sample the ribbon from a displaced position, so it bulges toward the cursor
  vec2 pdv = p - vec2(uPull.x * aspect, uPull.y);
  float pw = uPullAmt * exp(-dot(pdv, pdv) / (uPullRadius * uPullRadius));
  vec2 pp = p + pdv * pw;

  float ribbon = 0.0;
  vec3 ribCol = vec3(0.0);
  if (uShape < 0.5) {
  // --- ribbon: a twisting, pinching band whose shape and flow keep changing ---
  // the axis slowly swings, the flow speed breathes (tw), the curviness breathes (calm)
  float ang = radians(uAngle + 14.0 * sin(t * 0.11) + 6.0 * sin(t * 0.29 + 1.0));
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 perp = vec2(-dir.y, dir.x);
  vec2 q = pp - vec2(aspect * (0.5 + uRibbonPos.x), 0.5 + uRibbonPos.y);
  float along = dot(q, dir);
  float across = dot(q, perp);
  float s = along / aspect;                         // about -0.5 .. 0.5

  float calm = 0.65 + 0.35 * sin(t * 0.13);
  float tw = t + 0.8 * sin(t * 0.23);
  float c = uRibbonBend * (0.20 * calm * sin(s * 7.0 + tw * 0.45)
          + 0.08 * sin(s * 15.0 - tw * 0.80 + 1.7)
          + 0.14 * snoise(vec2(s * 2.5, tw * 0.12)));
  float d = across - c;

  float pinch = 0.35 + 0.65 * abs(sin(s * 3.2 + tw * 0.28)); // twists thin, then fat
  float w = (0.10 + 0.08 * (0.5 + 0.5 * sin(tw * 0.17))) * pinch * uAmplitude * uRibbonWidth;
  ribbon = exp(-(d * d) / (w * w));
    ribCol = ribbon * ramp3(clamp(s + 0.5, 0.0, 1.0));

  } else {
    // the hand-drawn composition: one big blade, a sliver, a drop, a mid blade, a tall band
    float m = uShapeMorph;
    float sang = radians(uAngle + 5.0 * m * sin(t * 0.11));
    float aspectR = max(aspect, 1.78);      // the composition is laid out for a wide screen
    vec2 cS = vec2(aspectR * 0.64, 0.5);
    vec2 sq = pp + vec2((aspectR - aspect) * uCrop, 0.0) - vec2(aspectR * uRibbonPos.x, uRibbonPos.y) - cS;
    sq = vec2(cos(sang) * sq.x + sin(sang) * sq.y, -sin(sang) * sq.x + cos(sang) * sq.y) + cS;
    float sf = 0.01 + 0.12 * uBlend;
    float h;
    float bd;
    bd = blade(sq, vec2(0.455, 1.12), vec2(0.729, 0.045), 0.18, 1.4, 0.0, 0.010, 1.0, aspectR, h);
    addBlade(ribbon, ribCol, bd, 0.0, 0.6, h, sf);
    bd = blade(sq, vec2(0.428, 0.871), vec2(0.480, 0.747), 0.022, 1.0, 0.0, -0.008, 2.0, aspectR, h);
    addBlade(ribbon, ribCol, bd, 0.45, 0.6, h, sf);
    bd = blade(sq, vec2(0.518, 0.347), vec2(0.560, 0.128), 0.032, 3.0, 0.0, 0.0, 3.0, aspectR, h);
    addBlade(ribbon, ribCol, bd, 0.6, 1.0, h, sf);
    bd = blade(sq, vec2(0.698, 0.818), vec2(0.797, 0.424), 0.045, 1.0, 0.0, 0.010, 4.0, aspectR, h);
    addBlade(ribbon, ribCol, bd, 0.0, 0.5, h, sf);
    bd = blade(sq, vec2(0.820, 1.030), vec2(0.925, 0.025), 0.038, 1.0, 1.0, 0.012, 5.0, aspectR, h);
    addBlade(ribbon, ribCol, bd, 0.5, 1.0, h, sf);
  }
  ribbon *= uRibbon;
  ribCol *= uRibbon;

  // --- blobs: one main, two smaller satellites ---
  float sc = clamp(aspect / 1.78, 0.4, 1.0);   // shrink shapes on portrait screens
  float r = max(uMouseRadius * sc, 0.001);
  float g0 = 1.00 * blobField(uv, uB0, r, aspect) * uMouseStrength * 0.9;
  float g1 = 0.85 * blobField(uv, uB1, r * 0.70, aspect) * uMouseStrength * 0.9;
  float g2 = 0.75 * blobField(uv, uB2, r * 0.50, aspect) * uMouseStrength * 0.9;
  // viscous neck keeps the chain connected like thick liquid
  float n01 = uGoo * 0.75 * segField(uv, uB0, uB1, r * 0.55, aspect) * uMouseStrength * 0.9;
  float n12 = uGoo * 0.75 * segField(uv, uB1, uB2, r * 0.40, aspect) * uMouseStrength * 0.9;
  vec3 blobCol = (n01 + n12) * ramp3(0.5);
  if (g0 > 0.002) blobCol += g0 * gradBlob(uv, uB0, r, 0.25, 0.80, 1.0, aspect);
  if (g1 > 0.002) blobCol += g1 * gradBlob(uv, uB1, r * 0.70, 0.0, 0.5, 2.0, aspect);
  if (g2 > 0.002) blobCol += g2 * gradBlob(uv, uB2, r * 0.50, 0.5, 1.0, 3.0, aspect);
  float blobs = g0 + g1 + g2 + n01 + n12;

  // --- lava lamp cluster: locked in place, only nudged by the elastic pull ---
  float lava = 0.0;
  vec3 lavaCol = vec3(0.0);
  vec2 lp = p + pdv * pw * uLavaPull;
  vec2 lcen = vec2(aspect * uLavaPos.x, uLavaPos.y);
  vec2 lext = vec2((uLavaSpread + 4.6 * uLavaSize) * sc + 0.03, uLavaRange + 6.0 * uLavaSize * sc);
  // skip the loop for pixels no lava blob can reach
  if (uLava > 0.5 && abs(lp.x - lcen.x) < lext.x && abs(lp.y - lcen.y) < lext.y) {
    for (int i = 0; i < 8; i++) {
      if (float(i) >= uLavaCount) break;
      float fi = float(i);
      float seed = fi * 1.7 + 3.0;
      float h1 = fract(sin(fi * 12.9898 + 1.0) * 43758.5453);
      float h2 = fract(sin(fi * 78.233 + 2.0) * 43758.5453);
      float yph = uTime * uLavaSpeed * (0.10 + 0.07 * h2) + seed;
      vec2 lc = vec2(aspect * uLavaPos.x + (h1 - 0.5) * 2.0 * uLavaSpread * sc + 0.03 * sin(uTime * 0.3 + seed),
                     uLavaPos.y + uLavaRange * sin(yph) * (0.6 + 0.4 * cos(seed)));
      float rad = uLavaSize * sc * (0.55 + 0.7 * h2) * (1.0 + 0.15 * sin(uTime * 0.5 + seed));
      vec2 ld = lp - lc;
      ld.y /= 1.0 + 0.3 * abs(cos(yph));   // stretches while it moves fast
      if (dot(ld, ld) > 9.0 * rad * rad) continue;   // too far to matter
      float lf = exp(-dot(ld, ld) / (rad * rad));
      float lbase = fract(fi * 0.381 + 0.1);
      float llocal = clamp(0.5 + 0.5 * (lp.y - lc.y) / rad, 0.0, 1.0);
      lava += lf;
      lavaCol += lf * ramp3(clamp(mix(lbase * 0.5, lbase * 0.5 + 0.5, llocal), 0.0, 1.0));
    }
  }

  // sum, then threshold => metaball merging between blobs and ribbon
  float field = ribbon + blobs + lava;

  float liquid = blobs + lava;
  float gooMask = smoothstep(0.05, 0.5, liquid);
  float softE = (blobs * uSoft + lava * uLavaSoft) / max(liquid, 0.0001);
  float lo = mix(0.25 - uBlend * 0.5, mix(0.13, 0.0, softE), gooMask);
  float hi = mix(0.25 + uBlend * 0.5, mix(0.37, 1.0, softE), gooMask);
  float alpha = smoothstep(lo, hi, field);

  // color = weighted average of each contributor's color
  vec3 col = (ribCol + blobCol + lavaCol)
           / max(field, 0.0001);

  float depth = clamp(0.55 + 0.45 * field, 0.0, 1.0);   // pastel edge -> saturated core
  vec3 rgb = mix(vec3(1.0), col, alpha * depth);

  if (uDither > 0.5) {
    const float L = 6.0;
    rgb = floor(rgb * L + bayer8(ivec2(cell))) / L;
  }
  fragColor = vec4(rgb, 1.0);
}
`;

const DEFAULT_STOPS = ['#FFBE98', '#EC2088', '#4C7DFF'];

const toStops = (stops) =>
  stops.map((hex) => {
    const c = new Color(hex);
    return [c.r, c.g, c.b];
  });

export default function Aurora(props) {
  const propsRef = useRef(null);
  propsRef.current = { ...AURORA, ...props };

  // head follows the pointer (or an idle path); satellites chase the one before them
  const mouse = useRef({
    tx: 0.5, ty: 0.5, ts: 0, s: 0,
    p: [{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }]
  });
  const ctnDom = useRef(null);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    const renderer = new Renderer({ alpha: false, antialias: false, depth: false, powerPreference: 'high-performance' });
    const gl = renderer.gl;
    gl.clearColor(1, 1, 1, 1);

    let program;

    function resize() {
      const px = Math.max(curPx, 1);
      const width = Math.max(1, Math.ceil(ctn.offsetWidth / px));
      const height = Math.max(1, Math.ceil(ctn.offsetHeight / px));
      renderer.setSize(width, height); // low-res canvas, scaled up in Aurora.css
      if (program) program.uniforms.uResolution.value = [width, height];
    }
    window.addEventListener('resize', resize);

    // window-level: the canvas sits behind content and would not receive events
    function onMove(e) {
      const m = mouse.current;
      m.cx = e.clientX;
      m.cy = e.clientY;
      m.has = true;
    }
    function onLeave() {
      mouse.current.has = false;
      mouse.current.ts = 0;
    }
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('pointerdown', onMove);
    const onUp = (e) => { if (e.pointerType !== 'mouse') onLeave(); }; // mouse keeps hovering; fingers lift
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;

    const p0 = propsRef.current;
    program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: 1 },
        uColorStops: { value: toStops(p0.colorStops ?? DEFAULT_STOPS) },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uBlend: { value: 0.5 },
        uAngle: { value: -20 },
        uPixel: { value: 3 },
        uDither: { value: 0 },
        uRibbon: { value: 1 },
        uPull: { value: [0.5, 0.5] },
        uPullAmt: { value: 0 },
        uPullRadius: { value: 0.23 },
        uGoo: { value: 0.7 },
        uLava: { value: 1 },
        uLavaCount: { value: 6 },
        uLavaSize: { value: 0.11 },
        uLavaSpeed: { value: 1 },
        uLavaRange: { value: 0.3 },
        uLavaSpread: { value: 0.1 },
        uLavaPos: { value: [0.17, 0.5] },
        uLavaSoft: { value: 0.2 },
        uLavaPull: { value: 1 },
        uShape: { value: 0 },
        uCrop: { value: 0.7 },
        uShapeMorph: { value: 1 },
        uRibbonWidth: { value: 1 },
        uRibbonBend: { value: 1 },
        uRibbonPos: { value: [0, 0] },
        uSoft: { value: 0.9 },
        uB0: { value: [0.5, 0.5] },
        uB1: { value: [0.5, 0.5] },
        uB2: { value: [0.5, 0.5] },
        uMouseStrength: { value: 0 },
        uMouseRadius: { value: 0.26 }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctn.appendChild(gl.canvas);

    // pause entirely when the hero is scrolled out of view
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(ctn);

    let lastStops = p0.colorStops;
    let portraitSrc = null;
    let portraitCfg = null;
    let curPx = Math.max(1, Math.round(p0.pixelSize ?? 2));
    let autoPx = 1, lastT = 0, ema = 16, lastDegrade = 0, lastFrame = 0;

    let animateId = 0;
    const update = (t) => {
      animateId = requestAnimationFrame(update);
      if (!visible) { lastT = 0; return; }
      if (t - lastFrame < 12) return; // ~60fps cap on high-refresh screens
      lastFrame = t;
      const base = propsRef.current;
      const res = program.uniforms.uResolution.value;
      const portrait = res[0] < res[1] * 0.9;
      if (portrait && portraitSrc !== base) { portraitSrc = base; portraitCfg = { ...base, ...AURORA_PORTRAIT }; }
      const p = portrait ? portraitCfg : base;

      // adaptive resolution: if frames are really slow (<25fps), render coarser. Never goes back up.
      const dt = lastT ? Math.min(t - lastT, 100) : 16;
      lastT = t;
      ema = ema * 0.95 + dt * 0.05;
      if (p.adaptive !== false && ema > 40 && autoPx < 4 && t - lastDegrade > 2000) {
        autoPx++;
        lastDegrade = t;
        ema = 16;
      }
      const effPx = Math.max(Math.round(p.pixelSize ?? 2), autoPx);
      if (effPx !== curPx) { curPx = effPx; resize(); }
      const u = program.uniforms;
      const sec = t * 0.001;

      u.uTime.value = sec * (p.speed ?? 1);
      u.uAmplitude.value = p.amplitude ?? 1;
      u.uBlend.value = p.blend ?? 0.5;
      if (p.colorStops !== lastStops) {
        lastStops = p.colorStops;
        u.uColorStops.value = toStops(p.colorStops ?? DEFAULT_STOPS);
      }
      u.uAngle.value = p.angle ?? -20;
      u.uPixel.value = 1; // pixelation now comes from the low-res canvas
      u.uDither.value = (p.dither ?? false) ? 1 : 0;
      u.uRibbon.value = (p.ribbon ?? true) ? 1 : 0;
      u.uRibbonWidth.value = Math.max(p.ribbonWidth ?? 1, 0.2);
      u.uRibbonBend.value = p.ribbonBend ?? 1;
      u.uRibbonPos.value = [p.ribbonX ?? 0, p.ribbonY ?? 0];
      u.uSoft.value = p.blobSoft ?? 0.9;
      u.uShape.value = (p.ribbonShape ?? 'band') === 'sketch' ? 1 : 0;
      u.uCrop.value = p.ribbonCrop ?? 0.7;
      u.uShapeMorph.value = p.shapeMorph ?? 1;

      const on = (p.mouseMode ?? 'on') !== 'off';
      const ease = p.mouseEase ?? 0.07;
      const m = mouse.current;
      if (m.has) {
        const rect = ctn.getBoundingClientRect();
        const x = (m.cx - rect.left) / rect.width;
        const y = 1 - (m.cy - rect.top) / rect.height;
        m.tx = x;
        m.ty = y;
        m.ts = x >= 0 && x <= 1 && y >= 0 && y <= 1 ? 1 : 0;
      }

      // no pointer (or touch): the main blob wanders on its own
      const ix = 0.5 + 0.30 * Math.sin(sec * 0.31) + 0.08 * Math.sin(sec * 0.77);
      const iy = 0.5 + 0.22 * Math.cos(sec * 0.23) + 0.06 * Math.sin(sec * 0.61 + 1);
      const tx = m.ts ? m.tx : ix;
      const ty = m.ts ? m.ty : iy;

      const [a, b, c] = m.p;
      const visc = p.blobVisc ?? 0.7;
      const e0 = ease * (1 - 0.5 * visc);   // viscous: the head drags a little too
      const kb = 0.55 - 0.37 * visc;        // and the string behind it lags more
      const kc = 0.40 - 0.30 * visc;
      a.x += (tx - a.x) * e0;
      a.y += (ty - a.y) * e0;
      b.x += (a.x - b.x) * ease * kb;
      b.y += (a.y - b.y) * ease * kb;
      c.x += (b.x - c.x) * ease * kc;
      c.y += (b.y - c.y) * ease * kc;
      m.s += ((on ? (m.ts ? 1 : 0.6) : 0) - m.s) * 0.06;

      u.uB0.value = [a.x, a.y];
      u.uB1.value = [b.x, b.y];
      u.uB2.value = [c.x, c.y];
      u.uMouseStrength.value = (p.mouseStrength ?? 1) * m.s;
      u.uMouseRadius.value = p.mouseRadius ?? 0.26;

      // elastic pull: spring-driven point + strength, so it overshoots and wobbles back
      const pl = (m.pull ??= { x: 0.5, y: 0.5, vx: 0, vy: 0, s: 0, sv: 0 });
      const damp = 0.70 + 0.2 * (p.pullBounce ?? 0.43);
      const px = m.ts ? m.tx : pl.x;
      const py = m.ts ? m.ty : pl.y;
      pl.vx = pl.vx * damp + (px - pl.x) * 0.06;
      pl.vy = pl.vy * damp + (py - pl.y) * 0.06;
      pl.x += pl.vx;
      pl.y += pl.vy;
      pl.sv = pl.sv * damp + ((m.ts ? 1 : 0) - pl.s) * 0.05;
      pl.s += pl.sv;
      u.uPull.value = [pl.x, pl.y];
      u.uPullAmt.value = (p.pull ?? 0.56) * Math.min(Math.max(pl.s, -0.3), 1.4);
      u.uPullRadius.value = p.pullRadius ?? 0.23;

      u.uGoo.value = p.blobVisc ?? 0.7;
      u.uLava.value = (p.lava ?? true) ? 1 : 0;
      u.uLavaCount.value = Math.min(Math.round(p.lavaCount ?? 6), 8);
      u.uLavaSize.value = p.lavaSize ?? 0.11;
      u.uLavaSpeed.value = p.lavaSpeed ?? 1;
      u.uLavaRange.value = p.lavaRange ?? 0.3;
      u.uLavaSpread.value = p.lavaSpread ?? 0.1;
      u.uLavaPos.value = [p.lavaX ?? 0.17, p.lavaY ?? 0.5];
      u.uLavaSoft.value = p.lavaSoft ?? 0.2;
      u.uLavaPull.value = p.lavaPull ?? 1;

      renderer.render({ scene: mesh });
    };
    animateId = requestAnimationFrame(update);

    resize();

    return () => {
      cancelAnimationFrame(animateId);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('pointerdown', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <div ref={ctnDom} className="aurora-container" />;
}
