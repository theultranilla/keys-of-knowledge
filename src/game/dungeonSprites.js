// Мультяшные «модельки» данжа в коде: без ассетов, только Canvas 2D. Каждый враг —
// характерное существо с телом, лапками, ножками, бровями и мимикой; глаза следят
// за игроком, тело «дышит», лапки-ножки шагают. Сундук — деревянный, с самоцветом
// предмета. Всё детерминированно от позиции + времени (t — секунды, только анимация,
// симуляции не касается). Стиль — чистый вектор с тенями (не пиксель).

const BODY = {
  chaser: '#e0524a', shooter: '#f0a04b', tank: '#8a3a52', boss: '#b0343f',
  bomber: '#e0902f', splitter: '#5ad06a', healer: '#dfa0d0'
};
const CHARGER = '#d1552b', MINI = '#c77dff';
const INK = '#20141c'; // тёмная обводка/черты

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
  const n = parseInt(hex.slice(1), 16);
  const g = (c) => Math.max(0, Math.min(255, Math.round(c * (1 - f))));
  return `rgb(${g((n >> 16) & 255)},${g((n >> 8) & 255)},${g(n & 255)})`;
}

// Овальная «конечность» с обводкой — из них лепим лапки и ножки.
function limb(ctx, col, x, y, rx, ry, rot = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Тело-капля: тёмная подложка-обводка, заливка, мягкий блик сверху-слева.
function body(ctx, r, col, wob) {
  ctx.save();
  ctx.scale(1 - wob * 0.5, 1 + wob);
  ctx.fillStyle = shade(col, 0.42);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shade(col, 0.16); // тень снизу — объём
  ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.82, 0.15 * Math.PI, 0.85 * Math.PI); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; // блик
  ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.34, r * 0.34, r * 0.24, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Две ножки-топотуна снизу (шагают в противофазе).
function feet(ctx, r, col, ph) {
  for (const s of [-1, 1]) {
    const step = Math.max(0, Math.sin(ph + (s > 0 ? Math.PI : 0))) * r * 0.12;
    limb(ctx, col, s * r * 0.4, r * 0.9 - step, r * 0.22, r * 0.14);
  }
}

// Две ручки по бокам (лёгкий покачивающийся замах).
function arms(ctx, r, col, ph, { spread = 0.95, y = 0.18, rx = 0.2, ry = 0.15 } = {}) {
  for (const s of [-1, 1]) {
    const sw = Math.sin(ph + (s > 0 ? Math.PI : 0)) * r * 0.08;
    limb(ctx, col, s * r * spread, r * y + sw, r * rx, r * ry, s * 0.5);
  }
}

// Глаза, следящие за игроком (fx,fy). count=1 — циклоп.
function eyes(ctx, r, fx, fy, { count = 2, size = 0.26, open = 1, calm = false } = {}) {
  const px = -fy, py = fx;
  const fwdX = fx * r * 0.12, fwdY = fy * r * 0.12 - r * 0.05;
  const sep = count === 1 ? 0 : r * 0.4;
  const er = r * size;
  for (let s = count === 1 ? 0 : -1; s <= 1; s += 2) {
    const cx = fwdX + px * sep * s, cy = fwdY + py * sep * s;
    ctx.fillStyle = '#fbfbff';
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, Math.max(0.08, open));
    ctx.beginPath(); ctx.arc(0, 0, er, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = INK;
    const pr = calm ? er * 0.4 : er * 0.55;
    ctx.beginPath(); ctx.arc(cx + fx * er * 0.4, cy + fy * er * 0.4, pr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; // блик в зрачке — «живой» взгляд
    ctx.beginPath(); ctx.arc(cx + fx * er * 0.4 - pr * 0.35, cy + fy * er * 0.4 - pr * 0.35, pr * 0.32, 0, Math.PI * 2); ctx.fill();
    if (s === 0) break;
  }
}

// Брови: наклон внутрь — злое выражение, наружу — спокойное.
function brows(ctx, r, angry) {
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, r * 0.1); ctx.lineCap = 'round';
  const y = -r * 0.4;
  for (const s of [-1, 1]) {
    const inX = s * r * 0.14, outX = s * r * 0.44;
    const inY = angry ? y + r * 0.14 : y - r * 0.02, outY = angry ? y - r * 0.04 : y - r * 0.08;
    ctx.beginPath(); ctx.moveTo(inX, inY); ctx.lineTo(outX, outY); ctx.stroke();
  }
}

// Ротики.
function smile(ctx, r, y, w, curve) {
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, r * 0.09); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-w, y); ctx.quadraticCurveTo(0, y + curve, w, y); ctx.stroke();
}
function fangs(ctx, r, y) {
  ctx.fillStyle = INK; // рот
  rr(ctx, -r * 0.34, y, r * 0.68, r * 0.26, r * 0.1); ctx.fill();
  ctx.fillStyle = '#fff'; // клыки
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.22, y); ctx.lineTo(s * r * 0.1, y); ctx.lineTo(s * r * 0.16, y + r * 0.16);
    ctx.closePath(); ctx.fill();
  }
}
function tri(ctx, cx, cy, halfW, h, col) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(cx - halfW, cy + h * 0.4); ctx.lineTo(cx, cy - h * 0.6); ctx.lineTo(cx + halfW, cy + h * 0.4); ctx.closePath(); ctx.fill();
}

