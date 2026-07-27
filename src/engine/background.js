import { prefersReducedMotion } from './motion.js';
import {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  PALETTE,
  PARALLAX_FAR,
  PARALLAX_NEAR
} from './constants.js';

// Ночное небо с созвездиями в два слоя. Дальний слой почти неподвижен, ближний
// заметно отстаёт от мира — так у плоской сцены появляется глубина.

const FAR_STARS = 70;
const NEAR_STARS = 34;

export function createBackground() {
  const far = createStars(FAR_STARS, 20260727, 0.5, 1.4, 0.18, 0.45);
  const near = createStars(NEAR_STARS, 991733, 1.1, 2.2, 0.45, 0.85);

  let sky = null;
  let skyHeight = 0;

  function draw(ctx, camera) {
    if (!sky || skyHeight !== VIEW_HEIGHT) {
      sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
      sky.addColorStop(0, PALETTE.skyDeep);
      sky.addColorStop(1, PALETTE.skyMid);
      skyHeight = VIEW_HEIGHT;
    }

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // При prefers-reduced-motion фон замирает: движущиеся с разной скоростью
    // слои — ровно тот эффект, от которого людям с вестибулярной чувствительностью
    // становится плохо.
    const reduced = prefersReducedMotion();
    const offsetX = reduced ? 0 : camera.x;
    const offsetY = reduced ? 0 : camera.y;

    drawLayer(ctx, far, offsetX * PARALLAX_FAR, offsetY * PARALLAX_FAR);
    drawLayer(ctx, near, offsetX * PARALLAX_NEAR, offsetY * PARALLAX_NEAR);
  }

  return { draw };
}

function drawLayer(ctx, stars, offsetX, offsetY) {
  ctx.fillStyle = PALETTE.chalk;
  for (const star of stars) {
    // Слой замкнут сам на себя по горизонтали: звёзды не кончаются, сколько бы
    // ни ехала камера, и хранить их для всего уровня не нужно.
    const x = wrap(star.x - offsetX, VIEW_WIDTH);
    const y = star.y - offsetY * 0.5;
    if (y < -4 || y > VIEW_HEIGHT + 4) continue;

    ctx.globalAlpha = star.alpha;
    ctx.beginPath();
    ctx.arc(x, y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function wrap(value, size) {
  return ((value % size) + size) % size;
}

// Свой крошечный ГПСЧ: созвездия должны быть одинаковыми между перезагрузками
// и не перерисовываться при каждом ресайзе. Настоящий сидируемый rng для
// генераторов задач появится на Этапе 4, здесь он был бы лишней связью.
function createStars(count, seed, minRadius, maxRadius, minAlpha, maxAlpha) {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  const stars = [];
  for (let index = 0; index < count; index++) {
    stars.push({
      x: random() * VIEW_WIDTH,
      y: random() * VIEW_HEIGHT,
      radius: minRadius + random() * (maxRadius - minRadius),
      alpha: minAlpha + random() * (maxAlpha - minAlpha)
    });
  }
  return stars;
}
