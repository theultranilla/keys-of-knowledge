import { VIEW_WIDTH, VIEW_HEIGHT, PALETTE } from '../engine/constants.js';
import { t } from '../ui/i18n.js';

// Экранный слой данжа: миникарта этажа, полоска здоровья с этажом/монетами,
// счётчик оставшихся врагов и баннер при входе на этаж. Рисуется поверх мира
// (без смещения камеры), потому вынесен из сессии — это чистая отрисовка от
// состояния, без своей логики.

const MINI_KIND = {
  start: '#5ac888', combat: '#96a0be', boss: '#e05a67', treasure: '#f6d24d', shop: '#9e73ee',
  shrine: '#c9c24a', heal: '#5ad0a0'
};

export function drawMinimap(ctx, floor, current) {
  const step = 18, pad = 11, r = 5;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const rm of floor.rooms) {
    minX = Math.min(minX, rm.cell.x); maxX = Math.max(maxX, rm.cell.x);
    minY = Math.min(minY, rm.cell.y); maxY = Math.max(maxY, rm.cell.y);
  }
  const w = (maxX - minX + 1) * step + pad * 2, h = (maxY - minY + 1) * step + pad * 2;
  const ox = VIEW_WIDTH - w - 14, oy = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(ox, oy, w, h);

  const cx = (cell) => ox + pad + (cell.x - minX) * step;
  const cy = (cell) => oy + pad + (cell.y - minY) * step;

  // Связи между комнатами: рисуем только вправо/вниз, чтобы не дублировать линию.
  // Полная сетка видна сразу — понятно, куда идти, ещё до посещения.
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  for (const rm of floor.rooms) {
    const rightN = floor.roomByCell.get(`${rm.cell.x + 1},${rm.cell.y}`);
    const downN = floor.roomByCell.get(`${rm.cell.x},${rm.cell.y + 1}`);
    if (rm.doors.e && rightN) { ctx.beginPath(); ctx.moveTo(cx(rm.cell), cy(rm.cell)); ctx.lineTo(cx(rightN.cell), cy(rm.cell)); ctx.stroke(); }
    if (rm.doors.s && downN) { ctx.beginPath(); ctx.moveTo(cx(rm.cell), cy(rm.cell)); ctx.lineTo(cx(rm.cell), cy(downN.cell)); ctx.stroke(); }
  }

  for (const rm of floor.rooms) {
    ctx.globalAlpha = rm.visited ? 1 : 0.3; // непосещённые — призрачные
    drawRoomMarker(ctx, cx(rm.cell), cy(rm.cell), rm.kind, r);
    ctx.globalAlpha = 1;
    if (rm === current) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx(rm.cell) - r - 3, cy(rm.cell) - r - 3, (r + 3) * 2, (r + 3) * 2);
    }
  }
}

// Маркер комнаты по типу — форма важнее цвета: узнаётся и боковым зрением.
function drawRoomMarker(ctx, x, y, kind, r) {
  ctx.fillStyle = MINI_KIND[kind] ?? MINI_KIND.combat;
  switch (kind) {
    case 'boss':
    case 'treasure': { // ромб; у босса — тёмный «глаз» в центре
      ctx.beginPath();
      ctx.moveTo(x, y - r - 1); ctx.lineTo(x + r + 1, y); ctx.lineTo(x, y + r + 1); ctx.lineTo(x - r - 1, y);
      ctx.closePath(); ctx.fill();
      if (kind === 'boss') { ctx.fillStyle = '#2a0a0e'; ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'shop': { // квадрат с плюсом-«товаром»
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#efeaff';
      ctx.fillRect(x - 1, y - 2.5, 2, 5);
      ctx.fillRect(x - 2.5, y - 1, 5, 2);
      break;
    }
    case 'start': { // кружок — точка старта
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default: { // combat — квадратик поменьше
      ctx.fillRect(x - r + 1, y - r + 1, (r - 1) * 2, (r - 1) * 2);
      break;
    }
  }
}

export function drawHp(ctx, player, floorNumber, weaponName) {
  const x = 18, y = 18, w = 220, h = 20;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.coral;
  ctx.fillRect(x + 3, y + 3, (w - 6) * Math.max(0, player.hp / player.maxHp), h - 6);
  ctx.fillStyle = '#f6d24d';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(t('dungeon.floor', { n: floorNumber }) + '    ' + t('dungeon.coins', { n: player.coins }), x, y + h + 20);
  if (weaponName) {
    ctx.fillStyle = '#7fe3d4';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(t('dungeon.weapon', { name: weaponName }), x, y + h + 40);
  }
}

// Счётчик оставшихся врагов — только когда бой идёт (иначе не мешаем взгляду).
export function drawEnemiesLeft(ctx, count) {
  if (count <= 0) return;
  ctx.fillStyle = '#e05a67';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(t('dungeon.enemiesLeft', { n: count }), VIEW_WIDTH / 2, 16);
  ctx.textAlign = 'left';
}

// Полоска здоровья босса — по центру сверху, пока босс жив. Даёт бою ощущение
// прогресса, которого «просто большой враг» не давал.
export function drawBossBar(ctx, boss) {
  const w = 360, h = 16, x = (VIEW_WIDTH - w) / 2, y = 40;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = '#5a1e26'; // тёмная подложка = потерянное здоровье
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#e05a67';
  ctx.fillRect(x, y, w * Math.max(0, boss.hp / boss.maxHp), h);
  ctx.fillStyle = '#f6d24d';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('dungeon.boss'), VIEW_WIDTH / 2, y + h / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Баннер «Этаж N» при входе: крупно по центру, гаснет к концу таймера.
export function drawFloorBanner(ctx, floorNumber, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = PALETTE.amber;
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('dungeon.floor', { n: floorNumber }), VIEW_WIDTH / 2, VIEW_HEIGHT * 0.34);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
