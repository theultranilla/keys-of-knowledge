// Мультяшные монстры данжа в коде: та же модель, что у героя — большая голова +
// тельце + ручки-ножки, обводка/тень/блик, аккуратное симметричное лицо. Глаза
// СТАБИЛЬНЫЕ (смотрят влево/центр/вправо ступенькой, а не плывут за игроком), зато
// рот и брови ЗАМЕТНО двигаются. У каждого вида — свой цвет и одна примета. Ноль
// ассетов. t — секунды, только анимация. Сундук — деревянный, с самоцветом.

const BODY = {
  chaser: '#e0524a', shooter: '#f0a04b', tank: '#8a3a52', boss: '#b0343f',
  bomber: '#e0902f', splitter: '#5ad06a', healer: '#dfa0d0'
};
const CHARGER = '#d1552b', MINI = '#c77dff';
const INK = '#231a2e';

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
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = (v) => Math.max(0, Math.round(v * (1 - f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const ell = (ctx, x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };

// Геометрия монстра (как у героя): голова сверху, тельце ниже. Всё от центра e.
function geom(r) {
  const headR = r * 0.72, headY = -r * 0.34;
  const bodyW = r * 0.94, bodyTop = headY + headR * 0.55, bodyBot = r * 0.74;
  return { headR, headY, bodyW, bodyTop, bodyH: bodyBot - bodyTop, footY: r * 0.82, unit: Math.max(1.5, r * 0.07) };
}

// Общий силуэт: ножки, ручки, тельце, голова — в стиле героя (обводка+тень+блик).
// armFn(side) может нарисовать особую руку (пушку); иначе обычная культя.
function chibiBody(ctx, r, col, g, breath, armFn) {
  const arm = shade(col, 0.12), foot = shade(col, 0.5), dkc = shade(col, 0.42);
  // ножки
  ctx.fillStyle = foot;
  for (const s of [-1, 1]) ell(ctx, s * r * 0.26, g.footY, r * 0.19, r * 0.12);
  // ручки (или особые)
  for (const s of [-1, 1]) {
    if (armFn && armFn(ctx, s, g, r)) continue;
    ctx.fillStyle = arm; ell(ctx, s * g.bodyW * 0.6, g.bodyTop + g.bodyH * 0.42, r * 0.16, r * 0.13);
  }
  // тельце
  ctx.fillStyle = dkc; rr(ctx, -g.bodyW / 2, g.bodyTop, g.bodyW, g.bodyH, g.bodyW * 0.32); ctx.fill();
  ctx.fillStyle = col; rr(ctx, -g.bodyW / 2 + g.unit, g.bodyTop + g.unit, g.bodyW - 2 * g.unit, g.bodyH - 2 * g.unit, g.bodyW * 0.3); ctx.fill();
  ctx.fillStyle = shade(col, 0.14); ell(ctx, 0, g.bodyTop + g.bodyH * 0.78, g.bodyW * 0.42, g.bodyH * 0.28);
  // голова (с дыханием)
  const hy = g.headY + breath;
  ctx.fillStyle = dkc; circle(ctx, 0, hy, g.headR);
  ctx.fillStyle = col; circle(ctx, 0, hy, g.headR - g.unit);
  ctx.fillStyle = shade(col, 0.14);
  ctx.beginPath(); ctx.arc(0, hy + g.headR * 0.28, g.headR * 0.78, 0.15 * Math.PI, 0.85 * Math.PI); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ell(ctx, -g.headR * 0.34, hy - g.headR * 0.36, g.headR * 0.3, g.headR * 0.18);
  return hy;
}

// Стабильные глаза на голове (радиус hr, центр 0,0 — контекст уже у головы).
// lookX ∈ {-1,0,1} — ступенчатый взгляд влево/центр/вправо, не плывёт.
function eyes(ctx, hr, lookX, { count = 2, size = 0.3, open = 1, calm = false } = {}) {
  const sep = count === 1 ? 0 : hr * 0.42, er = hr * size, ey = hr * 0.04;
  for (let s = count === 1 ? 0 : -1; s <= 1; s += 2) {
    const ex = s * sep;
    ctx.fillStyle = '#fbfbff';
    ctx.save(); ctx.translate(ex, ey); ctx.scale(1, Math.max(0.1, open)); circle(ctx, 0, 0, er); ctx.restore();
    const pr = calm ? er * 0.42 : er * 0.56;
    const px = ex + lookX * er * 0.4, py = ey + er * 0.18;
    ctx.fillStyle = INK; circle(ctx, px, py, pr);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; circle(ctx, px - pr * 0.34, py - pr * 0.34, pr * 0.3);
    if (s === 0) break;
  }
}

// Брови — ЗАМЕТНО ходят вверх-вниз; у злых внутренние концы опускаются (хмурятся).
function brows(ctx, hr, angry, ph) {
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, hr * 0.14); ctx.lineCap = 'round';
  const bob = Math.sin(ph) * hr * 0.16;
  const furrow = angry ? (Math.sin(ph) * 0.5 + 0.5) * hr * 0.16 : 0;
  const y = -hr * 0.44 + bob;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * hr * 0.16, y + (angry ? hr * 0.16 + furrow : -hr * 0.02));
    ctx.lineTo(s * hr * 0.5, y + (angry ? -hr * 0.06 : -hr * 0.1));
    ctx.stroke();
  }
}

