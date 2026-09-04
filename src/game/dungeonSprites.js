// Мультяшные «модельки» данжа в коде: без ассетов, только Canvas 2D. Каждый враг —
// чистое круглое существо в одном стиле с героем: обводка, тень снизу, блик сверху,
// симметричное лицо (глаза со зрачком и бликом следят за игроком) и ОДНА чёткая
// примета вида. Никаких мелких деталей под углами — от них была «кривизна». Тело
// дышит, рот и брови двигаются. Всё детерминированно от позиции + времени (t —
// секунды, только анимация). Сундук — деревянный, с самоцветом предмета.

const BODY = {
  chaser: '#e0524a', shooter: '#f0a04b', tank: '#8a3a52', boss: '#b0343f',
  bomber: '#e0902f', splitter: '#5ad06a', healer: '#dfa0d0'
};
const CHARGER = '#d1552b', MINI = '#c77dff';
const INK = '#231a2e'; // тёмные черты лица

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

// Круглое тело в стиле героя: обводка-подложка, заливка, тень снизу, блик сверху.
function body(ctx, r, col, wob) {
  ctx.save();
  ctx.scale(1 - wob * 0.4, 1 + wob);
  ctx.fillStyle = shade(col, 0.42); circle(ctx, 0, 0, r);
  ctx.fillStyle = col; circle(ctx, 0, 0, r - Math.max(1.5, r * 0.07));
  ctx.fillStyle = shade(col, 0.15);
  ctx.beginPath(); ctx.arc(0, r * 0.28, r * 0.8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.ellipse(-r * 0.34, -r * 0.36, r * 0.3, r * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Глаза, следящие за игроком (fx,fy) — как у героя. count=1 — циклоп.
function eyes(ctx, r, fx, fy, { count = 2, size = 0.26, open = 1, calm = false } = {}) {
  const px = -fy, py = fx;
  const cxf = fx * r * 0.1, cyf = fy * r * 0.1 - r * 0.04;
  const sep = count === 1 ? 0 : r * 0.42, er = r * size;
  for (let s = count === 1 ? 0 : -1; s <= 1; s += 2) {
    const ex = cxf + px * sep * s, ey = cyf + py * sep * s;
    ctx.fillStyle = '#fbfbff';
    ctx.save(); ctx.translate(ex, ey); ctx.scale(1, Math.max(0.1, open)); circle(ctx, 0, 0, er); ctx.restore();
    const pr = calm ? er * 0.42 : er * 0.56;
    ctx.fillStyle = INK; circle(ctx, ex + fx * er * 0.34, ey + fy * er * 0.34, pr);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; circle(ctx, ex + fx * er * 0.34 - pr * 0.35, ey + fy * er * 0.34 - pr * 0.35, pr * 0.3);
    if (s === 0) break;
  }
}

// Две симметричные брови; ph — подрагивание, у злых хмурятся сильнее.
function brows(ctx, r, angry, ph = 0) {
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, r * 0.1); ctx.lineCap = 'round';
  const y = -r * 0.42 + Math.sin(ph) * r * 0.05;
  const flex = angry ? (Math.sin(ph * 0.7) * 0.5 + 0.5) * r * 0.05 : 0;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.14, y + (angry ? r * 0.13 + flex : -r * 0.02));
    ctx.lineTo(s * r * 0.42, y + (angry ? -r * 0.04 : -r * 0.08));
    ctx.stroke();
  }
}

// Ротики — все симметричные.
function smile(ctx, r, y, w, curve, ph = 0) {
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, r * 0.09); ctx.lineCap = 'round';
  const c = curve * (1 + Math.sin(ph) * 0.28);
  ctx.beginPath(); ctx.moveTo(-w, y); ctx.quadraticCurveTo(0, y + c, w, y); ctx.stroke();
}
function fangs(ctx, r, y, ph = 0) {
  const open = r * (0.16 + (Math.sin(ph) * 0.5 + 0.5) * 0.14);
  // Чистый оскал: тёмная дуга-рот (линза) + два ровных клыка сверху.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, y);
  ctx.quadraticCurveTo(0, y + open * 1.7, r * 0.32, y);
  ctx.quadraticCurveTo(0, y + open * 0.35, -r * 0.32, y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.19, y + 0.5); ctx.lineTo(s * r * 0.07, y + 0.5); ctx.lineTo(s * r * 0.13, y + open * 0.95);
    ctx.closePath(); ctx.fill();
  }
}
function mouthO(ctx, r, y, ph = 0) { // круглый «ой»-ротик
  ctx.fillStyle = INK; circle(ctx, 0, y, r * (0.11 + (Math.sin(ph) * 0.5 + 0.5) * 0.05));
}

