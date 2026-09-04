import { roundedRect } from './shapes.js';
import { prefersReducedMotion } from './motion.js';
import { PALETTE } from './constants.js';
import { KEY_COLORS } from '../game/entities.js';

// Всё, что стоит на уровне: платформы, монеты, шипы, флажки, сундуки, двери.
// Мультяшный стиль в тон тайлам/небу/герою: тёплое дерево, золото с блеском,
// объёмные фигуры. Опасное (шипы, кометы, снаряды) — коралловое: danger читается
// без подписи. Рисуется в мировых координатах, поверх тайлов и под игроком.

const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const ell = (ctx, x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };

export function drawProps(ctx, entities, time) {
  for (const platform of entities.platforms) drawPlatform(ctx, platform);
  for (const spike of entities.spikes) drawSpike(ctx, spike);
  for (const hazard of entities.hazards) drawHazard(ctx, hazard, time);
  if (entities.cannons) for (const cannon of entities.cannons) drawCannon(ctx, cannon);
  if (entities.projectiles) for (const projectile of entities.projectiles) drawProjectile(ctx, projectile, time);
  if (entities.crumbles) for (const c of entities.crumbles) drawCrumble(ctx, c);
  if (entities.enemies) for (const enemy of entities.enemies) drawEnemy(ctx, enemy, time);
  if (entities.flag) drawFlag(ctx, entities.flag, time);
  if (entities.powerups) for (const pu of entities.powerups) drawPowerup(ctx, pu, time);
  for (const checkpoint of entities.checkpoints) drawCheckpoint(ctx, checkpoint, time);
  for (const chest of entities.chests) drawChest(ctx, chest);
  for (const door of entities.doors) drawDoor(ctx, door);
  for (const coin of entities.coins) drawCoin(ctx, coin, time);
}

