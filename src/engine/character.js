import { PALETTE } from './constants.js';
import { COSMETICS_BY_ID, DEFAULT_SKIN } from '../game/skins.js';

// Мультяшный герой: большая голова + тельце + ручки-ножки. Один код рисует игрока
// в платформере, героя в дандже и превью в гардеробе — так они не разъедутся.
// Косметика собрана ПОД этот силуэт: рубашка/штаны красят тело, наряд — одежда
// во весь рост, шапки садятся на макушку, борода — на низ лица. Ноль ассетов.

const INK = PALETTE.skyDeep;

const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const ell = (ctx, x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}
function dk(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = (v) => Math.max(0, Math.round(v * (1 - f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// Геометрия силуэта в долях от бокса (x,y,w,h): голова-круг сверху, тело-скругление
// ниже. Все части считаются отсюда, чтобы одежда и шапки садились точно.
function parts(x, y, w, h) {
  const cx = x + w / 2, unit = Math.min(w / 22, h / 30);
  const headR = w * 0.47, headY = y + h * 0.30;
  const bodyW = w * 0.64, bodyTop = y + h * 0.52, bodyH = h * 0.42;
  return { cx, unit, headR, headY, headTop: headY - headR, bodyW, bx: cx - bodyW / 2, bodyTop, bodyH, footY: y + h * 0.95 };
}
function bodyClip(ctx, g) { rr(ctx, g.bx, g.bodyTop, g.bodyW, g.bodyH, g.bodyW * 0.34); ctx.clip(); }

export function drawCharacter(ctx, x, y, w, h, skin = DEFAULT_SKIN, facing = 1) {
  const pick = (c) => COSMETICS_BY_ID.get(skin?.[c]) ?? COSMETICS_BY_ID.get(DEFAULT_SKIN[c]);
  const body = pick('body'), shirt = pick('shirt'), pants = pick('pants'), outfit = pick('outfit'), hat = pick('hat'), beard = pick('beard');
  const g = parts(x, y, w, h), dir = facing > 0 ? 1 : -1;
  const skinCol = body?.color ?? PALETTE.chalk, skinDk = dk(skinCol, 0.42);
  const sleeve = shirt?.color ?? skinCol;

  // ботиночки
  ctx.fillStyle = dk(skinCol, 0.55);
  for (const s of [-1, 1]) ell(ctx, g.cx + s * w * 0.16, g.footY, w * 0.12, h * 0.05);
  // ручки-культи по бокам (за телом; рукав = цвет рубашки)
  ctx.fillStyle = dk(sleeve, 0.1);
  for (const s of [-1, 1]) ell(ctx, g.cx + s * g.bodyW * 0.56, g.bodyTop + g.bodyH * 0.34, w * 0.1, h * 0.075);

  // тело: обводка + заливка
  ctx.fillStyle = skinDk; rr(ctx, g.bx, g.bodyTop, g.bodyW, g.bodyH, g.bodyW * 0.34); ctx.fill();
  ctx.fillStyle = skinCol; rr(ctx, g.bx + g.unit, g.bodyTop + g.unit, g.bodyW - 2 * g.unit, g.bodyH - 2 * g.unit, g.bodyW * 0.3); ctx.fill();

  // рубашка/штаны — красят тело (клип по силуэту)
  if (shirt?.color || pants?.color) {
    ctx.save(); bodyClip(ctx, g);
    if (pants?.color) { ctx.fillStyle = pants.color; ctx.fillRect(g.bx, g.bodyTop + g.bodyH * 0.52, g.bodyW, g.bodyH * 0.48); }
    if (shirt?.color) {
      ctx.fillStyle = shirt.color; ctx.fillRect(g.bx, g.bodyTop, g.bodyW, g.bodyH * 0.6);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(g.bx, g.bodyTop + g.bodyH * 0.6 - g.unit, g.bodyW, g.unit);
    }
    ctx.restore();
  }
  // наряд поверх рубашки/штанов
  if (outfit?.style) drawOutfit(ctx, g, outfit);

  // голова
  ctx.fillStyle = skinDk; circle(ctx, g.cx, g.headY, g.headR);
  ctx.fillStyle = skinCol; circle(ctx, g.cx, g.headY, g.headR - g.unit);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ell(ctx, g.cx - g.headR * 0.34, g.headY - g.headR * 0.4, g.headR * 0.3, g.headR * 0.17);

  drawFace(ctx, g, dir, !beard?.style);
  if (beard?.style) drawBeard(ctx, g, beard);
  if (hat?.style) drawHat(ctx, g, hat, dir);
}

// Лицо на голове: большие глаза со зрачком+бликом (смотрят по бегу), щёки, улыбка.
function drawFace(ctx, g, dir, smile) {
  const eR = g.headR * 0.27, sep = g.headR * 0.4, ey = g.headY + g.headR * 0.06;
  for (const s of [-1, 1]) {
    const ex = g.cx + s * sep;
    ctx.fillStyle = '#fff'; circle(ctx, ex, ey, eR);
    ctx.fillStyle = INK; circle(ctx, ex + dir * eR * 0.34, ey + eR * 0.12, eR * 0.56);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; circle(ctx, ex + dir * eR * 0.34 - eR * 0.26, ey - eR * 0.26, eR * 0.24);
  }
  ctx.fillStyle = 'rgba(255,120,120,0.3)';
  for (const s of [-1, 1]) ell(ctx, g.cx + s * g.headR * 0.62, ey + eR * 1.15, eR * 0.62, eR * 0.4);
  if (smile) {
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, g.unit * 1.2); ctx.lineCap = 'round';
    const my = ey + g.headR * 0.5;
    ctx.beginPath(); ctx.moveTo(g.cx - g.headR * 0.22, my); ctx.quadraticCurveTo(g.cx, my + g.headR * 0.22, g.cx + g.headR * 0.22, my); ctx.stroke();
  }
}

function drawBeard(ctx, g, beard) {
  ctx.fillStyle = beard.color;
  const top = g.headY + g.headR * 0.12;
  const bottom = beard.style === 'long' ? g.headY + g.headR * 1.6 : g.headY + g.headR * 0.98;
  ctx.beginPath();
  ctx.moveTo(g.cx - g.headR * 0.62, top);
  ctx.quadraticCurveTo(g.cx - g.headR * 0.5, bottom, g.cx, bottom);
  ctx.quadraticCurveTo(g.cx + g.headR * 0.5, bottom, g.cx + g.headR * 0.62, top);
  ctx.closePath(); ctx.fill();
}

// Наряд — одежда во весь рост, собрана под силуэт (тело → низ у ботинок).
function drawOutfit(ctx, g, outfit) {
  const cx = g.cx, top = g.bodyTop, bot = g.footY, W = g.bodyW, col = outfit.color, u = g.unit;
  if (outfit.style === 'robe' || outfit.style === 'cloak') {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.5, top);
    ctx.lineTo(cx + W * 0.5, top);
    ctx.lineTo(cx + W * 0.74, bot);
    ctx.quadraticCurveTo(cx, bot + u * 2, cx - W * 0.74, bot);
    ctx.closePath(); ctx.fill();
    if (outfit.style === 'robe') { ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(cx - W * 0.06, top, W * 0.12, bot - top); }
    else { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(cx - W * 0.5, top + (bot - top) * 0.42, W, u * 2.5); }
  } else if (outfit.style === 'dress') {
    ctx.save(); bodyClip(ctx, g); ctx.fillStyle = col; ctx.fillRect(g.bx, top, W, g.bodyH * 0.55); ctx.restore(); // корсаж
    const sy = top + g.bodyH * 0.52;
    ctx.fillStyle = col; // юбка-колокол
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.5, sy);
    ctx.lineTo(cx + W * 0.5, sy);
    ctx.lineTo(cx + W * 0.98, bot);
    ctx.quadraticCurveTo(cx, bot + u * 3, cx - W * 0.98, bot);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(cx - W * 0.5, sy - u, W, u * 2); // поясок
  } else if (outfit.style === 'knight') {
    ctx.save(); bodyClip(ctx, g);
    ctx.fillStyle = col; ctx.fillRect(g.bx, top, W, g.bodyH);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(g.bx + W * 0.2, top + g.bodyH * 0.16, W * 0.3, g.bodyH * 0.28);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(g.bx, top + g.bodyH * 0.6, W, u * 2);
    ctx.restore();
    ctx.fillStyle = col; // наплечники
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * W * 0.5, top + u * 2, W * 0.24, Math.PI, 0); ctx.fill(); }
  }
}