// Пара симметричных рожек вверх-в стороны.
function horns(ctx, r, col) {
  ctx.fillStyle = col;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.56, -r * 0.52);
    ctx.lineTo(s * r * 0.26, -r * 0.5);
    ctx.lineTo(s * r * 0.44, -r * 1.02);
    ctx.closePath(); ctx.fill();
  }
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
  const col = e.hitFlash > 0 ? '#ffffff' : base;
  const dark = e.hitFlash > 0 ? '#ffffff' : shade(base, 0.28);
  const r = e.r;
  const wob = Math.sin(t * 3 + e.x * 0.05) * 0.05;
  const blink = ((Math.sin(t * 1.6 + e.y * 0.1) + 1) / 2) > 0.94 ? 0.12 : 1;
  const ang = Math.atan2(fy, fx);
  const mph = t * 5 + e.x * 0.13, bph = t * 3 + e.y * 0.11;

  ctx.save();
  ctx.translate(e.x, e.y);

  // кольца-приметы — под телом
  if (e.elite) ring(ctx, r, '#f6d24d', 3, 4);
  if (charger && e.chargeState === 'wind') ring(ctx, r, '#ffe08a', 3, 7);
  if (e.kind === 'boss' && e.enraged) ring(ctx, r, '#ff5a4b', 3, 9);
  if (e.kind === 'boss' && e.variant === 'gunner' && e.burstCd > 0 && e.burstCd < 0.28) ring(ctx, r, '#ffe08a', 3, 6);

  if (e.kind === 'chaser') {
    horns(ctx, r, dark);
    body(ctx, r, col, wob);
    eyes(ctx, r, fx, fy, { open: blink });
    brows(ctx, r, true, bph);
    fangs(ctx, r, r * 0.36, mph);
  } else if (e.kind === 'shooter') {
    ctx.save(); ctx.rotate(ang); // короткая пушка с дулом (не палка), у самого тела
    ctx.fillStyle = shade(base, 0.5); rr(ctx, r * 0.6, -r * 0.2, r * 0.5, r * 0.4, r * 0.14); ctx.fill();
    ctx.fillStyle = shade(base, 0.68); circle(ctx, r * 1.06, 0, r * 0.19);
    ctx.restore();
    body(ctx, r, col, wob);
    eyes(ctx, r, fx, fy, { count: 1, size: 0.42, open: blink });
    brows(ctx, r, true, bph);
  } else if (e.kind === 'tank') {
    body(ctx, r, col, wob * 0.5);
    ctx.fillStyle = shade(base, 0.5); // броневая пластина с бликом и заклёпками — читается как броня
    rr(ctx, -r * 0.72, r * 0.14, r * 1.44, r * 0.34, r * 0.1); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(ctx, -r * 0.72, r * 0.14, r * 1.44, r * 0.08, r * 0.06); ctx.fill();
    ctx.fillStyle = shade(base, 0.7);
    for (const s of [-1, 1]) circle(ctx, s * r * 0.52, r * 0.31, r * 0.05);
    eyes(ctx, r, fx, fy, { size: 0.18, open: blink });
    brows(ctx, r, true, bph);
  } else if (e.kind === 'bomber') {
    ring(ctx, r, '#ffcaa0', 2, 4);
    body(ctx, r, col, wob + Math.abs(Math.sin(t * 8)) * 0.05);
    ctx.strokeStyle = '#3a2a12'; ctx.lineWidth = Math.max(2, r * 0.12); ctx.lineCap = 'round'; // фитиль по центру
    ctx.beginPath(); ctx.moveTo(0, -r * 0.88); ctx.quadraticCurveTo(0, -r * 1.2, r * 0.16, -r * 1.36); ctx.stroke();
    ctx.fillStyle = ((Math.sin(t * 12) + 1) / 2) > 0.5 ? '#ffd23a' : '#ff7a3a';
    circle(ctx, r * 0.16, -r * 1.42, r * 0.15);
    eyes(ctx, r, fx, fy, { size: 0.28, open: blink });
    mouthO(ctx, r, r * 0.42, mph);
  } else if (e.kind === 'splitter') {
    body(ctx, r, col, wob * 1.5);
    ctx.strokeStyle = shade(base, 0.4); ctx.lineWidth = Math.max(2, r * 0.09); // ровный шов
    ctx.beginPath(); ctx.moveTo(0, -r * 0.72); ctx.lineTo(0, r * 0.72); ctx.stroke();
    eyes(ctx, r, fx, fy, { size: 0.22, open: blink });
    smile(ctx, r, r * 0.36, r * 0.24, r * 0.2, mph);
  } else if (e.kind === 'healer') {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(2, r * 0.09); // нимб
    ctx.beginPath(); ctx.ellipse(0, -r * 0.95, r * 0.5, r * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
    body(ctx, r, col, wob);
    ctx.fillStyle = '#fff'; // ровный плюс
    rr(ctx, -r * 0.1, -r * 0.32, r * 0.2, r * 0.64, r * 0.05); ctx.fill();
    rr(ctx, -r * 0.32, -r * 0.1, r * 0.64, r * 0.2, r * 0.05); ctx.fill();
    eyes(ctx, r, fx, fy, { size: 0.2, open: blink * 0.5, calm: true });
    smile(ctx, r, r * 0.44, r * 0.2, r * 0.14, mph);
  } else if (e.kind === 'boss') {
    if (charger) horns(ctx, r, dark);
    body(ctx, r, col, wob * 0.6);
    if (e.variant === 'gunner') {
      ctx.save(); ctx.rotate(ang); // два симметричных дула
      ctx.fillStyle = shade(base, 0.5);
      for (const s of [-1, 1]) { rr(ctx, r * 0.5, s * r * 0.42 - r * 0.11, r * 0.62, r * 0.22, r * 0.08); ctx.fill(); }
      ctx.restore();
      eyes(ctx, r, fx, fy, { count: 1, size: 0.36, open: blink });
      brows(ctx, r, true, bph);
    } else {
      eyes(ctx, r, fx, fy, { size: 0.2, open: blink });
      brows(ctx, r, true, bph);
      fangs(ctx, r, r * 0.42, mph);
    }
  } else {
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