// Пушка — металлическая тумба со стволом-дулом в сторону стрельбы.
function drawCannon(ctx, cannon) {
  const cx = cannon.x + cannon.width / 2, cy = cannon.y + cannon.height / 2;
  ctx.fillStyle = '#414a68'; roundedRect(ctx, cannon.x, cannon.y, cannon.width, cannon.height, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; roundedRect(ctx, cannon.x, cannon.y, cannon.width, cannon.height * 0.4, 5); ctx.fill();
  ctx.fillStyle = '#1c2138';
  const bl = cannon.width * 0.55;
  roundedRect(ctx, cannon.dir > 0 ? cx : cx - bl, cy - 5, bl, 10, 3); ctx.fill();
  ctx.fillStyle = '#10152a'; circle(ctx, cannon.dir > 0 ? cx + bl : cx - bl, cy, 4);
}

// Снаряд — коралловый (цвет опасности): мяч кругом, пуля капсулой по ходу полёта.
function drawProjectile(ctx, p, time) {
  const cx = p.x + p.width / 2, cy = p.y + p.height / 2, r = p.width / 2 + 2;
  ctx.fillStyle = PALETTE.coral;
  if (p.kind === 'bullet') {
    if (Math.abs(p.vy) > Math.abs(p.vx)) {
      roundedRect(ctx, cx - r * 0.7, cy - r * 1.3, r * 1.4, r * 2.6, r * 0.7); ctx.fill();
      ctx.fillStyle = 'rgba(255,235,230,0.85)'; circle(ctx, cx, cy + (p.vy > 0 ? r : -r), r * 0.4);
    } else {
      roundedRect(ctx, cx - r * 1.3, cy - r * 0.7, r * 2.6, r * 1.4, r * 0.7); ctx.fill();
      ctx.fillStyle = 'rgba(255,235,230,0.85)'; circle(ctx, cx + (p.vx > 0 ? r : -r), cy, r * 0.4);
    }
  } else {
    circle(ctx, cx, cy, r);
    ctx.strokeStyle = 'rgba(20,27,52,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,235,230,0.75)'; circle(ctx, cx - r * 0.3, cy - r * 0.3, r * 0.28);
  }
}

// Враг: коричневый ходок / фиолетовый летун. Мультяшная мордочка в тон бестиарию —
// глаза со зрачком по ходу движения, хмурые брови, тень. Топнутый — плоский «блин».
function drawEnemy(ctx, e, time) {
  const cx = e.x + e.width / 2;
  const base = e.kind === 'flyer' ? '#9e73ee' : '#8a5a3b';
  if (e.dead) {
    ctx.fillStyle = '#5f3f24';
    roundedRect(ctx, e.x - 2, e.y + e.height * 0.62, e.width + 4, e.height * 0.38, 6); ctx.fill();
    return;
  }
  if (e.kind === 'flyer') {
    const flap = prefersReducedMotion() ? 0 : Math.sin(time * 10) * 3;
    ctx.fillStyle = 'rgba(232,236,244,0.8)';
    ell(ctx, e.x - 1, e.y + e.height * 0.4 + flap, 7, 4);
    ell(ctx, e.x + e.width + 1, e.y + e.height * 0.4 - flap, 7, 4);
  }
  ctx.fillStyle = e.kind === 'flyer' ? '#7b53c4' : '#6e4529'; // обводка-подложка
  roundedRect(ctx, e.x - 1, e.y - 1, e.width + 2, e.height + 2, 8); ctx.fill();
  ctx.fillStyle = base;
  roundedRect(ctx, e.x, e.y, e.width, e.height, 7); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  roundedRect(ctx, e.x, e.y + e.height * 0.6, e.width, e.height * 0.4, 7); ctx.fill();

  const look = e.deltaX >= 0 ? 1 : -1;
  const eyeY = e.y + e.height * 0.34, dx = e.width * 0.22;
  for (const s of [-1, 1]) {
    const ex = cx + s * dx;
    ctx.fillStyle = '#fbfbff'; circle(ctx, ex, eyeY, 3.6);
    ctx.fillStyle = '#141b34'; circle(ctx, ex + look * 1.4, eyeY + 0.6, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; circle(ctx, ex + look * 1.4 - 0.7, eyeY - 0.7, 0.8);
  }
  ctx.strokeStyle = '#141b34'; ctx.lineWidth = 2; ctx.lineCap = 'round'; // хмурые брови
  ctx.beginPath();
  ctx.moveTo(cx - dx - 3.5, eyeY - 4.5); ctx.lineTo(cx - dx + 3, eyeY - 2.5);
  ctx.moveTo(cx + dx - 3, eyeY - 2.5); ctx.lineTo(cx + dx + 3.5, eyeY - 4.5);
  ctx.stroke();
}

// Движущаяся платформа — дощатая, чтобы отличать от земли и читать как «висит и едет».
function drawPlatform(ctx, p) {
  ctx.fillStyle = '#7a5230'; roundedRect(ctx, p.x, p.y, p.width, p.height, 4); ctx.fill();
  ctx.fillStyle = '#8f6238'; roundedRect(ctx, p.x, p.y, p.width, p.height * 0.5, 4); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(p.x, p.y + p.height - 3, p.width, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 1; // швы досок
  ctx.beginPath();
  for (let x = p.x + p.width / 4; x < p.x + p.width; x += p.width / 4) { ctx.moveTo(x, p.y + 2); ctx.lineTo(x, p.y + p.height - 2); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(232,236,244,0.3)'; ctx.lineWidth = 2; // пунктир снизу — «едет»
  ctx.beginPath();
  for (let x = p.x + 5; x < p.x + p.width - 4; x += 8) { ctx.moveTo(x, p.y + p.height + 4); ctx.lineTo(x + 4, p.y + p.height + 4); }
  ctx.stroke();
}

// Шипы — коралловые зубья с объёмом (светлый левый скат) и тёмным основанием.
function drawSpike(ctx, spike) {
  const teeth = 3;
  const baseX = spike.drawX ?? spike.x, baseY = spike.drawY ?? spike.y;
  const drawWidth = spike.drawWidth ?? spike.width, drawHeight = spike.drawHeight ?? spike.height;
  const step = drawWidth / teeth;
  ctx.fillStyle = '#8a2f2d'; ctx.fillRect(baseX, baseY + drawHeight - 3, drawWidth, 3); // основание
  for (let i = 0; i < teeth; i++) {
    const left = baseX + i * step;
    ctx.fillStyle = PALETTE.coral;
    ctx.beginPath(); ctx.moveTo(left, baseY + drawHeight); ctx.lineTo(left + step / 2, baseY); ctx.lineTo(left + step, baseY + drawHeight); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; // блик на левом скате
    ctx.beginPath(); ctx.moveTo(left, baseY + drawHeight); ctx.lineTo(left + step / 2, baseY); ctx.lineTo(left + step * 0.32, baseY + drawHeight); ctx.closePath(); ctx.fill();
  }
}

// Комета — колючая коралловая звезда с хвостом (не трогаем: danger читается).
function drawHazard(ctx, hazard, time) {
  const cx = hazard.x + hazard.width / 2, cy = hazard.y + hazard.height / 2;
  const radius = hazard.visualRadius ?? hazard.width / 2;
  const spin = prefersReducedMotion() ? (hazard.spinOffset ?? 0) : time * 2.2 + (hazard.spinOffset ?? 0);
  const speed = Math.hypot(hazard.deltaX, hazard.deltaY);
  if (speed > 0.01) {
    const tailX = -hazard.deltaX / speed, tailY = -hazard.deltaY / speed;
    const gradient = ctx.createLinearGradient(cx, cy, cx + tailX * radius * 3.4, cy + tailY * radius * 3.4);
    gradient.addColorStop(0, 'rgba(229,97,95,0.45)'); gradient.addColorStop(1, 'rgba(229,97,95,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(cx + tailY * radius * 0.7, cy - tailX * radius * 0.7);
    ctx.lineTo(cx - tailY * radius * 0.7, cy + tailX * radius * 0.7);
    ctx.lineTo(cx + tailX * radius * 3.4, cy + tailY * radius * 3.4);
    ctx.closePath(); ctx.fill();
  }
  ctx.beginPath();
  const points = 8;
  for (let i = 0; i < points * 2; i++) {
    const angle = spin + (i * Math.PI) / points, reach = i % 2 === 0 ? radius : radius * 0.5;
    const px = cx + Math.cos(angle) * reach, py = cy + Math.sin(angle) * reach;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = PALETTE.coral; ctx.fill();
  ctx.strokeStyle = 'rgba(20,27,52,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = 'rgba(255,235,230,0.85)'; circle(ctx, cx, cy, radius * 0.28);
}

// Финиш-флаг: деревянный столб с шаром-навершием и трепещущим вымпелом.
// Пройденный — вымпел спущен к основанию и бирюзовый.
function drawFlag(ctx, flag, time) {
  const poleX = flag.x + flag.width / 2;
  ctx.fillStyle = '#b9a07a'; ctx.fillRect(poleX - 2, flag.topY, 4, flag.baseY - flag.topY);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(poleX + 0.5, flag.topY, 1.5, flag.baseY - flag.topY);
  ctx.fillStyle = flag.reached ? PALETTE.teal : PALETTE.amber; circle(ctx, poleX, flag.topY, 5);
  const flagY = flag.reached ? flag.baseY - 26 : flag.topY + 6;
  const wave = prefersReducedMotion() ? 0 : Math.sin(time * 4) * 3;
  ctx.fillStyle = flag.reached ? PALETTE.teal : PALETTE.coral;
  ctx.beginPath();
  ctx.moveTo(poleX, flagY);
  ctx.quadraticCurveTo(poleX + 18, flagY - 2 + wave, poleX + 28 + wave, flagY + 7);
  ctx.quadraticCurveTo(poleX + 18, flagY + 10 + wave, poleX, flagY + 16);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; // блик на полотнище
  ctx.beginPath(); ctx.moveTo(poleX + 2, flagY + 2); ctx.quadraticCurveTo(poleX + 14, flagY + 1 + wave, poleX + 20, flagY + 6); ctx.lineTo(poleX + 2, flagY + 8); ctx.closePath(); ctx.fill();
}

// Рушащийся тайл: спокойный — тёплый каменный блок с трещиной; задрожал — жёлтый
// и трясётся; осыпался — не рисуется.
function drawCrumble(ctx, c) {
  if (c.state === 'gone') return;
  const shaking = c.state === 'shaking';
  const jit = shaking && !prefersReducedMotion() ? (Math.random() - 0.5) * 2 : 0;
  const x = c.x + jit, y = c.y + jit;
  ctx.fillStyle = shaking ? '#c98a34' : '#7f6f5e'; roundedRect(ctx, x, y, c.width, c.height, 4); ctx.fill();
  ctx.fillStyle = shaking ? '#e6b24e' : '#948473'; roundedRect(ctx, x, y, c.width, c.height * 0.42, 4); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x, y + c.height - 3, c.width, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; // трещина
  ctx.beginPath();
  ctx.moveTo(x + c.width * 0.4, y); ctx.lineTo(x + c.width * 0.55, y + c.height * 0.5); ctx.lineTo(x + c.width * 0.45, y + c.height);
  ctx.stroke();
}

// Усиление: звезда (амбер), щит (бирюза), крылья (мел). С мягким сиянием, покачиваются.
function drawPowerup(ctx, pu, time) {
  if (pu.taken) return;
  const cx = pu.x + pu.width / 2;
  const cy = pu.y + pu.height / 2 + (prefersReducedMotion() ? 0 : Math.sin((time + pu.phase) * Math.PI * 2) * 2.5);
  const r = pu.width / 2;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.6);
  glow.addColorStop(0, 'rgba(255,255,255,0.22)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow; circle(ctx, cx, cy, r * 1.6);
  if (pu.kind === 'star') {
    ctx.fillStyle = PALETTE.amber; starPath(ctx, cx, cy, r, r * 0.45, 5); ctx.fill();
    ctx.strokeStyle = '#141b34'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(ctx, cx - r * 0.2, cy - r * 0.25, r * 0.18);
  } else if (pu.kind === 'shield') {
    ctx.fillStyle = PALETTE.teal;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy - r * 0.5); ctx.lineTo(cx + r * 0.8, cy + r * 0.6);
    ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.8, cy + r * 0.6); ctx.lineTo(cx - r, cy - r * 0.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#0c1226'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.35, cy); ctx.lineTo(cx - r * 0.05, cy + r * 0.35); ctx.lineTo(cx + r * 0.45, cy - r * 0.3); ctx.stroke();
  } else {
    ctx.fillStyle = PALETTE.chalk;
    ell(ctx, cx - r * 0.45, cy, r * 0.55, r * 0.35);
    ell(ctx, cx + r * 0.45, cy, r * 0.55, r * 0.35);
    ctx.fillStyle = PALETTE.amber; circle(ctx, cx, cy, r * 0.32);
  }
}

function starPath(ctx, cx, cy, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = i * Math.PI / points - Math.PI / 2, rad = i % 2 === 0 ? outer : inner;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Чекпоинт: флажок на столбике. Активный — бирюзовый, трепещет; спящий — бледный.
function drawCheckpoint(ctx, cp, time) {
  const poleX = cp.x + 2, top = cp.y;
  ctx.fillStyle = cp.active ? '#b9a07a' : 'rgba(200,205,220,0.5)';
  ctx.fillRect(poleX - 1.5, top, 3, cp.height);
  const wave = cp.active && !prefersReducedMotion() ? Math.sin(time * 5) * 2 : 0;
  ctx.fillStyle = cp.active ? PALETTE.teal : 'rgba(232,236,244,0.4)';
  ctx.beginPath();
  ctx.moveTo(poleX, top + 2);
  ctx.quadraticCurveTo(poleX + (cp.active ? 10 : 7), top + 4 + wave, poleX + (cp.active ? 14 : 9) + wave, top + 7);
  ctx.quadraticCurveTo(poleX + (cp.active ? 10 : 7), top + 10 + wave, poleX, top + 12);
  ctx.closePath();
  if (cp.active) ctx.fill(); else { ctx.strokeStyle = 'rgba(232,236,244,0.5)'; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.fillStyle = cp.active ? PALETTE.teal : 'rgba(200,205,220,0.5)'; circle(ctx, poleX, top, 2.5); // навершие
}

// Сундук уровня — деревянный, как в дандже. Открытый — крышка откинута, видно нутро.
function drawChest(ctx, chest) {
  const x = chest.x, y = chest.y, w = chest.width, h = chest.height, cx = x + w / 2;
  const lid = h * 0.4;
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ell(ctx, cx, y + h, w * 0.5, h * 0.1);
  ctx.fillStyle = '#6e421f'; roundedRect(ctx, x, y + lid, w, h - lid, 3); ctx.fill();
  if (chest.opened) {
    ctx.fillStyle = '#2a1a10'; roundedRect(ctx, x + 2, y + lid + 1, w - 4, (h - lid) * 0.55, 2); ctx.fill();
    ctx.save(); ctx.translate(x, y + lid); ctx.rotate(-0.6);
    ctx.fillStyle = '#8a5628'; roundedRect(ctx, 0, -lid, w, lid, 3); ctx.fill();
    ctx.fillStyle = '#d7ad4c'; ctx.fillRect(0, -3, w, 2.5);
    ctx.restore();
  } else {
    ctx.fillStyle = '#8a5628';
    ctx.beginPath();
    ctx.moveTo(x, y + lid); ctx.lineTo(x, y + lid * 0.55); ctx.quadraticCurveTo(cx, y - h * 0.12, x + w, y + lid * 0.55); ctx.lineTo(x + w, y + lid); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ell(ctx, cx - w * 0.15, y + lid * 0.2, w * 0.2, 2);
    ctx.fillStyle = '#d7ad4c';
    ctx.fillRect(x, y + lid - 2.5, w, 2.5);
    ctx.fillRect(cx - 1.5, y + lid, 3, h - lid);
    ctx.fillStyle = '#f0cf62'; roundedRect(ctx, cx - 4, y + lid + (h - lid) * 0.25, 8, 7, 2); ctx.fill();
    ctx.fillStyle = '#3a2a12'; ctx.fillRect(cx - 1, y + lid + (h - lid) * 0.25 + 3, 2, 3);
  }
}

// Дверь — деревянная створка с досками, рамкой и замком в цвет нужного ключа.
function drawDoor(ctx, door) {
  const color = KEY_COLORS[door.keyColor] ?? PALETTE.chalk;
  const x = door.x, y = door.y, w = door.width, h = door.height, cx = x + w / 2;
  if (door.opened) {
    ctx.fillStyle = '#160f22'; roundedRect(ctx, x, y, w, h, 8); ctx.fill();     // тёмный проём
    ctx.fillStyle = '#5a3a1e'; roundedRect(ctx, x, y, w * 0.28, h, 6); ctx.fill(); // распахнутая створка
    ctx.strokeStyle = PALETTE.teal; ctx.lineWidth = 2.5; roundedRect(ctx, x, y, w, h, 8); ctx.stroke();
    return;
  }
  ctx.fillStyle = '#6e4a2a'; roundedRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1.5; // доски
  ctx.beginPath();
  ctx.moveTo(cx, y + 4); ctx.lineTo(cx, y + h - 4);
  ctx.moveTo(x + 5, y + h * 0.5); ctx.lineTo(x + w - 5, y + h * 0.5);
  ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; roundedRect(ctx, x + 2, y + 2, w - 4, h - 4, 6); ctx.stroke(); // рамка в цвет ключа
  ctx.fillStyle = color; // замок-самоцвет
  const ky = y + h * 0.5;
  circle(ctx, cx, ky, 4.5); ctx.fillRect(cx - 1.6, ky, 3.2, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; circle(ctx, cx - 1.4, ky - 1.4, 1.4);
  ctx.fillStyle = '#caa24a'; circle(ctx, x + w - 7, ky, 2.2); // ручка
}

// Монета — золотая, с ободком, светлой серединой, звёздочкой и бликом. Покачивается.
function drawCoin(ctx, coin, time) {
  if (coin.taken) return;
  const bob = prefersReducedMotion() ? 0 : Math.sin((time + coin.phase) * Math.PI * 2) * 2.5;
  const cx = coin.x + coin.width / 2, cy = coin.y + coin.height / 2 + bob, r = coin.width / 2;
  ctx.fillStyle = '#c9922e'; circle(ctx, cx, cy, r);
  ctx.fillStyle = '#f6c945'; circle(ctx, cx, cy, r - 2);
  ctx.fillStyle = '#ffe08a'; circle(ctx, cx, cy, r - 4.5);
  ctx.fillStyle = '#d9a636'; starPath(ctx, cx, cy, r * 0.42, r * 0.18, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; circle(ctx, cx - r * 0.36, cy - r * 0.36, r * 0.2);
}
