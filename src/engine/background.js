import { prefersReducedMotion } from './motion.js';
import { VIEW_WIDTH, VIEW_HEIGHT, PARALLAX_FAR, PARALLAX_NEAR } from './constants.js';

// Закатное мультяшное небо: градиент, мягкое солнце у горизонта, два слоя холмов
// и облака — всё с параллаксом, чтобы у плоской сцены была глубина. Тёмный верх
// держит контраст со светлым героем в прыжке. prefers-reduced-motion замораживает
// движение слоёв (иначе разноскоростной параллакс укачивает).

const SKY_TOP = '#33285e', SKY_MID = '#8a4a7a', SKY_LOW = '#e6864f';
const HILL_FAR = '#5c4275', HILL_NEAR = '#38284e';
const SUN = '#ffd07a', SUN_GLOW = 'rgba(255,190,120,0.35)';
const CLOUD = 'rgba(255,226,205,0.55)';

const FAR_STARS = 26;

export function createBackground() {
  const stars = createStars(FAR_STARS, 20260727);
  const clouds = createClouds(6, 771931);
  let sky = null, skyH = 0;

  function draw(ctx, camera) {
    if (!sky || skyH !== VIEW_HEIGHT) {
      sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
      sky.addColorStop(0, SKY_TOP);
      sky.addColorStop(0.55, SKY_MID);
      sky.addColorStop(1, SKY_LOW);
      skyH = VIEW_HEIGHT;
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const reduced = prefersReducedMotion();
    const ox = reduced ? 0 : camera.x;

    // редкие звёзды в верхней трети (только там, где небо тёмное)
    ctx.fillStyle = '#fdeecf';
    for (const s of stars) {
      const x = wrap(s.x - ox * PARALLAX_FAR * 0.5, VIEW_WIDTH);
      ctx.globalAlpha = s.alpha;
      ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // солнце у горизонта (двигается медленнее всего)
    const sunX = wrap(VIEW_WIDTH * 0.72 - ox * PARALLAX_FAR * 0.4, VIEW_WIDTH + 200) - 100;
    const sunY = VIEW_HEIGHT * 0.62;
    const glow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 90);
    glow.addColorStop(0, SUN_GLOW); glow.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sunX, sunY, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = SUN; ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, Math.PI * 2); ctx.fill();

    // облака (средний параллакс)
    for (const c of clouds) {
      const x = wrap(c.x - ox * PARALLAX_NEAR * 0.6, VIEW_WIDTH + 220) - 110;
      cloud(ctx, x, c.y, c.s);
    }

    // холмы: дальние (светлее, выше) и ближние (темнее, ниже)
    hills(ctx, VIEW_HEIGHT * 0.72, 56, 380, HILL_FAR, ox * PARALLAX_FAR);
    hills(ctx, VIEW_HEIGHT * 0.82, 92, 260, HILL_NEAR, ox * PARALLAX_NEAR);
  }

  return { draw };
}

// Слой холмов: гладкие горбы синусом, замкнутые до низа экрана, бесшовно
// повторяются при любом сдвиге камеры.
function hills(ctx, baseY, amp, period, color, offset) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const start = -period - (((offset % period) + period) % period);
  ctx.moveTo(start, VIEW_HEIGHT);
  ctx.lineTo(start, baseY);
  for (let x = start; x <= VIEW_WIDTH + period; x += period) {
    ctx.quadraticCurveTo(x + period / 2, baseY - amp, x + period, baseY);
  }
  ctx.lineTo(VIEW_WIDTH + period, VIEW_HEIGHT);
  ctx.closePath();
  ctx.fill();
}

// Облако — три перекрывающихся эллипса.
function cloud(ctx, x, y, s) {
  ctx.fillStyle = CLOUD;
  ctx.beginPath();
  ctx.ellipse(x, y, 26 * s, 15 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 24 * s, y + 4 * s, 20 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 24 * s, y + 5 * s, 18 * s, 11 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function wrap(v, size) { return ((v % size) + size) % size; }

function rng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function createStars(n, seed) {
  const r = rng(seed), a = [];
  for (let i = 0; i < n; i++) a.push({ x: r() * VIEW_WIDTH, y: r() * VIEW_HEIGHT * 0.34, r: 0.6 + r() * 1.2, alpha: 0.3 + r() * 0.5 });
  return a;
}
function createClouds(n, seed) {
  const r = rng(seed), a = [];
  for (let i = 0; i < n; i++) a.push({ x: r() * VIEW_WIDTH, y: VIEW_HEIGHT * (0.12 + r() * 0.35), s: 0.7 + r() * 0.8 });
  return a;
}
