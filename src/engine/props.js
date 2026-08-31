import { roundedRect } from './shapes.js';
import { prefersReducedMotion } from './motion.js';
import { PALETTE } from './constants.js';
import { KEY_COLORS } from '../game/entities.js';

// Всё, что стоит на уровне: платформы, монеты, шипы, флажки, сундуки, двери.
// Рисуется в мировых координатах, поверх тайлов и под игроком.

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
  for (const checkpoint of entities.checkpoints) drawCheckpoint(ctx, checkpoint);
  for (const chest of entities.chests) drawChest(ctx, chest);
  for (const door of entities.doors) drawDoor(ctx, door);
  for (const coin of entities.coins) drawCoin(ctx, coin, time);
}

// Пушка — тёмная тумба со стволом, смотрящим в сторону стрельбы.
function drawCannon(ctx, cannon) {
  const cx = cannon.x + cannon.width / 2, cy = cannon.y + cannon.height / 2;
  ctx.fillStyle = '#3a4260';
  roundedRect(ctx, cannon.x, cannon.y, cannon.width, cannon.height, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20, 27, 52, 0.6)';
  ctx.lineWidth = 2;
  roundedRect(ctx, cannon.x, cannon.y, cannon.width, cannon.height, 5);
  ctx.stroke();
  // ствол в сторону dir
  ctx.fillStyle = '#20263f';
  const bl = cannon.width * 0.5;
  ctx.fillRect(cannon.dir > 0 ? cx : cx - bl, cy - 4, bl, 8);
}

// Снаряд — коралловый (цвет опасности): мяч кругом, пуля капсулой по ходу полёта
// (в т.ч. вертикально — для пушек, стреляющих вверх/вниз).
function drawProjectile(ctx, p, time) {
  const cx = p.x + p.width / 2, cy = p.y + p.height / 2, r = p.width / 2 + 2;
  ctx.fillStyle = PALETTE.coral;
  if (p.kind === 'bullet') {
    if (Math.abs(p.vy) > Math.abs(p.vx)) { // летит вертикально
      roundedRect(ctx, cx - r * 0.7, cy - r * 1.3, r * 1.4, r * 2.6, r * 0.7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,235,230,0.85)';
      ctx.beginPath(); ctx.arc(cx, cy + (p.vy > 0 ? r : -r), r * 0.4, 0, Math.PI * 2); ctx.fill();
    } else {
      roundedRect(ctx, cx - r * 1.3, cy - r * 0.7, r * 2.6, r * 1.4, r * 0.7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,235,230,0.85)'; // носик по ходу движения
      ctx.beginPath(); ctx.arc(cx + (p.vx > 0 ? r : -r), cy, r * 0.4, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20, 27, 52, 0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,235,230,0.7)'; // блик — объёмный мячик
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.28, 0, Math.PI * 2); ctx.fill();
  }
}

