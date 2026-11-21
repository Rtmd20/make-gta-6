// Procedural textures for Verde Cay — every texture is drawn on a canvas in
// code, so the game stays self-contained with no network requests and no
// borrowed art. Asphalt, facades, sand, wood, water, palm and neon signs.
import * as THREE from 'three';

function canvasTex(w, h, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// A seeded pseudo-random so textures are stable across runs.
function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function asphaltTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#26292f'; g.fillRect(0, 0, w, h);
    const r = mulberry(7);
    for (let i = 0; i < 2600; i += 1) {
      const v = 28 + r() * 30;
      g.fillStyle = `rgba(${v},${v + 2},${v + 6},${0.25 + r() * 0.3})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    // Wear patches and faint tyre lines.
    for (let i = 0; i < 14; i += 1) {
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.beginPath(); g.ellipse(r() * w, r() * h, 18 + r() * 30, 8 + r() * 14, r() * 3, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fillRect(0, 60, w, 10); g.fillRect(0, 190, w, 10);
  }, 8, 8);
}

export function asphaltNormalTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8080ff'; g.fillRect(0, 0, w, h);
    const r = mulberry(21);
    for (let i = 0; i < 1800; i += 1) {
      const v = 110 + Math.floor(r() * 40);
      g.fillStyle = `rgb(${v},${v},255)`;
      g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
    }
  }, 8, 8);
}

// One facade variant: base colour, window grid (some warm-lit), ground-floor
// shops with awnings, and a darker top floor. Returns { map, emissiveMap }.
export function facadeTextures(base, trim, seed) {
  const lit = [];
  const r = mulberry(seed);
  const map = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // Subtle vertical grime and panel seams.
    for (let i = 0; i < 40; i += 1) {
      g.fillStyle = 'rgba(0,0,0,0.05)';
      g.fillRect(r() * w, 0, 2 + r() * 6, h);
    }
    const cols = 5; const rows = 9;
    const cw = w / cols; const rh = h / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = col * cw + cw * 0.2; const y = row * rh + rh * 0.2;
        const ww = cw * 0.6; const hh = rh * 0.6;
        // Half the windows are warm-lit at sunset, so the towers glow.
        const isLit = r() < 0.5;
        if (isLit) lit.push([x, y, ww, hh]);
        g.fillStyle = isLit ? '#ffd9a0' : '#20242c';
        g.fillRect(x, y, ww, hh);
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
        g.strokeRect(x, y, ww, hh);
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + hh); g.stroke();
        // Balcony rail on some floors.
        if (row > 0 && r() < 0.35) {
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.fillRect(x - 2, y + hh + 2, ww + 4, 4);
        }
      }
    }
    // Ground floor: shopfronts with striped awnings.
    g.fillStyle = trim; g.fillRect(0, h - 64, w, 64);
    for (let col = 0; col < cols; col += 1) {
      const x = col * cw;
      g.fillStyle = col % 2 ? '#f2e6b8' : '#e8481f';
      g.fillRect(x, h - 64, cw, 14);
      g.fillStyle = '#1c2733';
      g.fillRect(x + 6, h - 46, cw - 12, 30);
      g.fillStyle = 'rgba(255,210,120,0.85)';
      g.fillRect(x + 10, h - 42, cw - 20, 22);
    }
  });
  const emissiveMap = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (const [x, y, ww, hh] of lit) {
      g.fillStyle = '#ffbe6b';
      g.fillRect(x, y, ww, hh);
    }
    g.fillStyle = '#3a2a10';
    g.fillRect(0, h - 64, w, 64);
  });
  return { map, emissiveMap };
}

export function sandTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e0bd7e'; g.fillRect(0, 0, w, h);
    const r = mulberry(33);
    for (let i = 0; i < 3200; i += 1) {
      const v = 200 + Math.floor(r() * 55);
      g.fillStyle = `rgba(${v},${Math.floor(v * 0.82)},${Math.floor(v * 0.55)},0.5)`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    // Short faint ripples (long strokes read as wooden planks at game scale).
    g.strokeStyle = 'rgba(120,90,40,0.10)'; g.lineWidth = 2;
    for (let y = 10; y < h; y += 26) {
      for (let x = 0; x < w; x += 42) {
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + 14, y + 3, x + 30, y);
        g.stroke();
      }
    }
  }, 12, 12);
}

export function woodTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a6b45'; g.fillRect(0, 0, w, h);
    const r = mulberry(55);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.12})`;
      g.fillRect(0, y, w, 3);
      for (let i = 0; i < 24; i += 1) {
        g.strokeStyle = 'rgba(60,40,18,0.35)'; g.lineWidth = 1;
        g.beginPath();
        const yy = y + 4 + r() * 24;
        g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + r() * 4 - 2, w * 0.7, yy + r() * 4 - 2, w, yy);
        g.stroke();
      }
    }
  }, 2, 6);
}

export function waterNormalTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8080ff'; g.fillRect(0, 0, w, h);
    const r = mulberry(77);
    for (let i = 0; i < 90; i += 1) {
      const x = r() * w; const y = r() * h; const rad = 8 + r() * 26;
      const grad = g.createRadialGradient(x, y, 1, x, y, rad);
      grad.addColorStop(0, 'rgba(160,160,255,0.8)');
      grad.addColorStop(1, 'rgba(128,128,255,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
  }, 10, 10);
}

export function palmFrondTexture() {
  return canvasTex(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // One solid palm leaf: a long tapered blade with a darker centre rib and
    // serrated edges, filled green so it reads from any angle.
    g.fillStyle = '#3f9e52';
    g.beginPath();
    g.moveTo(w / 2, 0);
    g.quadraticCurveTo(w * 0.92, h * 0.35, w * 0.62, h);
    g.quadraticCurveTo(w * 0.5, h * 0.7, w * 0.38, h);
    g.quadraticCurveTo(w * 0.08, h * 0.35, w / 2, 0);
    g.fill();
    // Serrations: darker notches along both edges.
    g.fillStyle = '#2f7a3e';
    for (let y = 30; y < h - 10; y += 22) {
      const spread = 14 + (y / h) * 26;
      g.beginPath(); g.moveTo(w / 2 - spread, y); g.lineTo(w / 2 - spread - 10, y + 12); g.lineTo(w / 2 - spread + 2, y + 16); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(w / 2 + spread, y); g.lineTo(w / 2 + spread + 10, y + 12); g.lineTo(w / 2 + spread - 2, y + 16); g.closePath(); g.fill();
    }
    g.strokeStyle = '#2f7a3e'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(w / 2, 4); g.lineTo(w / 2, h - 6); g.stroke();
  });
}

export function palmBarkTexture() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#7a5a38'; g.fillRect(0, 0, w, h);
    const r = mulberry(91);
    for (let y = 0; y < h; y += 18) {
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.fillRect(0, y, w, 5);
      g.fillStyle = 'rgba(255,220,170,0.14)';
      g.fillRect(0, y + 5, w, 3);
      for (let i = 0; i < 6; i += 1) {
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.fillRect(r() * w, y + r() * 16, 3 + r() * 8, 2);
      }
    }
  }, 1, 2);
}

// Neon sign: glowing text on a dark board, used as an emissive map + map.
export function neonSignTexture(text, fg, bg) {
  const map = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg;
    g.font = 'bold 64px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = fg; g.shadowBlur = 22;
    g.fillText(text, w / 2, h / 2 + 2);
  });
  const emissiveMap = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    g.font = 'bold 64px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
  return { map, emissiveMap };
}
