import { roundedRect } from './shapes.js';
import { prefersReducedMotion } from './motion.js';
import { TILE, VIEW_WIDTH, VIEW_HEIGHT, PALETTE, SPRING_PULSE_TIME } from './constants.js';

// Тайловая сетка: меловые линии на грифельной доске. Рисуется в мировых
// координатах — контекст к этому моменту уже сдвинут камерой.

export function drawTiles(ctx, map, cameraX, cameraY, time = 0, springPulses = null) {
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
      } else if (kind === 'spring') {
        const pulse = springPulses?.get(`${column}:${line}`) ?? 0;
        drawSpring(ctx, column * TILE, line * TILE, pulse, time);
      }
    }
  }
}

// Батут: янтарная площадка ровно там, где стоят ступни, и пружина-зигзаг под ней.
// Цвет янтарный — тот же «полезный тёплый», что у монет и ключей. Пад дышит на
// холостом ходу и выстреливает вверх в момент отскока, растягивая пружину.
function drawSpring(ctx, x, y, pulse, time) {
  const reduced = prefersReducedMotion();
  const idle = reduced ? 0 : Math.sin(time * 2 + x * 0.05) * 0.8;
  let lift = 0;
  if (pulse > 0 && !reduced) {
    const t = pulse / SPRING_PULSE_TIME; // 1 сразу после отскока → 0 в конце
    lift = t * 7 * Math.cos((1 - t) * Math.PI * 2); // выстрел вверх с затуханием
  }
  const padY = y + 2 - lift - idle;

  ctx.fillStyle = 'rgba(242, 168, 59, 0.28)';
  roundedRect(ctx, x + 3, padY, TILE - 6, 7, 3);
  ctx.fill();
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 2;
  roundedRect(ctx, x + 3, padY, TILE - 6, 7, 3);
  ctx.stroke();

  // Зигзаг тянется от нижней кромки пада до низа тайла — поднимется пад, растянется
  // и пружина.
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const top = padY + 8;
  const bottom = y + TILE - 3;
  const left = x + 8;
  const right = x + TILE - 8;
  const turns = 3;
  for (let index = 0; index <= turns; index++) {
    const cy = top + ((bottom - top) * index) / turns;
    if (index === 0) ctx.moveTo(left, cy);
    else ctx.lineTo(index % 2 === 1 ? right : left, cy);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
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
