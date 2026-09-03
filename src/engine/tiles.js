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
        drawTile(ctx, map, column, line, kind);
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

// Мультяшный тайл: грунт с травяной шапкой. Трава и кромки рисуются только на
// ОТКРЫТЫХ гранях (где нет соседнего тайла), поэтому сплошной массив выглядит как
// цельная земля, а не как решётка одинаковых квадратиков.
const DIRT = '#7a512e', DIRT_DK = '#5d3d22', GRASS = '#5cb552', GRASS_DK = '#3f8f3a';
const solidTile = (k) => k === 'ground' || k === 'platform';

function drawTile(ctx, map, col, line, kind) {
  const x = col * TILE, y = line * TILE;
  const openTop = !solidTile(map.tileAt(col, line - 1));
  const openBot = !solidTile(map.tileAt(col, line + 1));
  const openL = !solidTile(map.tileAt(col - 1, line));
  const openR = !solidTile(map.tileAt(col + 1, line));

  // тело-грунт
  ctx.fillStyle = DIRT;
  ctx.fillRect(x, y, TILE, TILE);
  // крапины камешков — детерминированы по координате, чтобы не мигали
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  const h = (col * 7 + line * 13) % 4;
  ctx.fillRect(x + 4 + h * 4, y + TILE * 0.5, 4, 4);
  ctx.fillRect(x + TILE - 11, y + TILE * 0.68, 3, 3);

  if (openTop) {
    // травяная шапка + свисающие бугорки
    ctx.fillStyle = GRASS_DK; ctx.fillRect(x, y, TILE, 11);
    ctx.fillStyle = GRASS; ctx.fillRect(x, y, TILE, 7);
    ctx.fillStyle = GRASS_DK;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 5 + i * (TILE / 3), y + 11, 3.2, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, TILE, 2); // блик на траве
  }
  // тёмные кромки только по открытым сторонам — дают объём массиву
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  if (openBot) ctx.fillRect(x, y + TILE - 3, TILE, 3);
  if (openL) ctx.fillRect(x, y + (openTop ? 11 : 0), 3, TILE - (openTop ? 11 : 0));
  if (openR) ctx.fillRect(x + TILE - 3, y + (openTop ? 11 : 0), 3, TILE - (openTop ? 11 : 0));
}
