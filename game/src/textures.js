// Procedural canvas textures: every surface in Verde Cay is painted in code,
// no image files. Each texture is drawn once at load and reused everywhere.
import * as THREE from 'three';
import { RNG } from './random.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeTextures() {
  const rng = new RNG(20261122);
  const out = {};

  // --- Asphalt with a worn centre line and speckle -----------------------
  {
    const [c, g] = canvas(256, 256);
    g.fillStyle = '#33333a';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const v = rng.int(38, 74);
      g.fillStyle = `rgb(${v},${v},${v + 6})`;
      g.fillRect(rng.range(0, 256), rng.range(0, 256), 2, 2);
    }
    g.fillStyle = '#c9a227';
    g.fillRect(124, 0, 8, 256);
    out.asphalt = tex(c, 6, 6);
  }

  // --- Sidewalk slabs ------------------------------------------------------
  {
    const [c, g] = canvas(256, 256);
    g.fillStyle = '#8d8578';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const v = rng.int(120, 155);
      g.fillStyle = `rgb(${v},${v - 6},${v - 18})`;
      g.fillRect(rng.range(0, 256), rng.range(0, 256), 3, 3);
    }
    g.strokeStyle = '#6d675c';
    g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
    }
    out.sidewalk = tex(c, 8, 8);
  }

  // --- Sand ----------------------------------------------------------------
  {
    const [c, g] = canvas(256, 256);
    g.fillStyle = '#d9b77c';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) {
      const v = rng.int(190, 235);
      g.fillStyle = `rgb(${v},${v - 22},${v - 70})`;
      g.fillRect(rng.range(0, 256), rng.range(0, 256), 2, 2);
    }
    out.sand = tex(c, 10, 10);
  }

  // --- Wood planks (marina deck) -------------------------------------------
  {
    const [c, g] = canvas(256, 256);
    for (let p = 0; p < 8; p++) {
      const v = rng.int(96, 130);
      g.fillStyle = `rgb(${v + 28},${v - 4},${v - 52})`;
      g.fillRect(0, p * 32, 256, 32);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, p * 32, 256, 2);
      for (let i = 0; i < 14; i++) {
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.fillRect(rng.range(0, 256), p * 32 + rng.range(4, 28), 18, 2);
      }
    }
    out.wood = tex(c, 6, 6);
  }

  // --- Water: deep teal with moving light streaks --------------------------
  {
    const [c, g] = canvas(256, 256);
    const grad = g.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#0e5f6e');
    grad.addColorStop(0.5, '#0a4a5c');
    grad.addColorStop(1, '#0d6b74');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = `rgba(190,235,240,${rng.range(0.05, 0.22)})`;
      g.lineWidth = rng.range(1, 3);
      const y = rng.range(0, 256);
      g.beginPath();
      g.moveTo(rng.range(0, 200), y);
      g.lineTo(rng.range(60, 256), y + rng.range(-8, 8));
      g.stroke();
    }
    out.water = tex(c, 12, 12);
  }

  // --- Building facades: five variants, lit windows, warm sunset grade -----
  const facadePalettes = [
    ['#c96f4a', '#e8a56b', '#7d3b2e'],
    ['#4a7d8c', '#6fa8b5', '#2e4a56'],
    ['#b59a5e', '#d9bd7f', '#6d5626'],
    ['#8c5a7d', '#b57fa8', '#4d2c46'],
    ['#5e7d4a', '#8aa86f', '#33482a'],
  ];
  facadePalettes.forEach((pal, idx) => {
    const [c, g] = canvas(256, 256);
    g.fillStyle = pal[0];
    g.fillRect(0, 0, 256, 256);
    // faint vertical panel seams
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 2, 256);
    // windows: 6 columns x 8 rows, some lit gold
    for (let r = 0; r < 8; r++) {
      for (let col = 0; col < 6; col++) {
        const x = 14 + col * 40;
        const y = 12 + r * 30;
        const lit = rng.chance(0.55);
        g.fillStyle = lit ? (rng.chance(0.7) ? '#ffd27a' : '#ff9d5c') : '#20242e';
        g.fillRect(x, y, 24, 18);
        g.fillStyle = 'rgba(255,255,255,0.14)';
        g.fillRect(x, y, 24, 4);
      }
    }
    // ground-floor shopfront band
    g.fillStyle = pal[2];
    g.fillRect(0, 236, 256, 20);
    out['facade' + idx] = tex(c, 1, 1);
  });

  // --- Roof: dark with AC boxes and a water tank hint -----------------------
  {
    const [c, g] = canvas(128, 128);
    g.fillStyle = '#3a3a40';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) {
      const v = rng.int(48, 76);
      g.fillStyle = `rgb(${v},${v},${v + 4})`;
      g.fillRect(rng.range(0, 128), rng.range(0, 128), 2, 2);
    }
    g.fillStyle = '#55555e';
    g.fillRect(20, 24, 26, 18);
    g.fillRect(80, 70, 22, 16);
    out.roof = tex(c, 2, 2);
  }

  // --- Palm bark -------------------------------------------------------------
  {
    const [c, g] = canvas(128, 128);
    g.fillStyle = '#6d4c33';
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 10) {
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(0, y, 128, 3);
      g.fillStyle = 'rgba(255,220,170,0.12)';
      g.fillRect(0, y + 3, 128, 2);
    }
    out.palmBark = tex(c, 1, 2);
  }

  // --- Palm leaf -------------------------------------------------------------
  {
    const [c, g] = canvas(128, 128);
    g.clearRect(0, 0, 128, 128);
    g.strokeStyle = '#2f7d3a';
    g.lineWidth = 5;
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      g.beginPath();
      g.moveTo(64, 64);
      g.quadraticCurveTo(64 + Math.cos(a) * 34, 64 + Math.sin(a) * 34, 64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58 + 14);
      g.stroke();
    }
    out.palmLeaf = tex(c, 1, 1);
  }

  // --- Lighthouse stripes ----------------------------------------------------
  {
    const [c, g] = canvas(128, 256);
    for (let s = 0; s < 6; s++) {
      g.fillStyle = s % 2 === 0 ? '#e8452c' : '#f5f0e6';
      g.fillRect(0, s * 44, 128, 44);
    }
    out.lighthouse = tex(c, 1, 1);
  }

  // --- Neon signs ------------------------------------------------------------
  const signs = [
    ['PALM MART', '#ff5c8a'],
    ['NEON GRILL', '#ffb347'],
    ['SUNSET FM', '#7df0ff'],
    ['HARBOUR', '#9dff6e'],
    ['HOTEL VERDE', '#ff8a5c'],
  ];
  signs.forEach(([text, color], i) => {
    const [c, g] = canvas(512, 128);
    g.fillStyle = '#14101c';
    g.fillRect(0, 0, 512, 128);
    g.font = 'bold 64px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 26;
    g.fillStyle = color;
    g.fillText(text, 256, 66);
    g.shadowBlur = 0;
    g.fillStyle = '#ffffff';
    g.fillText(text, 256, 66);
    out['neon' + i] = tex(c, 1, 1);
  });

  // --- Crosswalk ---------------------------------------------------------------
  {
    const [c, g] = canvas(128, 128);
    g.fillStyle = '#33333a';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#e8e4da';
    for (let i = 0; i < 6; i++) g.fillRect(8 + i * 20, 8, 10, 112);
    out.crosswalk = tex(c, 1, 1);
  }

  // --- Soft round smoke puff ---------------------------------------------------
  {
    const [c, g] = canvas(128, 128);
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(200,200,200,0.85)');
    grad.addColorStop(0.6, 'rgba(160,160,160,0.4)');
    grad.addColorStop(1, 'rgba(160,160,160,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    out.smoke = tex(c, 1, 1);
  }

  // --- Sunset sky gradient (equirect-ish strip) -------------------------------
  {
    const [c, g] = canvas(64, 512);
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#3d2b7a');
    grad.addColorStop(0.35, '#7b4fd0');
    grad.addColorStop(0.55, '#e2607a');
    grad.addColorStop(0.72, '#ff9a52');
    grad.addColorStop(0.85, '#ffb347');
    grad.addColorStop(1.0, '#2a1f3d');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 512);
    out.sky = tex(c, 1, 1);
  }

  return out;
}