// Враг: коричневый ходок / фиолетовый летун с крыльями, хмурые глаза по ходу
// движения. Топнутый — плоский «блин» на пару кадров.
function drawEnemy(ctx, e, time) {
  const cx = e.x + e.width / 2;
  if (e.dead) {
    ctx.fillStyle = '#7a4a30';
    roundedRect(ctx, e.x - 2, e.y + e.height * 0.62, e.width + 4, e.height * 0.38, 6);
    ctx.fill();
    return;
  }
  if (e.kind === 'flyer') { // трепещущие крылья
    const flap = prefersReducedMotion() ? 0 : Math.sin(time * 10) * 3;
    ctx.fillStyle = 'rgba(232,236,244,0.75)';
    ctx.beginPath(); ctx.ellipse(e.x - 1, e.y + e.height * 0.4 + flap, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(e.x + e.width + 1, e.y + e.height * 0.4 - flap, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = e.kind === 'flyer' ? '#9e73ee' : '#8a5a3b';
  roundedRect(ctx, e.x, e.y, e.width, e.height, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,27,52,0.5)';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, e.x, e.y, e.width, e.height, 7);
  ctx.stroke();

  const look = e.deltaX >= 0 ? 1 : -1;
  const eyeY = e.y + e.height * 0.3, ex1 = cx - 6, ex2 = cx + 6;
  ctx.fillStyle = '#fff';
  ctx.fillRect(ex1 - 3, eyeY, 6, 7);
  ctx.fillRect(ex2 - 3, eyeY, 6, 7);
  ctx.fillStyle = '#141b34';
  ctx.fillRect(ex1 - 1 + look, eyeY + 2, 3, 4);
  ctx.fillRect(ex2 - 1 + look, eyeY + 2, 3, 4);
  ctx.strokeStyle = '#141b34';
  ctx.lineWidth = 2;
  ctx.beginPath(); // хмурые брови
  ctx.moveTo(ex1 - 4, eyeY - 2); ctx.lineTo(ex1 + 3, eyeY);
  ctx.moveTo(ex2 - 3, eyeY); ctx.lineTo(ex2 + 4, eyeY - 2);
  ctx.stroke();
}

function drawPlatform(ctx, platform) {
  ctx.fillStyle = 'rgba(232, 236, 244, 0.18)';
  roundedRect(ctx, platform.x, platform.y, platform.width, platform.height, 5);
  ctx.fill();

  ctx.strokeStyle = PALETTE.chalk;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 2;
  roundedRect(ctx, platform.x, platform.y, platform.width, platform.height, 5);
  ctx.stroke();

  // Пунктир снизу — читается как «эта штука висит и едет», а не как кусок пола.
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  for (let x = platform.x + 5; x < platform.x + platform.width - 4; x += 8) {
    ctx.moveTo(x, platform.y + platform.height + 4);
    ctx.lineTo(x + 4, platform.y + platform.height + 4);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawSpike(ctx, spike) {
  // Рисуем от отдельной, более крупной коробки, а не от хитбокса: зубья выглядят
  // во всю ширину, но убивает только их центральная нижняя часть.
  const teeth = 3;
  const baseX = spike.drawX ?? spike.x;
  const baseY = spike.drawY ?? spike.y;
  const drawWidth = spike.drawWidth ?? spike.width;
  const drawHeight = spike.drawHeight ?? spike.height;
  const step = drawWidth / teeth;

  ctx.fillStyle = PALETTE.coral;
  ctx.beginPath();
  for (let index = 0; index < teeth; index++) {
    const left = baseX + index * step;
    ctx.moveTo(left, baseY + drawHeight);
    ctx.lineTo(left + step / 2, baseY);
    ctx.lineTo(left + step, baseY + drawHeight);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(20, 27, 52, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// Комета — колючая коралловая звезда с хвостом в сторону, обратную движению.
// Коралл — тот же цвет опасности, что у шипов: danger читается без подписи.
function drawHazard(ctx, hazard, time) {
  const cx = hazard.x + hazard.width / 2;
  const cy = hazard.y + hazard.height / 2;
  const radius = hazard.visualRadius ?? hazard.width / 2;
  const spin = prefersReducedMotion() ? (hazard.spinOffset ?? 0) : time * 2.2 + (hazard.spinOffset ?? 0);

  const speed = Math.hypot(hazard.deltaX, hazard.deltaY);
  if (speed > 0.01) {
    const tailX = -hazard.deltaX / speed;
    const tailY = -hazard.deltaY / speed;
    const gradient = ctx.createLinearGradient(cx, cy, cx + tailX * radius * 3.4, cy + tailY * radius * 3.4);
    gradient.addColorStop(0, 'rgba(229, 97, 95, 0.45)');
    gradient.addColorStop(1, 'rgba(229, 97, 95, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(cx + tailY * radius * 0.7, cy - tailX * radius * 0.7);
    ctx.lineTo(cx - tailY * radius * 0.7, cy + tailX * radius * 0.7);
    ctx.lineTo(cx + tailX * radius * 3.4, cy + tailY * radius * 3.4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.beginPath();
  const points = 8;
  for (let index = 0; index < points * 2; index++) {
    const angle = spin + (index * Math.PI) / points;
    const reach = index % 2 === 0 ? radius : radius * 0.5;
    const px = cx + Math.cos(angle) * reach;
    const py = cy + Math.sin(angle) * reach;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = PALETTE.coral;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20, 27, 52, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 235, 230, 0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

// Финиш-флаг: столб с шариком-навершием и трепещущим флажком. Пройденный —
// флаг спускается к основанию (бирюзовый), как в классических платформерах.
function drawFlag(ctx, flag, time) {
  const poleX = flag.x + flag.width / 2;
  // столб
  ctx.strokeStyle = PALETTE.chalk;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(poleX, flag.topY);
  ctx.lineTo(poleX, flag.baseY);
  ctx.stroke();
  // навершие
  ctx.fillStyle = flag.reached ? PALETTE.teal : PALETTE.amber;
  ctx.beginPath();
  ctx.arc(poleX, flag.topY, 6, 0, Math.PI * 2);
  ctx.fill();
  // полотнище: наверху пока не пройден, у основания — когда пройден
  const flagY = flag.reached ? flag.baseY - 26 : flag.topY + 6;
  const wave = prefersReducedMotion() ? 0 : Math.sin(time * 4) * 3;
  ctx.fillStyle = flag.reached ? PALETTE.teal : PALETTE.coral;
  ctx.beginPath();
  ctx.moveTo(poleX, flagY);
  ctx.lineTo(poleX + 26 + wave, flagY + 8);
  ctx.lineTo(poleX, flagY + 18);
  ctx.closePath();
  ctx.fill();
}

// Рушащийся тайл: спокойный — как призрачный блок с трещиной; задрожал — жёлтый
// и трясётся; осыпался — не рисуется.
function drawCrumble(ctx, c) {
  if (c.state === 'gone') return;
  const shaking = c.state === 'shaking';
  const jit = shaking && !prefersReducedMotion() ? (Math.random() - 0.5) * 2 : 0;
  const x = c.x + jit, y = c.y + jit;
  ctx.fillStyle = shaking ? 'rgba(242,168,59,0.32)' : 'rgba(232,236,244,0.14)';
  roundedRect(ctx, x, y, c.width, c.height, 4);
  ctx.fill();
  ctx.strokeStyle = shaking ? PALETTE.amber : PALETTE.chalk;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, c.width, c.height, 4);
  ctx.stroke();
  ctx.beginPath(); // трещина
  ctx.moveTo(x + c.width * 0.4, y);
  ctx.lineTo(x + c.width * 0.55, y + c.height * 0.5);
  ctx.lineTo(x + c.width * 0.45, y + c.height);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Усиление: звезда (амбер), щит (бирюза), крылья (мел). Покачиваются, как монеты.
function drawPowerup(ctx, pu, time) {
  if (pu.taken) return;
  const cx = pu.x + pu.width / 2;
  const cy = pu.y + pu.height / 2 + (prefersReducedMotion() ? 0 : Math.sin((time + pu.phase) * Math.PI * 2) * 2.5);
  const r = pu.width / 2;
  if (pu.kind === 'star') {
    ctx.fillStyle = PALETTE.amber;
    starPath(ctx, cx, cy, r, r * 0.45, 5);
    ctx.fill();
    ctx.strokeStyle = '#141b34'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (pu.kind === 'shield') {
    ctx.fillStyle = PALETTE.teal;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy - r * 0.5);
    ctx.lineTo(cx + r * 0.8, cy + r * 0.6);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.8, cy + r * 0.6);
    ctx.lineTo(cx - r, cy - r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0c1226'; ctx.lineWidth = 2; // галочка
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.35, cy);
    ctx.lineTo(cx - r * 0.05, cy + r * 0.35);
    ctx.lineTo(cx + r * 0.45, cy - r * 0.3);
    ctx.stroke();
  } else { // wing
    ctx.fillStyle = PALETTE.chalk;
    ctx.beginPath(); ctx.ellipse(cx - r * 0.45, cy, r * 0.55, r * 0.35, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.45, cy, r * 0.55, r * 0.35, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.amber;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2); ctx.fill();
  }
}

function starPath(ctx, cx, cy, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = i * Math.PI / points - Math.PI / 2;
    const rad = i % 2 === 0 ? outer : inner;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawCheckpoint(ctx, checkpoint) {
  const poleX = checkpoint.x + 2;
  const top = checkpoint.y;

  ctx.strokeStyle = checkpoint.active ? PALETTE.teal : PALETTE.chalk;
  ctx.globalAlpha = checkpoint.active ? 1 : 0.45;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(poleX, top);
  ctx.lineTo(poleX, top + checkpoint.height);
  ctx.stroke();

  // Пройденный флажок разворачивается и заливается: разница видна боковым
  // зрением, без всякой надписи.
  ctx.beginPath();
  ctx.moveTo(poleX, top + 2);
  ctx.lineTo(poleX + (checkpoint.active ? 13 : 8), top + 7);
  ctx.lineTo(poleX, top + 12);
  ctx.closePath();
  if (checkpoint.active) {
    ctx.fillStyle = PALETTE.teal;
    ctx.fill();
  } else {
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawChest(ctx, chest) {
  const lidHeight = 8;
  const bodyY = chest.y + lidHeight;

  ctx.fillStyle = chest.opened ? 'rgba(232, 236, 244, 0.10)' : 'rgba(242, 168, 59, 0.20)';
  roundedRect(ctx, chest.x, bodyY, chest.width, chest.height - lidHeight, 3);
  ctx.fill();
  ctx.strokeStyle = chest.opened ? PALETTE.chalk : PALETTE.amber;
  ctx.globalAlpha = chest.opened ? 0.5 : 1;
  ctx.lineWidth = 2;
  roundedRect(ctx, chest.x, bodyY, chest.width, chest.height - lidHeight, 3);
  ctx.stroke();

  // Открытая крышка откинута назад — сундук читается как использованный.
  ctx.save();
  if (chest.opened) {
    ctx.translate(chest.x, bodyY);
    ctx.rotate(-0.7);
    roundedRect(ctx, 0, -lidHeight, chest.width, lidHeight, 3);
  } else {
    roundedRect(ctx, chest.x, chest.y, chest.width, lidHeight + 2, 3);
  }
  ctx.stroke();
  ctx.restore();

  if (!chest.opened) {
    ctx.fillStyle = PALETTE.amber;
    ctx.fillRect(chest.x + chest.width / 2 - 2, bodyY + 2, 4, 6);
  }
  ctx.globalAlpha = 1;
}

function drawDoor(ctx, door) {
  const color = KEY_COLORS[door.keyColor] ?? PALETTE.chalk;

  ctx.fillStyle = door.opened ? 'rgba(61, 191, 168, 0.16)' : 'rgba(232, 236, 244, 0.08)';
  roundedRect(ctx, door.x, door.y, door.width, door.height, 10);
  ctx.fill();

  ctx.strokeStyle = door.opened ? PALETTE.teal : color;
  ctx.globalAlpha = door.opened ? 1 : 0.85;
  ctx.lineWidth = 2.5;
  roundedRect(ctx, door.x, door.y, door.width, door.height, 10);
  ctx.stroke();

  if (door.opened) {
    // Открытая дверь: проём распахнут, замка нет.
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(door.x + door.width - 6, door.y + 6);
    ctx.lineTo(door.x + door.width - 6, door.y + door.height - 6);
    ctx.stroke();
  } else {
    // Замочная скважина в цвет ключа: видно, какой ключ искать.
    ctx.fillStyle = color;
    const cx = door.x + door.width / 2;
    const cy = door.y + door.height * 0.55;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 2, cy, 4, 9);
  }
  ctx.globalAlpha = 1;
}

function drawCoin(ctx, coin, time) {
  if (coin.taken) return;

  // Монеты покачиваются вразнобой — по своей фазе. При reduced-motion стоят.
  const bob = prefersReducedMotion() ? 0 : Math.sin((time + coin.phase) * Math.PI * 2) * 2.5;
  const cx = coin.x + coin.width / 2;
  const cy = coin.y + coin.height / 2 + bob;
  const radius = coin.width / 2;

  ctx.fillStyle = PALETTE.amber;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.skyDeep;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 4, Math.PI * 0.9, Math.PI * 1.8);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