function ring(ctx, r, color, width, extra) {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.arc(0, 0, r + extra, 0, Math.PI * 2); ctx.stroke();
}

export function drawEnemy(ctx, e, t) {
  const fx = e.faceX ?? 0, fy = e.faceY ?? 1;
  const charger = e.kind === 'boss' && e.variant === 'charger';
  let base = charger ? CHARGER : (BODY[e.kind] ?? '#e0524a');
  if (e.mini) base = MINI;
  const flash = e.hitFlash > 0;
  const col = flash ? '#ffffff' : base;
  const dark = flash ? '#ffffff' : shade(base, 0.3);
  const r = e.r;
  const wob = Math.sin(t * 3 + e.x * 0.05) * 0.05;
  const walk = t * 7 + e.x * 0.1;
  const blink = ((Math.sin(t * 1.6 + e.y * 0.1) + 1) / 2) > 0.94 ? 0.12 : 1;
  const ang = Math.atan2(fy, fx);

  ctx.save();
  ctx.translate(e.x, e.y);

  // приметы-кольца — под телом
  if (e.elite) ring(ctx, r, '#f6d24d', 3, 4);
  if (charger && e.chargeState === 'wind') ring(ctx, r, '#ffe08a', 3, 7);
  if (e.kind === 'boss' && e.enraged) ring(ctx, r, '#ff5a4b', 3, 9);
  if (e.kind === 'boss' && e.variant === 'gunner' && e.burstCd > 0 && e.burstCd < 0.28) ring(ctx, r, '#ffe08a', 3, 6);

  if (e.kind === 'chaser') {
    feet(ctx, r, dark, walk);
    tri(ctx, -r * 0.5, -r * 0.72, r * 0.18, r * 0.55, dark); // рожки
    tri(ctx, r * 0.5, -r * 0.72, r * 0.18, r * 0.55, dark);
    body(ctx, r, col, wob);
    arms(ctx, r, dark, walk);
    eyes(ctx, r, fx, fy, { open: blink });
    brows(ctx, r, true);
    fangs(ctx, r, r * 0.34);
  } else if (e.kind === 'shooter') {
    // парит: ножек нет, зато пушка-рука по направлению взгляда
    body(ctx, r, col, wob);
    ctx.save(); ctx.rotate(ang);
    limb(ctx, dark, r * 0.86, 0, r * 0.34, r * 0.22); // рука
    ctx.fillStyle = shade(base, 0.5); rr(ctx, r * 0.95, -r * 0.14, r * 0.6, r * 0.28, r * 0.1); ctx.fill(); // дуло
    ctx.restore();
    eyes(ctx, r, fx, fy, { count: 1, size: 0.42, open: blink });
    brows(ctx, r, true);
  } else if (e.kind === 'tank') {
    feet(ctx, r, dark, walk * 0.5);
    body(ctx, r, col, wob * 0.5);
    limb(ctx, dark, -r * 0.95, r * 0.1, r * 0.28, r * 0.24); // тяжёлые кулаки
    limb(ctx, dark, r * 0.95, r * 0.1, r * 0.28, r * 0.24);
    ctx.fillStyle = shade(base, 0.5); rr(ctx, -r * 0.5, r * 0.02, r, r * 0.5, r * 0.16); ctx.fill(); // нагрудник
    eyes(ctx, r, fx, fy, { size: 0.17, open: blink });
    brows(ctx, r, true);
    smile(ctx, r, r * 0.4, r * 0.3, -r * 0.2); // хмурый рот дугой вниз
  } else if (e.kind === 'bomber') {
    ring(ctx, r, '#ffcaa0', 2, 4);
    feet(ctx, r, dark, walk);
    body(ctx, r, col, wob + Math.abs(Math.sin(t * 8)) * 0.05);
    arms(ctx, r, dark, walk, { y: -0.1 }); // ручки вверх — «ой»
    ctx.strokeStyle = '#3a2a12'; ctx.lineWidth = Math.max(2, r * 0.12); ctx.lineCap = 'round'; // фитиль
    ctx.beginPath(); ctx.moveTo(0, -r * 0.88); ctx.quadraticCurveTo(r * 0.35, -r * 1.25, r * 0.18, -r * 1.4); ctx.stroke();
    ctx.fillStyle = ((Math.sin(t * 12) + 1) / 2) > 0.5 ? '#ffd23a' : '#ff7a3a';
    ctx.beginPath(); ctx.arc(r * 0.18, -r * 1.46, r * 0.16, 0, Math.PI * 2); ctx.fill();
    eyes(ctx, r, fx, fy, { size: 0.28, open: blink });
    smile(ctx, r, r * 0.44, r * 0.22, -r * 0.26); // тревожный ротик
  } else if (e.kind === 'splitter') {
    body(ctx, r, col, wob * 1.7); // студень — сильнее колышется
    ctx.fillStyle = shade(base, 0.28); // капли снизу
    for (const s of [-1, 0, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.4, r * 0.78, r * 0.16, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = shade(base, 0.5); ctx.lineWidth = 2; // шов деления
    ctx.beginPath(); ctx.moveTo(0, -r * 0.75); ctx.lineTo(0, r * 0.75); ctx.stroke();
    arms(ctx, r, shade(base, 0.28), walk, { rx: 0.14, ry: 0.12 });
    eyes(ctx, r, fx, fy, { size: 0.22, open: blink });
    smile(ctx, r, r * 0.34, r * 0.24, r * 0.2); // добродушная улыбка
  } else if (e.kind === 'healer') {
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = Math.max(2, r * 0.09); // нимб
    ctx.beginPath(); ctx.ellipse(0, -r * 0.95, r * 0.5, r * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
    body(ctx, r, col, wob);
    limb(ctx, dark, -r * 0.72, r * 0.5, r * 0.16, r * 0.14); // сложенные ручки
    limb(ctx, dark, r * 0.72, r * 0.5, r * 0.16, r * 0.14);
    ctx.fillStyle = '#fff'; // крест-плюс
    rr(ctx, -r * 0.09, -r * 0.28, r * 0.18, r * 0.56, r * 0.04); ctx.fill();
    rr(ctx, -r * 0.28, -r * 0.09, r * 0.56, r * 0.18, r * 0.04); ctx.fill();
    eyes(ctx, r, fx, fy, { size: 0.2, open: blink * 0.5, calm: true });
    smile(ctx, r, r * 0.42, r * 0.2, r * 0.14);
  } else if (e.kind === 'boss') {
    feet(ctx, r, dark, walk * 0.6);
    if (charger) { tri(ctx, -r * 0.58, -r * 0.74, r * 0.24, r * 0.62, dark); tri(ctx, r * 0.58, -r * 0.74, r * 0.24, r * 0.62, dark); }
    body(ctx, r, col, wob * 0.6);
    if (e.variant === 'gunner') {
      ctx.save(); ctx.rotate(ang); // спаренные пушки-руки
      for (const s of [-1, 1]) { limb(ctx, dark, r * 0.7, s * r * 0.5, r * 0.3, r * 0.2); ctx.fillStyle = shade(base, 0.5); rr(ctx, r * 0.85, s * r * 0.5 - r * 0.1, r * 0.5, r * 0.2, r * 0.08); ctx.fill(); }
      ctx.restore();
      eyes(ctx, r, fx, fy, { count: 1, size: 0.36, open: blink });
      brows(ctx, r, true);
    } else {
      limb(ctx, dark, -r * 0.96, r * 0.12, r * 0.3, r * 0.26); // кулачищи
      limb(ctx, dark, r * 0.96, r * 0.12, r * 0.3, r * 0.26);
      eyes(ctx, r, fx, fy, { size: 0.19, open: blink });
      brows(ctx, r, true);
      fangs(ctx, r, r * 0.42);
    }
  } else {
    feet(ctx, r, dark, walk);
    body(ctx, r, col, wob);
    eyes(ctx, r, fx, fy, { open: blink });
  }

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