// Рты — ЗАМЕТНАЯ анимация.
function smile(ctx, hr, y, w, curve, ph) {
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, hr * 0.11); ctx.lineCap = 'round';
  const c = curve * (1 + Math.sin(ph) * 0.5);
  ctx.beginPath(); ctx.moveTo(-w, y); ctx.quadraticCurveTo(0, y + c, w, y); ctx.stroke();
}
function fangs(ctx, hr, y, ph) {
  const open = hr * (0.18 + (Math.sin(ph) * 0.5 + 0.5) * 0.34); // широко чавкает
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-hr * 0.36, y); ctx.quadraticCurveTo(0, y + open * 1.5, hr * 0.36, y);
  ctx.quadraticCurveTo(0, y + open * 0.3, -hr * 0.36, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * hr * 0.2, y + 0.5); ctx.lineTo(s * hr * 0.08, y + 0.5); ctx.lineTo(s * hr * 0.14, y + open * 0.85); ctx.closePath(); ctx.fill(); }
}
function mouthO(ctx, hr, y, ph) {
  ctx.fillStyle = INK; ell(ctx, 0, y, hr * 0.14, hr * (0.1 + (Math.sin(ph) * 0.5 + 0.5) * 0.12));
}

function horns(ctx, hr, hy, col) {
  ctx.fillStyle = col;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * hr * 0.58, hy - hr * 0.55); ctx.lineTo(s * hr * 0.28, hy - hr * 0.52); ctx.lineTo(s * hr * 0.46, hy - hr * 1.08);
    ctx.closePath(); ctx.fill();
  }
}

// Рука-пушка (для стрелка/боссов): культя + короткий ствол с дулом в сторону side.
function gunArm(ctx, side, g, r, base) {
  const ax = side * g.bodyW * 0.6, ay = g.bodyTop + g.bodyH * 0.4;
  ctx.fillStyle = shade(base, 0.12); ell(ctx, ax, ay, r * 0.15, r * 0.13);
  ctx.fillStyle = shade(base, 0.5); rr(ctx, ax + side * r * 0.02 - (side < 0 ? r * 0.5 : 0), ay - r * 0.12, r * 0.5, r * 0.24, r * 0.08); ctx.fill();
  ctx.fillStyle = shade(base, 0.68); circle(ctx, ax + side * r * 0.52, ay, r * 0.11);
  return true;
}

function ring(ctx, r, color, width, extra) {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.arc(0, 0, r + extra, 0, Math.PI * 2); ctx.stroke();
}

