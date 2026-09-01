// Рисованные «модельки» данжа в коде: без ассетов, только Canvas 2D. Раньше враги
// были плоскими кружками, а сундук — квадратом с буквой. Тут — существа с телом,
// глазами (смотрят на игрока), приметами вида и лёгким дыханием, и настоящий
// сундук с крышкой, обручами и замком. Всё детерминированно от позиции + времени
// (t — секунды, только для анимации, симуляции не касается).

const BODY = {
  chaser: '#e0524a', shooter: '#f0a04b', tank: '#8a3a52', boss: '#b0343f',
  bomber: '#e0902f', splitter: '#5ad06a', healer: '#dfa0d0'
};
const CHARGER = '#d1552b', MINI = '#c77dff';

// Скруглённый прямоугольник без зависимости от ctx.roundRect (старые вебвью).
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

function darken(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - f));
  const g = Math.round(((n >> 8) & 255) * (1 - f));
  const b = Math.round((n & 255) * (1 - f));
  return `rgb(${r},${g},${b})`;
}

// Тело-каплю с тенью снизу и бликом сверху; wob — коэффициент «дыхания».
function body(ctx, r, col, wob) {
  ctx.save();
  ctx.scale(1 - wob * 0.5, 1 + wob);
  ctx.fillStyle = darken(col, 0.35);
  ctx.beginPath(); ctx.arc(0, r * 0.12, r, 0, Math.PI * 2); ctx.fill(); // контур-подложка
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; // блик сверху-слева
  ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.32, r * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Пара глаз, смотрящих в сторону (fx,fy). count=1 — циклоп по центру.
function eyes(ctx, r, fx, fy, { count = 2, size = 0.24, open = 1, calm = false } = {}) {
  const px = -fy, py = fx;                 // ось для разноса двух глаз
  const fwdX = fx * r * 0.14, fwdY = fy * r * 0.14; // кластер чуть вперёд по взгляду
  const sep = count === 1 ? 0 : r * 0.4;
  const er = r * size;
  for (let s = count === 1 ? 0 : -1; s <= 1; s += 2) {
    const cx = fwdX + px * sep * s, cy = fwdY + py * sep * s;
    ctx.fillStyle = '#f7f7ff';
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, Math.max(0.08, open));
    ctx.beginPath(); ctx.arc(0, 0, er, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1a1420';                 // зрачок смотрит на игрока
    const pr = calm ? er * 0.4 : er * 0.52;
    ctx.beginPath(); ctx.arc(cx + fx * er * 0.42, cy + fy * er * 0.42, pr, 0, Math.PI * 2); ctx.fill();
    if (s === 0) break;
  }
}

// Кольцо-примета вокруг тела (элита, телеграфы, ярость).
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
  const r = e.r;
  const wob = Math.sin(t * 3 + e.x * 0.05) * 0.05;
  const blink = ((Math.sin(t * 1.6 + e.y * 0.1) + 1) / 2) > 0.93 ? 0.15 : 1;

  ctx.save();
  ctx.translate(e.x, e.y);

  // приметы-кольца рисуем ДО тела, чтобы тело их слегка перекрыло (аккуратнее)
  if (e.elite) ring(ctx, r, '#f6d24d', 3, 3);
  if (charger && e.chargeState === 'wind') ring(ctx, r, '#ffe08a', 3, 6);
  if (e.kind === 'boss' && e.enraged) ring(ctx, r, '#ff5a4b', 3, 8);
  if (e.kind === 'boss' && e.variant === 'gunner' && e.burstCd > 0 && e.burstCd < 0.28) ring(ctx, r, '#ffe08a', 3, 5);

  if (e.kind === 'chaser') {
    ctx.fillStyle = darken(base, 0.2);        // рожки
    for (const hx of [-0.45, 0.45]) tri(ctx, r * hx, -r * 0.7, r * 0.16, r * 0.5);
    body(ctx, r, col, wob);
    eyes(ctx, r, fx, fy, { open: blink });
    mouth(ctx, r, 0.42);
  } else if (e.kind === 'shooter') {
    body(ctx, r, col, wob);
    ctx.fillStyle = darken(base, 0.35);       // «ствол»-хоботок по направлению взгляда
    ctx.save(); ctx.rotate(Math.atan2(fy, fx)); rr(ctx, r * 0.5, -r * 0.16, r * 0.7, r * 0.32, 2); ctx.fill(); ctx.restore();
    eyes(ctx, r, fx, fy, { count: 1, size: 0.4, open: blink });
  } else if (e.kind === 'tank') {
    body(ctx, r, col, wob * 0.5);
    ctx.strokeStyle = darken(base, 0.4); ctx.lineWidth = 3; // броневые пластины
    for (const a of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.7, Math.PI * (1.1 + a * 0.25), Math.PI * (1.4 + a * 0.25)); ctx.stroke(); }
    ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 3; // тяжёлая бровь
    ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.05); ctx.lineTo(r * 0.4, -r * 0.05); ctx.stroke();
    eyes(ctx, r, fx, fy, { size: 0.16, open: blink });
  } else if (e.kind === 'bomber') {
    ring(ctx, r, '#ffcaa0', 2, 3);            // «вот-вот рванёт»
    body(ctx, r, col, wob + Math.abs(Math.sin(t * 8)) * 0.04);
    ctx.strokeStyle = '#3a2a12'; ctx.lineWidth = 2; // фитиль
    ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.quadraticCurveTo(r * 0.3, -r * 1.2, r * 0.15, -r * 1.35); ctx.stroke();
    ctx.fillStyle = ((Math.sin(t * 12) + 1) / 2) > 0.5 ? '#ffd23a' : '#ff7a3a'; // искра
    ctx.beginPath(); ctx.arc(r * 0.15, -r * 1.4, 2.6, 0, Math.PI * 2); ctx.fill();
    eyes(ctx, r, fx, fy, { size: 0.26, open: blink });
  } else if (e.kind === 'splitter') {
    body(ctx, r, col, wob * 1.6);             // студенистый — сильнее колышется
    ctx.strokeStyle = 'rgba(10,30,10,0.5)'; ctx.lineWidth = 2; // шов деления
    ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(0, r * 0.8); ctx.stroke();
    eyes(ctx, r, fx, fy, { size: 0.2, open: blink });
  } else if (e.kind === 'healer') {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; // нимб
    ctx.beginPath(); ctx.arc(0, -r * 0.85, r * 0.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    body(ctx, r, col, wob);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; // белый крест
    ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.lineTo(r * 0.3, 0); ctx.moveTo(0, -r * 0.3); ctx.lineTo(0, r * 0.3); ctx.stroke();
    eyes(ctx, r, fx, fy, { size: 0.2, open: blink * 0.6, calm: true });
  } else if (e.kind === 'boss') {
    if (charger) { ctx.fillStyle = darken(base, 0.25); for (const hx of [-0.55, 0.55]) tri(ctx, r * hx, -r * 0.72, r * 0.22, r * 0.6); }
    body(ctx, r, col, wob * 0.6);
    if (e.variant === 'gunner') {
      eyes(ctx, r, fx, fy, { count: 1, size: 0.34, open: blink }); // один глаз-прицел
      ctx.fillStyle = darken(base, 0.4);       // орудийные порты по бокам
      for (const s of [-1, 1]) { ctx.save(); ctx.rotate(Math.atan2(fy, fx)); ctx.beginPath(); ctx.arc(r * 0.55, s * r * 0.4, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    } else {
      ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 3; // злая V-бровь таранщика
      ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.28); ctx.lineTo(0, -r * 0.12); ctx.lineTo(r * 0.4, -r * 0.28); ctx.stroke();
      eyes(ctx, r, fx, fy, { size: 0.18, open: blink });
      mouth(ctx, r, 0.5);
    }
  } else {
    body(ctx, r, col, wob);
    eyes(ctx, r, fx, fy, { open: blink });
  }

  ctx.restore();
}

function tri(ctx, cx, cy, halfW, h) {
  ctx.beginPath(); ctx.moveTo(cx - halfW, cy + h * 0.4); ctx.lineTo(cx, cy - h * 0.6); ctx.lineTo(cx + halfW, cy + h * 0.4); ctx.closePath(); ctx.fill();
}

// Зубастый ротик — маленький зигзаг под глазами.
function mouth(ctx, r, y) {
  ctx.strokeStyle = '#2a1018'; ctx.lineWidth = 2; ctx.lineJoin = 'miter';
  const w = r * 0.5, yy = r * y, n = 4, step = (w * 2) / n;
  ctx.beginPath(); ctx.moveTo(-w, yy);
  for (let i = 1; i <= n; i++) ctx.lineTo(-w + step * i, yy + (i % 2 ? r * 0.14 : 0));
  ctx.stroke();
}

// Сундук: деревянный корпус, крышка-дуга, золотые обручи, замок и самоцвет предмета
// с буквой (М/Ф). Лёгкое покачивание, чтобы «звал» открыть.
export function drawChest(ctx, ch, t) {
  const x = ch.x, y = ch.y;
  const bob = Math.sin(t * 2 + x * 0.03) * 1.2;
  const w = 32, h = 26;
  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = 'rgba(0,0,0,0.28)';            // тень на полу
  ctx.beginPath(); ctx.ellipse(0, h * 0.62, 17, 4.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#6e421f';                     // корпус
  rr(ctx, -w / 2, -1, w, h * 0.62, 3); ctx.fill();
  ctx.fillStyle = '#8a5628';                     // крышка-дуга
  ctx.beginPath();
  ctx.moveTo(-w / 2, -1); ctx.lineTo(-w / 2, -7);
  ctx.quadraticCurveTo(0, -20, w / 2, -7); ctx.lineTo(w / 2, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';      // блик на крышке
  ctx.beginPath(); ctx.ellipse(-w * 0.18, -9, w * 0.22, 3.5, -0.3, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#d7ad4c';                     // золотые обручи
  ctx.fillRect(-w / 2, -3, w, 3);                // шов крышка/корпус
  ctx.fillRect(-w / 2 + 2, -1, 3, h * 0.62);     // боковые вертикали
  ctx.fillRect(w / 2 - 5, -1, 3, h * 0.62);
  ctx.fillStyle = '#f0cf62';                     // замок
  rr(ctx, -5, h * 0.18, 10, 9, 2); ctx.fill();
  ctx.fillStyle = '#3a2a12';
  ctx.beginPath(); ctx.arc(0, h * 0.28, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-1, h * 0.28, 2, 4);              // скважина

  // самоцвет предмета на крышке — цвет и буква сразу говорят про раздел
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
