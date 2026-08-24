import { VIEW_WIDTH, PALETTE } from '../engine/constants.js';

// Экранный слой данжа: миникарта этажа и полоска здоровья с монетами. Рисуется
// поверх мира (без смещения камеры), потому вынесен из сессии — это чистая
// отрисовка от состояния, без своей логики.

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

export function drawHp(ctx, player) {
  const x = 18, y = 18, w = 220, h = 20;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.coral;
  ctx.fillRect(x + 3, y + 3, (w - 6) * Math.max(0, player.hp / player.maxHp), h - 6);
  ctx.fillStyle = '#f6d24d';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Монеты: ' + player.coins, x, y + h + 20);
}
