// Verde Cay — procedural canvas textures. Every texture in the game is drawn
// here at load time from plain 2D canvas calls; no image files are shipped.
import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function speckle(ctx, w, h, n, colours, size = 2) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colours[(Math.random() * colours.length) | 0];
    ctx.globalAlpha = 0.12 + Math.random() * 0.25;
    ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
  ctx.globalAlpha = 1;
}

export function asphaltTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#3a3a40'; ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, 2600, ['#4a4a52', '#2e2e34', '#55555e', '#63636c'], 2);
  // Faded centre line dashes.
  ctx.fillStyle = 'rgba(240,200,90,0.75)';
  for (let y = 0; y < 256; y += 64) ctx.fillRect(124, y + 8, 8, 34);
  // Worn tyre tracks.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(52, 0, 26, 256); ctx.fillRect(178, 0, 26, 256);
  return toTexture(c, 6, 6);
}

export function sandTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#d9b380'; ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, 3200, ['#e8c99a', '#c49a62', '#f0d6a8', '#b98d55'], 2);
  return toTexture(c, 10, 10);
}

export function grassTexture() {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#4a6b35'; ctx.fillRect(0, 0, 128, 128);
  speckle(ctx, 128, 128, 1400, ['#5d8143', '#3c5a2c', '#6d9450'], 2);
  return toTexture(c, 12, 12);
}

const FACADE_BASE = ['#c96f4a', '#7d8aa0', '#b8a06a', '#8a6f8e', '#5f7d6a'];
const FACADE_TRIM = ['#f2e3c9', '#2f3a4a', '#fff1d6', '#e8d8c0', '#dfe8e0'];

// Five facade variants: warm stucco blocks with rows of lit windows, a shop
// awning at street level and a parapet line at the top.
export function facadeTextures() {
  const out = [];
  for (let v = 0; v < 5; v++) {
    const [c, ctx] = makeCanvas(256, 512);
    ctx.fillStyle = FACADE_BASE[v]; ctx.fillRect(0, 0, 256, 512);
    speckle(ctx, 256, 512, 900, ['#00000022', '#ffffff18'], 3);
    // Parapet and trim bands.
    ctx.fillStyle = FACADE_TRIM[v]; ctx.fillRect(0, 0, 256, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 14, 256, 6);
    // Window grid: 4 across, 7 up, some lit gold, some dark, some shuttered.
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 4; col++) {
        const x = 18 + col * 58, y = 44 + row * 58;
        const lit = Math.random();
        ctx.fillStyle = '#20242c'; ctx.fillRect(x - 3, y - 3, 44, 54);
        if (lit < 0.55) {
          const warm = ['#ffd27a', '#ffb84d', '#ffe9a8'][(Math.random() * 3) | 0];
          ctx.fillStyle = warm; ctx.fillRect(x, y, 38, 48);
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 17, y, 3, 48);
        } else if (lit < 0.8) {
          ctx.fillStyle = '#3d4a5c'; ctx.fillRect(x, y, 38, 48);
          ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x, y, 38, 14);
        } else {
          ctx.fillStyle = '#6b5a48'; ctx.fillRect(x, y, 38, 48);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          for (let s = 0; s < 4; s++) ctx.fillRect(x, y + 8 + s * 11, 38, 3);
        }
      }
    }
    // Street-level shopfront with awning.
    ctx.fillStyle = '#1c1a20'; ctx.fillRect(10, 452, 236, 60);
    ctx.fillStyle = ['#ff5d8f', '#38bdf8', '#facc15', '#4ade80', '#fb923c'][v];
    ctx.fillRect(10, 436, 236, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
    ctx.fillText(['CAFÉ SOL', 'TIDES BAR', 'PALM MART', 'SURF SHOP', 'NEON GRILL'][v], 128, 490);
    out.push(toTexture(c));
  }
  return out;
}

export function woodTexture() {
  const [c, ctx] = makeCanvas(256, 128);
  ctx.fillStyle = '#7a5230'; ctx.fillRect(0, 0, 256, 128);
  for (let p = 0; p < 5; p++) {
    ctx.fillStyle = p % 2 ? '#835a36' : '#6f4a2a';
    ctx.fillRect(0, p * 26, 256, 24);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 30; i++) ctx.fillRect(Math.random() * 256, p * 26 + 4 + Math.random() * 16, 8 + Math.random() * 20, 1);
  }
  return toTexture(c, 4, 1);
}

export function waterNormalTexture() {
  // A soft blue-green noise field used as the sea's normal-ish detail map.
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#1d6f8f'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.12})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const y = Math.random() * 256;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(80, y - 12 + Math.random() * 24, 170, y - 12 + Math.random() * 24, 256, y);
    ctx.stroke();
  }
  speckle(ctx, 256, 256, 500, ['#2a8fb5', '#155e7d'], 2);
  return toTexture(c, 8, 8);
}

export function palmBarkTexture() {
  const [c, ctx] = makeCanvas(128, 256);
  ctx.fillStyle = '#6b4a2f'; ctx.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 256; y += 14) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(0, y, 128, 4);
    ctx.fillStyle = 'rgba(255,220,170,0.12)'; ctx.fillRect(0, y + 4, 128, 3);
  }
  return toTexture(c, 1, 2);
}

export function palmLeafTexture() {
  const [c, ctx] = makeCanvas(256, 128);
  ctx.clearRect(0, 0, 256, 128);
  ctx.strokeStyle = '#2f7d3a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x0 = 128, y0 = 120, ang = Math.PI * (0.15 + (i / 8) * 0.7);
    const x1 = x0 + Math.cos(Math.PI + ang) * 110, y1 = y0 - Math.sin(ang) * 95;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, y1 - 30, x1, y1 + 18);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function neonSignTexture(text, colour) {
  const [c, ctx] = makeCanvas(512, 128);
  ctx.fillStyle = '#14081c'; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = colour; ctx.lineWidth = 4; ctx.strokeRect(8, 8, 496, 112);
  ctx.font = '900 64px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = colour; ctx.shadowBlur = 26;
  ctx.fillStyle = colour;
  ctx.fillText(text, 256, 68);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 256, 68);
  return toTexture(c);
}

export function badgeTexture() {
  // VCPD door badge: gold star on navy, drawn once and reused on cruisers.
  const [c, ctx] = makeCanvas(128, 128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#0f2a52'; ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(64, 64, 52, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const a2 = a + Math.PI / 5;
    ctx.lineTo(64 + Math.cos(a) * 34, 64 + Math.sin(a) * 34);
    ctx.lineTo(64 + Math.cos(a2) * 15, 64 + Math.sin(a2) * 15);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0f2a52'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
  ctx.fillText('VCPD', 64, 104);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crosswalkTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#2b2b30'; ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(240,240,235,0.85)';
  for (let i = 0; i < 8; i++) ctx.fillRect(10 + i * 31, 20, 18, 216);
  return toTexture(c);
}