// Шапки садятся на макушку (относительно головы).
function drawHat(ctx, g, hat, dir) {
  const cx = g.cx, R = g.headR, u = g.unit, base = g.headY - R * 0.42; // линия «надевания»
  ctx.fillStyle = hat.color;
  switch (hat.style) {
    case 'cap': {
      ctx.beginPath(); ctx.moveTo(cx - R * 0.85, base); ctx.quadraticCurveTo(cx, base - R * 0.85, cx + R * 0.85, base); ctx.closePath(); ctx.fill();
      const bw = R * 1.05, bx = dir > 0 ? cx - R * 0.15 : cx - bw + R * 0.15;
      rr(ctx, bx, base - u, bw, Math.max(2, u * 2), u); ctx.fill();
      break;
    }
    case 'beanie': {
      ctx.beginPath(); ctx.moveTo(cx - R * 0.9, base); ctx.quadraticCurveTo(cx, base - R * 0.95, cx + R * 0.9, base); ctx.closePath(); ctx.fill();
      rr(ctx, cx - R * 0.92, base - u, R * 1.84, u * 3, u); ctx.fill();
      break;
    }
    case 'wizard': {
      ctx.beginPath(); ctx.moveTo(cx - R * 0.8, base); ctx.lineTo(cx + R * 0.8, base); ctx.lineTo(cx + R * 0.15, g.headTop - R * 0.9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(ctx, cx + R * 0.15, g.headTop - R * 0.9, u * 1.6);
      break;
    }
    case 'bow': {
      const by = g.headTop + R * 0.1;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx + s * R * 0.5, by - R * 0.28); ctx.lineTo(cx + s * R * 0.5, by + R * 0.28); ctx.closePath(); ctx.fill(); }
      circle(ctx, cx, by, R * 0.16);
      break;
    }
    case 'hood': {
      ctx.beginPath();
      ctx.moveTo(cx - R * 1.08, g.headY + R * 0.35);
      ctx.quadraticCurveTo(cx, g.headTop - R * 0.35, cx + R * 1.08, g.headY + R * 0.35);
      ctx.lineTo(cx + R * 0.7, g.headY + R * 0.5); ctx.quadraticCurveTo(cx, g.headY + R * 0.1, cx - R * 0.7, g.headY + R * 0.5);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'tiara': {
      const b = g.headY - R * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.5, b); ctx.lineTo(cx - R * 0.22, b - R * 0.34); ctx.lineTo(cx, b);
      ctx.lineTo(cx + R * 0.22, b - R * 0.34); ctx.lineTo(cx + R * 0.5, b); ctx.closePath(); ctx.fill();
      rr(ctx, cx - R * 0.5, b, R, Math.max(1.5, u * 1.5), u); ctx.fill();
      break;
    }
    case 'crown': {
      const b = g.headY - R * 0.42;
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.6, b); ctx.lineTo(cx - R * 0.6, b - R * 0.5); ctx.lineTo(cx - R * 0.3, b - R * 0.18);
      ctx.lineTo(cx, b - R * 0.6); ctx.lineTo(cx + R * 0.3, b - R * 0.18); ctx.lineTo(cx + R * 0.6, b - R * 0.5);
      ctx.lineTo(cx + R * 0.6, b); ctx.closePath(); ctx.fill();
      break;
    }
    default: break;
  }
}
