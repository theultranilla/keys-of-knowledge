import { prefersReducedMotion } from '../engine/motion.js';
import { VIEW_WIDTH, PALETTE } from '../engine/constants.js';
import { KEY_COLORS } from '../game/entities.js';

// Счётчики поверх игры: монеты, ключи, жизни. Рисуется в экранных координатах —
// камера на HUD не влияет. Текста здесь нет намеренно, только иконки и числа:
// цифры одинаковы на любом языке, поэтому i18n сюда пока не нужен.

const PADDING = 20;
const ROW = 30;
const ICON = 9;
const KEY_FLIGHT_TIME = 0.7;

export function createHud() {
  // Полученный ключ прилетает в свой слот: крупный у места находки, маленький
  // на HUD. Так видно, что именно ты получил и куда оно делось.
  let flight = null;

  function gainKey(keyColor) {
    flight = prefersReducedMotion() ? null : { keyColor, life: KEY_FLIGHT_TIME };
  }

  function update(dt) {
    if (!flight) return;
    flight.life -= dt;
    if (flight.life <= 0) flight = null;
  }

  function draw(ctx, state) {
    ctx.save();
    ctx.font = '700 20px Rubik, system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    drawCoins(ctx, state.coins);
    drawKeys(ctx, state.keys);
    drawLives(ctx, state.lives);
    if (flight) drawKeyFlight(ctx, state.keys.size);

    ctx.restore();
  }

  function drawCoins(ctx, coins) {
    const x = PADDING + ICON;
    const y = PADDING + ICON;

    ctx.fillStyle = PALETTE.amber;
    ctx.beginPath();
    ctx.arc(x, y, ICON, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.chalk;
    ctx.textAlign = 'left';
    ctx.fillText(String(coins), x + ICON + 10, y + 1);
  }

  function drawKeys(ctx, keys) {
    let index = 0;
    for (const keyColor of keys) {
      drawKeyIcon(ctx, PADDING + 8 + index * 26, PADDING + ROW + 12, 1, keyColor);
      index++;
    }
  }

  function drawLives(ctx, lives) {
    for (let index = 0; index < lives; index++) {
      const x = VIEW_WIDTH - PADDING - 12 - index * 26;
      const y = PADDING + ICON;
      ctx.fillStyle = PALETTE.coral;
      ctx.beginPath();
      // Сердце из двух дуг и треугольника — мельче этого читаться перестаёт.
      ctx.arc(x - 4, y - 2, 5, Math.PI, 0);
      ctx.arc(x + 4, y - 2, 5, Math.PI, 0);
      ctx.lineTo(x, y + 9);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawKeyFlight(ctx, keyCount) {
    const progress = 1 - flight.life / KEY_FLIGHT_TIME;
    const eased = progress * progress * (3 - 2 * progress);
    const targetX = PADDING + 8 + Math.max(0, keyCount - 1) * 26;
    const targetY = PADDING + ROW + 12;
    const x = VIEW_WIDTH / 2 + (targetX - VIEW_WIDTH / 2) * eased;
    const y = 300 + (targetY - 300) * eased;

    ctx.globalAlpha = 1 - eased * 0.3;
    drawKeyIcon(ctx, x, y, 2.6 - 1.6 * eased, flight.keyColor);
    ctx.globalAlpha = 1;
  }

  function drawKeyIcon(ctx, x, y, scale, keyColor) {
    const color = KEY_COLORS[keyColor] ?? PALETTE.chalk;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(-3, -3, 4.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(7, 7);
    ctx.moveTo(4.5, 7);
    ctx.lineTo(6.5, 5);
    ctx.stroke();

    ctx.restore();
  }

  return { gainKey, update, draw };
}
