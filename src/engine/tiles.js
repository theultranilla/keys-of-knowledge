import { roundedRect } from './shapes.js';
import { TILE, VIEW_WIDTH, VIEW_HEIGHT, PALETTE } from './constants.js';

// Тайловая сетка: меловые линии на грифельной доске. Рисуется в мировых
// координатах — контекст к этому моменту уже сдвинут камерой.

export function drawTiles(ctx, map, cameraX, cameraY) {
  // Рисуем только то, что попадает в кадр. На карте в тысячи тайлов перебор
  // всей сетки каждый кадр — самый простой способ потерять 60 FPS на ровном месте.
  const columnFrom = Math.max(0, Math.floor(cameraX / TILE));
  const columnTo = Math.min(map.columns - 1, Math.floor((cameraX + VIEW_WIDTH) / TILE));
  const lineFrom = Math.max(0, Math.floor(cameraY / TILE));
  const lineTo = Math.min(map.lines - 1, Math.floor((cameraY + VIEW_HEIGHT) / TILE));

  for (let line = lineFrom; line <= lineTo; line++) {
    for (let column = columnFrom; column <= columnTo; column++) {
      const kind = map.tileAt(column, line);
      if (kind === 'ground' || kind === 'platform') {
        drawTile(ctx, kind, column * TILE, line * TILE);
      }
    }
  }
}

function drawTile(ctx, kind, x, y) {
  const isGround = kind === 'ground';

  ctx.fillStyle = isGround ? 'rgba(232, 236, 244, 0.10)' : 'rgba(232, 236, 244, 0.16)';
  roundedRect(ctx, x + 1, y + 1, TILE - 2, TILE - 2, 4);
  ctx.fill();

  ctx.strokeStyle = PALETTE.chalk;
  ctx.globalAlpha = isGround ? 0.35 : 0.6;
  ctx.lineWidth = 2;
  roundedRect(ctx, x + 1, y + 1, TILE - 2, TILE - 2, 4);
  ctx.stroke();

  // Тонкая линия по верху: подчёркивает, куда именно можно приземлиться.
  ctx.globalAlpha = isGround ? 0.5 : 0.85;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 2.5);
  ctx.lineTo(x + TILE - 4, y + 2.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
