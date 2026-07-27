import { roundedRect } from './shapes.js';
import { prefersReducedMotion } from './motion.js';
import { PALETTE } from './constants.js';
import { KEY_COLORS } from '../game/entities.js';

// Всё, что стоит на уровне: платформы, монеты, шипы, флажки, сундуки, двери.
// Рисуется в мировых координатах, поверх тайлов и под игроком.

export function drawProps(ctx, entities, time) {
  for (const platform of entities.platforms) drawPlatform(ctx, platform);
  for (const spike of entities.spikes) drawSpike(ctx, spike);
  for (const checkpoint of entities.checkpoints) drawCheckpoint(ctx, checkpoint);
  for (const chest of entities.chests) drawChest(ctx, chest);
  for (const door of entities.doors) drawDoor(ctx, door);
  for (const coin of entities.coins) drawCoin(ctx, coin, time);
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
  // Шип занимает не весь тайл, поэтому рисуем от его собственной коробки —
  // видимая форма совпадает с той, что действительно убивает.
  const teeth = 3;
  const step = spike.width / teeth;

  ctx.fillStyle = PALETTE.coral;
  ctx.beginPath();
  for (let index = 0; index < teeth; index++) {
    const left = spike.x + index * step;
    ctx.moveTo(left, spike.y + spike.height);
    ctx.lineTo(left + step / 2, spike.y);
    ctx.lineTo(left + step, spike.y + spike.height);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(20, 27, 52, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
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