export function drawEnemy(ctx, e, t) {
  const fx = e.faceX ?? 0;
  const charger = e.kind === 'boss' && e.variant === 'charger';
  let base = charger ? CHARGER : (BODY[e.kind] ?? '#e0524a');
  if (e.mini) base = MINI;
  const col = e.hitFlash > 0 ? '#ffffff' : base;
  const dark = e.hitFlash > 0 ? '#ffffff' : shade(base, 0.28);
  const r = e.r, g = geom(r);
  const look = fx > 0.3 ? 1 : fx < -0.3 ? -1 : 0;          // ступенчатый взгляд — не плывёт
  const breath = Math.sin(t * 3 + e.x * 0.05) * r * 0.03;
  const blink = ((Math.sin(t * 1.6 + e.y * 0.1) + 1) / 2) > 0.93 ? 0.12 : 1;
  const mph = t * 5 + e.x * 0.13, bph = t * 3.2 + e.y * 0.11;

  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.elite) ring(ctx, r, '#f6d24d', 3, 5);
  if (charger && e.chargeState === 'wind') ring(ctx, r, '#ffe08a', 3, 8);
  if (e.kind === 'boss' && e.enraged) ring(ctx, r, '#ff5a4b', 3, 10);
  if (e.kind === 'boss' && e.variant === 'gunner' && e.burstCd > 0 && e.burstCd < 0.28) ring(ctx, r, '#ffe08a', 3, 7);

  const isShooter = e.kind === 'shooter';
  const isGunner = e.kind === 'boss' && e.variant === 'gunner';
  const armFn = isShooter ? ((c, s) => (s === (look >= 0 ? 1 : -1)) && gunArm(c, s, g, r, base))
    : isGunner ? ((c, s) => gunArm(c, s, g, r, base)) : null;

  const hy = chibiBody(ctx, r, col, g, breath, armFn);

  if (e.kind === 'chaser' || (e.kind === 'boss' && charger)) horns(ctx, g.headR, hy, dark);
  if (e.kind === 'bomber') { // фитиль на макушке
    ctx.strokeStyle = '#3a2a12'; ctx.lineWidth = Math.max(2, r * 0.1); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, hy - g.headR * 0.95); ctx.quadraticCurveTo(0, hy - g.headR * 1.35, g.headR * 0.24, hy - g.headR * 1.5); ctx.stroke();
    ctx.fillStyle = ((Math.sin(t * 12) + 1) / 2) > 0.5 ? '#ffd23a' : '#ff7a3a'; circle(ctx, g.headR * 0.24, hy - g.headR * 1.56, r * 0.13);
  }
  if (e.kind === 'healer') { // нимб
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.beginPath(); ctx.ellipse(0, hy - g.headR * 1.2, g.headR * 0.55, g.headR * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; // плюс на тельце
    rr(ctx, -g.bodyW * 0.1, g.bodyTop + g.bodyH * 0.2, g.bodyW * 0.2, g.bodyH * 0.6, r * 0.05); ctx.fill();
    rr(ctx, -g.bodyW * 0.28, g.bodyTop + g.bodyH * 0.4, g.bodyW * 0.56, g.bodyH * 0.2, r * 0.05); ctx.fill();
  }
  if (e.kind === 'tank') { // броневая пластина на тельце с заклёпками
    ctx.fillStyle = shade(base, 0.5); rr(ctx, -g.bodyW * 0.5, g.bodyTop + g.bodyH * 0.32, g.bodyW, g.bodyH * 0.3, r * 0.08); ctx.fill();
    ctx.fillStyle = shade(base, 0.72);
    for (const s of [-1, 1]) circle(ctx, s * g.bodyW * 0.32, g.bodyTop + g.bodyH * 0.47, r * 0.045);
  }
  if (e.kind === 'splitter') { // шов деления по голове и тельцу
    ctx.strokeStyle = shade(base, 0.4); ctx.lineWidth = Math.max(2, r * 0.08); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, hy - g.headR * 0.7); ctx.lineTo(0, g.bodyTop + g.bodyH * 0.9); ctx.stroke();
  }

  // лицо на голове
  ctx.save(); ctx.translate(0, hy);
  const hr = g.headR;
  const single = isShooter || isGunner;
  if (single) {
    eyes(ctx, hr, look, { count: 1, size: 0.44, open: blink });
    brows(ctx, hr, true, bph);
  } else if (e.kind === 'healer') {
    eyes(ctx, hr, look, { size: 0.26, open: blink * 0.5, calm: true });
    smile(ctx, hr, hr * 0.5, hr * 0.26, hr * 0.16, mph);
  } else if (e.kind === 'bomber') {
    eyes(ctx, hr, look, { size: 0.32, open: blink });
    mouthO(ctx, hr, hr * 0.5, mph);
  } else if (e.kind === 'splitter') {
    eyes(ctx, hr, look, { size: 0.28, open: blink });
    smile(ctx, hr, hr * 0.44, hr * 0.3, hr * 0.22, mph);
  } else if (e.kind === 'chaser' || charger) {
    eyes(ctx, hr, look, { size: 0.3, open: blink });
    brows(ctx, hr, true, bph);
    fangs(ctx, hr, hr * 0.44, mph);
  } else if (e.kind === 'tank') {
    eyes(ctx, hr, look, { size: 0.24, open: blink });
    brows(ctx, hr, true, bph);
  } else {
    eyes(ctx, hr, look, { open: blink });
  }
  ctx.restore();

  ctx.restore();
}

// Сундук: деревянный корпус, крышка-дуга, золотые обручи, замок и самоцвет предмета
// с буквой (М/Ф). Лёгкое покачивание, чтобы «звал» открыть.
export function drawChest(ctx, ch, t) {
  const x = ch.x, y = ch.y;
  const bob = Math.sin(t * 2 + x * 0.03) * 1.2;
  const w = 32, h = 26;
  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, h * 0.62, 17, 4.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#6e421f';
  rr(ctx, -w / 2, -1, w, h * 0.62, 3); ctx.fill();
  ctx.fillStyle = '#8a5628';
  ctx.beginPath();
  ctx.moveTo(-w / 2, -1); ctx.lineTo(-w / 2, -7);
  ctx.quadraticCurveTo(0, -20, w / 2, -7); ctx.lineTo(w / 2, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.ellipse(-w * 0.18, -9, w * 0.22, 3.5, -0.3, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#d7ad4c';
  ctx.fillRect(-w / 2, -3, w, 3);
  ctx.fillRect(-w / 2 + 2, -1, 3, h * 0.62);
  ctx.fillRect(w / 2 - 5, -1, 3, h * 0.62);
  ctx.fillStyle = '#f0cf62';
  rr(ctx, -5, h * 0.18, 10, 9, 2); ctx.fill();
  ctx.fillStyle = '#3a2a12';
  ctx.beginPath(); ctx.arc(0, h * 0.28, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-1, h * 0.28, 2, 4);

  ctx.fillStyle = ch.color;
  ctx.beginPath();
  ctx.moveTo(0, -16); ctx.lineTo(6.5, -9.5); ctx.lineTo(0, -3); ctx.lineTo(-6.5, -9.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(6.5, -9.5); ctx.lineTo(0, -9.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#15151f';
  ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(ch.label, 0, -9);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

  ctx.restore();
}
