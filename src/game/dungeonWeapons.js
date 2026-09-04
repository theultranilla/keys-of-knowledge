// Внешний вид оружия данжа: моделька в руках героя (наводится по прицелу), свой
// снаряд у каждого вида и иконка выпавшего оружия на полу. Поведение (урон, темп,
// пирсинг, самонавод, заморозка) живёт в dungeonCombat.js — тут только рисование.
// Ноль ассетов, всё фигурами.

const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

// Акцентный цвет снаряда/дула по стилю.
const SHOT_COL = {
  spark: '#ffe27a', spread: '#ffb14b', rapid: '#8fe6ff', heavy: '#c79bff',
  laser: '#ff74cf', shot: '#ffcf6a', homing: '#5ee0c0', frost: '#bfeaff'
};

export function drawShot(ctx, s) {
  const col = SHOT_COL[s.style] ?? '#ffffff';
  if (s.style === 'laser') { // яркий штрих вдоль полёта
    const a = Math.atan2(s.vy, s.vx);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
    ctx.fillStyle = col; rr(ctx, -s.r * 3, -s.r * 0.7, s.r * 6, s.r * 1.4, s.r * 0.7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; rr(ctx, -s.r * 3, -s.r * 0.28, s.r * 6, s.r * 0.56, s.r * 0.28); ctx.fill();
    ctx.restore(); return;
  }
  if (s.style === 'homing') { // хвостик по направлению, обратному полёту
    const sp = Math.hypot(s.vx, s.vy) || 1;
    ctx.fillStyle = 'rgba(94,224,192,0.4)';
    circle(ctx, s.x - (s.vx / sp) * s.r, s.y - (s.vy / sp) * s.r, s.r * 0.8);
  }
  ctx.fillStyle = col; circle(ctx, s.x, s.y, s.r);
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; circle(ctx, s.x - s.r * 0.32, s.y - s.r * 0.32, s.r * 0.35);
  if (s.style === 'frost') { // снежинка-плюс
    ctx.strokeStyle = '#eaf7ff'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x - s.r * 0.7, s.y); ctx.lineTo(s.x + s.r * 0.7, s.y);
    ctx.moveTo(s.x, s.y - s.r * 0.7); ctx.lineTo(s.x, s.y + s.r * 0.7);
    ctx.stroke();
  }
}

// Моделька оружия у руки героя (hx,hy) — наведена вдоль (ax,ay). muzzle>0 — вспышка.
export function drawWeapon(ctx, hx, hy, ax, ay, weaponId, muzzle = 0) {
  const a = Math.atan2(ay, ax);
  ctx.save();
  ctx.translate(hx + ax * 7, hy + ay * 7);
  ctx.rotate(a);
  drawModel(ctx, weaponId, '#3a4260', '#20263f');
  const tip = TIP[weaponId] ?? 20;
  if (muzzle > 0) { // вспышка у дула
    ctx.fillStyle = SHOT_COL[STYLE[weaponId] ?? 'spark'] ?? '#fff';
    circle(ctx, tip + 2, 0, 4.5);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(ctx, tip + 2, 0, 2);
  }
  ctx.restore();
}

// Иконка выпавшего оружия на полу (смотрит вправо, с подложкой-«блюдцем»).
export function drawWeaponIcon(ctx, x, y, weaponId) {
  ctx.fillStyle = 'rgba(87,214,196,0.18)';
  ctx.beginPath(); ctx.ellipse(x, y + 6, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x - 6, y); drawModel(ctx, weaponId, '#3a4260', '#20263f'); ctx.restore();
}

// Длина «дула» по оружию — куда сажать вспышку.
const TIP = { spark: 16, spread: 15, rapid: 18, heavy: 22, laser: 20, shotgun: 18, homing: 17, frost: 19 };
const STYLE = { spark: 'spark', spread: 'spread', rapid: 'rapid', heavy: 'heavy', laser: 'laser', shotgun: 'shot', homing: 'homing', frost: 'frost' };

// Локальные координаты: +x — вперёд (по прицелу), рукоять у нуля.
function drawModel(ctx, id, steel, dark) {
  const acc = SHOT_COL[STYLE[id] ?? 'spark'] ?? '#ffd23a';
  ctx.lineJoin = 'round';
  if (id === 'spread') {
    ctx.fillStyle = steel; rr(ctx, 0, -5, 9, 10, 3); ctx.fill();
    ctx.fillStyle = dark; for (const oy of [-4, 0, 4]) rr(ctx, 8, oy - 1.4, 8, 2.8, 1.2), ctx.fill();
    ctx.fillStyle = acc; circle(ctx, 4.5, 0, 2);
  } else if (id === 'rapid') {
    ctx.fillStyle = dark; circle(ctx, 6, 0, 6); // барабан
    ctx.fillStyle = steel; rr(ctx, 0, -3.5, 8, 7, 2); ctx.fill();
    ctx.fillStyle = dark; for (const oy of [-3, 0, 3]) rr(ctx, 10, oy - 1.2, 8, 2.4, 1), ctx.fill();
    ctx.fillStyle = acc; circle(ctx, 6, 0, 2.2);
  } else if (id === 'heavy') {
    ctx.fillStyle = steel; rr(ctx, 0, -6, 11, 12, 3); ctx.fill();
    ctx.fillStyle = dark; rr(ctx, 10, -5, 12, 10, 3); ctx.fill();
    ctx.fillStyle = acc; circle(ctx, 22, 0, 3);
  } else if (id === 'laser') {
    ctx.fillStyle = steel; rr(ctx, 0, -3.5, 12, 7, 2.5); ctx.fill();
    ctx.fillStyle = dark; rr(ctx, 11, -1.6, 9, 3.2, 1.4); ctx.fill();
    ctx.fillStyle = acc; circle(ctx, 20, 0, 3); ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, 19, -1, 1.2);
  } else if (id === 'shotgun') {
    ctx.fillStyle = steel; rr(ctx, 0, -5, 8, 10, 3); ctx.fill();
    ctx.fillStyle = dark; rr(ctx, 7, -3.6, 11, 3, 1.4); ctx.fill(); rr(ctx, 7, 0.6, 11, 3, 1.4); ctx.fill();
    ctx.fillStyle = acc; circle(ctx, 4, 0, 1.8);
  } else if (id === 'homing') {
    ctx.fillStyle = steel; rr(ctx, 0, -6, 10, 12, 2.5); ctx.fill();
    ctx.fillStyle = dark; rr(ctx, 9, -4, 9, 8, 2); ctx.fill();
    ctx.fillStyle = acc; // наконечник ракеты
    ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(23, 0); ctx.lineTo(18, 4); ctx.closePath(); ctx.fill();
  } else if (id === 'frost') { // посох с кристаллом
    ctx.fillStyle = '#6b5140'; rr(ctx, -2, -2, 16, 4, 2); ctx.fill();
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.moveTo(15, -6); ctx.lineTo(21, 0); ctx.lineTo(15, 6); ctx.lineTo(12, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(15, -6); ctx.lineTo(21, 0); ctx.lineTo(15, 0); ctx.closePath(); ctx.fill();
  } else { // spark — компактный пистолет
    ctx.fillStyle = steel; rr(ctx, 0, -4, 9, 8, 2.5); ctx.fill();
    ctx.fillStyle = dark; rr(ctx, 8, -1.8, 8, 3.6, 1.5); ctx.fill();
    ctx.fillStyle = acc; circle(ctx, 4, 0, 1.8);
  }
}
