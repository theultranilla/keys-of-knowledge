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
  const outfit = pick('outfit');
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

  // Наряд поверх рубашки/штанов — из него собирается образ (маг/ассасин/принцесса).
  if (outfit?.style) drawOutfit(ctx, x, y, w, h, outfit);

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

// Крупная одежда во весь силуэт. Торс/ноги закрашиваются в силуэте тела (clip),
// а юбка платья и наплечники рыцаря могут выходить за него — как шапки рисуются
// выше макушки.
function drawOutfit(ctx, x, y, w, h, outfit) {
  const cx = x + w / 2;
  const unit = Math.min(w / 22, h / 30);
  const clipBody = () => { roundedRect(ctx, x, y, w, h, 6 * unit); ctx.clip(); };

  switch (outfit.style) {
    case 'robe': {
      ctx.save(); clipBody();
      ctx.fillStyle = outfit.color;
      ctx.fillRect(x, y + h * 0.38, w, h * 0.62);
      ctx.fillStyle = 'rgba(255,255,255,0.30)'; // светлый кант по центру
      ctx.fillRect(cx - w * 0.05, y + h * 0.4, w * 0.1, h * 0.6);
      ctx.restore();
      break;
    }
    case 'cloak': {
      ctx.save(); clipBody();
      ctx.fillStyle = outfit.color;
      ctx.fillRect(x, y + h * 0.33, w, h * 0.67);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; // пояс
      ctx.fillRect(x, y + h * 0.6, w, h * 0.05);
      ctx.restore();
      break;
    }
    case 'knight': {
      ctx.save(); clipBody();
      ctx.fillStyle = outfit.color;
      ctx.fillRect(x, y + h * 0.34, w, h * 0.66);
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; // блик на нагруднике
      ctx.fillRect(x + w * 0.2, y + h * 0.4, w * 0.25, h * 0.18);
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; // линия пояса
      ctx.fillRect(x, y + h * 0.62, w, h * 0.04);
      ctx.restore();
      ctx.fillStyle = outfit.color; // наплечники поверх силуэта
      ctx.beginPath(); ctx.arc(x + w * 0.16, y + h * 0.37, w * 0.16, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w * 0.84, y + h * 0.37, w * 0.16, Math.PI, 0); ctx.fill();
      break;
    }
    case 'dress': {
      ctx.save(); clipBody(); // корсаж в силуэте
      ctx.fillStyle = outfit.color;
      ctx.fillRect(x, y + h * 0.42, w, h * 0.2);
      ctx.restore();
      ctx.fillStyle = outfit.color; // юбка-колокол — расширяется за силуэт
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.26, y + h * 0.6);
      ctx.lineTo(cx + w * 0.26, y + h * 0.6);
      ctx.lineTo(cx + w * 0.6, y + h);
      ctx.lineTo(cx - w * 0.6, y + h);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; // поясок
      ctx.fillRect(cx - w * 0.26, y + h * 0.58, w * 0.52, h * 0.03);
      break;
    }
    default:
      break;
  }
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
      // Купол.
      ctx.beginPath();
      ctx.moveTo(x + w * 0.15, brimY);
      ctx.quadraticCurveTo(centerX, y - h * 0.2, x + w * 0.85, brimY);
      ctx.closePath();
      ctx.fill();
      // Козырёк — тонкая планка у основания купола, выступает вперёд по ходу бега.
      const brimThickness = Math.max(2, 2.5 * unit);
      const brimWidth = w * 0.62;
      const brimX = facing > 0 ? centerX - w * 0.05 : centerX - brimWidth + w * 0.05;
      roundedRect(ctx, brimX, brimY - brimThickness * 0.5, brimWidth, brimThickness, brimThickness * 0.4);
      ctx.fill();
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
    case 'bow': {
      // Бантик на макушке: два лепестка и узелок по центру.
      const by = y + h * 0.03;
      ctx.beginPath();
      ctx.moveTo(centerX, by);
      ctx.lineTo(centerX - w * 0.3, by - h * 0.07);
      ctx.lineTo(centerX - w * 0.3, by + h * 0.09);
      ctx.closePath();
      ctx.moveTo(centerX, by);
      ctx.lineTo(centerX + w * 0.3, by - h * 0.07);
      ctx.lineTo(centerX + w * 0.3, by + h * 0.09);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX, by, w * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'hood': {
      // Купол капюшона над головой и боковые отвороты вдоль щёк — лицо открыто.
      ctx.beginPath();
      ctx.moveTo(x - w * 0.04, y + h * 0.28);
      ctx.quadraticCurveTo(centerX, y - h * 0.24, x + w * 1.04, y + h * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - w * 0.04, y + h * 0.1, w * 0.16, h * 0.28);
      ctx.fillRect(x + w * 0.88, y + h * 0.1, w * 0.16, h * 0.28);
      break;
    }
    case 'tiara': {
      const b = y + h * 0.05;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.26, b);
      ctx.lineTo(x + w * 0.37, b - h * 0.09);
      ctx.lineTo(x + w * 0.46, b);
      ctx.lineTo(centerX, b - h * 0.13);
      ctx.lineTo(x + w * 0.54, b);
      ctx.lineTo(x + w * 0.63, b - h * 0.09);
      ctx.lineTo(x + w * 0.74, b);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x + w * 0.26, b, w * 0.48, Math.max(1.5, unit * 1.5)); // ободок
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
