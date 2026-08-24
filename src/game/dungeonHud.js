import { VIEW_WIDTH, VIEW_HEIGHT, PALETTE } from '../engine/constants.js';
import { t } from '../ui/i18n.js';

// Экранный слой данжа: миникарта этажа, полоска здоровья с этажом/монетами,
// счётчик оставшихся врагов и баннер при входе на этаж. Рисуется поверх мира
// (без смещения камеры), потому вынесен из сессии — это чистая отрисовка от
// состояния, без своей логики.

const MINI_KIND = {
  start: '#5ac888', combat: '#96a0be', boss: '#e05a67', treasure: '#f6d24d', shop: '#9e73ee'
};

export function drawMinimap(ctx, floor, current) {
  const step = 16, pad = 8;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const r of floor.rooms) {
    minX = Math.min(minX, r.cell.x); maxX = Math.max(maxX, r.cell.x);
    minY = Math.min(minY, r.cell.y); maxY = Math.max(maxY, r.cell.y);
  }
  const w = (maxX - minX + 1) * step + pad * 2, h = (maxY - minY + 1) * step + pad * 2;
  const ox = VIEW_WIDTH - w - 14, oy = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(ox, oy, w, h);
  for (const r of floor.rooms) {
    const x = ox + pad + (r.cell.x - minX) * step, y = oy + pad + (r.cell.y - minY) * step;
    ctx.globalAlpha = r.visited ? 1 : 0.32; // непосещённые — призрачные
    ctx.fillStyle = MINI_KIND[r.kind] ?? MINI_KIND.combat;
    ctx.fillRect(x - 5, y - 5, 10, 10);
    ctx.globalAlpha = 1;
    if (r === current) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x - 7, y - 7, 14, 14); }
  }
}

export function drawHp(ctx, player, floorNumber) {
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
