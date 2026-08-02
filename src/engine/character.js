import { roundedRect } from './shapes.js';
import { PALETTE } from './constants.js';
import { COSMETICS_BY_ID, DEFAULT_SKIN } from '../game/skins.js';

// Отрисовка персонажа с надетой косметикой. Один код рисует и игрока в игре
// (renderer.js), и превью в гардеробе (ui): так они не могут разойтись.
//
// Ноль ассетов: всё — фигуры. Геометрия задаётся в долях от w×h, поэтому
// одинаково работает и на игроке 22×30, и на увеличенном превью.

export function drawCharacter(ctx, x, y, w, h, skin = DEFAULT_SKIN, facing = 1) {
  const pick = (category) => COSMETICS_BY_ID.get(skin?.[category]) ?? COSMETICS_BY_ID.get(DEFAULT_SKIN[category]);
  const body = pick('body');
  const shirt = pick('shirt');
  const pants = pick('pants');
  const hat = pick('hat');
  const beard = pick('beard');

  const sx = w / 22;
  const sy = h / 30;
  const unit = Math.min(sx, sy);
  const radius = 6 * unit;

  // Тело.
  ctx.fillStyle = body?.color ?? PALETTE.chalk;
  roundedRect(ctx, x, y, w, h, radius);
  ctx.fill();

  // Одежду обрезаем по силуэту тела, чтобы полосы не торчали за скруглённые углы.
  if (pants?.color || shirt?.color) {
    ctx.save();
    roundedRect(ctx, x, y, w, h, radius);
    ctx.clip();
    if (pants?.color) {
      ctx.fillStyle = pants.color;
      ctx.fillRect(x, y + h * 0.66, w, h * 0.34);
    }
    if (shirt?.color) {
      ctx.fillStyle = shirt.color;
      ctx.fillRect(x, y + h * 0.42, w, h * 0.25);
    }
    ctx.restore();
  }

  // Янтарный фонарик смотрит туда же, куда бежит игрок.
  ctx.fillStyle = PALETTE.amber;
  const lampX = facing > 0 ? x + w - 8 * sx : x + 2 * sx;
  roundedRect(ctx, lampX, y + 7 * sy, 6 * sx, 6 * sy, 2 * unit);
  ctx.fill();

  // Глаза.
  ctx.fillStyle = PALETTE.skyDeep;
  const eyeX = facing > 0 ? x + 12 * sx : x + 6 * sx;
  ctx.fillRect(eyeX, y + 8 * sy, 3 * sx, 4 * sy);
  ctx.fillRect(eyeX - 5 * sx, y + 8 * sy, 3 * sx, 4 * sy);

  if (beard?.style) drawBeard(ctx, x, y, w, h, beard);
  if (hat?.style) drawHat(ctx, x, y, w, h, hat, facing);
}

function drawBeard(ctx, x, y, w, h, beard) {
  ctx.fillStyle = beard.color;
  const top = y + h * 0.42;
  const centerX = x + w / 2;
  const bottom = beard.style === 'long' ? y + h * 0.9 : y + h * 0.6;

  ctx.beginPath();
  ctx.moveTo(x + w * 0.18, top);
  ctx.lineTo(x + w * 0.82, top);
  ctx.lineTo(centerX, bottom);
  ctx.closePath();
  ctx.fill();
}

function drawHat(ctx, x, y, w, h, hat, facing) {
  ctx.fillStyle = hat.color;
  const centerX = x + w / 2;
  const brimY = y + h * 0.1; // низ шапки чуть ниже макушки
  const unit = Math.min(w / 22, h / 30);

  switch (hat.style) {
    case 'beanie': {
      ctx.beginPath();
      ctx.moveTo(x, brimY);
      ctx.quadraticCurveTo(centerX, y - h * 0.22, x + w, brimY);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x, brimY - 2 * unit, w, 3 * unit); // отворот
      break;
    }
    case 'cap': {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.12, brimY);
      ctx.quadraticCurveTo(centerX, y - h * 0.18, x + w * 0.88, brimY);
      ctx.closePath();
      ctx.fill();
      // Козырёк в сторону движения.
      const peakX = facing > 0 ? x + w * 0.55 : x - w * 0.05;
      ctx.fillRect(peakX, brimY - unit, w * 0.5, 3 * unit);
      break;
    }
    case 'wizard': {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.15, brimY);
      ctx.lineTo(x + w * 0.85, brimY);
      ctx.lineTo(centerX, y - h * 0.55);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'crown': {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.15, brimY);
      ctx.lineTo(x + w * 0.15, y - h * 0.04);
      ctx.lineTo(x + w * 0.33, brimY - h * 0.03);
      ctx.lineTo(centerX, y - h * 0.2);
      ctx.lineTo(x + w * 0.67, brimY - h * 0.03);
      ctx.lineTo(x + w * 0.85, y - h * 0.04);
      ctx.lineTo(x + w * 0.85, brimY);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      break;
  }
}
