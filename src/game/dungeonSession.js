import { VIEW_WIDTH, VIEW_HEIGHT, TILE, PALETTE, PLAYER_WIDTH, PLAYER_HEIGHT } from '../engine/constants.js';
import { drawCharacter } from '../engine/character.js';
import { DEFAULT_SKIN } from './skins.js';

// Режим «Данж» (рогалик в духе Soul Knight): top-down забег. Пока — каркас: одна
// комната, персонаж ходит (WASD/стрелки) и целится в мышь. Дальше нарастим стрельбу,
// врагов и карту комнат. Рисует сцену сам (renderer отдаёт ctx), общий слой
// (задачи, звук, сохранения, скины) берём из платформера.

const WALL = TILE;            // толщина стены комнаты
const MOVE_SPEED = 235;       // px/с — подобрано на ощупь, крутить можно
const MIN_X = WALL, MAX_X = VIEW_WIDTH - WALL;
const MIN_Y = WALL, MAX_Y = VIEW_HEIGHT - WALL;

export function createDungeonSession({ input, audio, save, canvas }) {
  const player = {
    x: VIEW_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: VIEW_HEIGHT / 2 - PLAYER_HEIGHT / 2,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    prevX: 0,
    prevY: 0,
    aim: { x: 1, y: 0 },
    facing: 1
  };
  player.prevX = player.x;
  player.prevY = player.y;

  let skin = save?.equipped ?? DEFAULT_SKIN;
  // Указатель мыши в логических координатах 960×540. Камеры пока нет, комната во
  // весь экран, поэтому это сразу мировые координаты прицела.
  const pointer = { x: VIEW_WIDTH * 0.7, y: VIEW_HEIGHT / 2 };

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1) return;
    pointer.x = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    pointer.y = ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT;
  }
  canvas.addEventListener('pointermove', onPointerMove);

  function update(dt) {
    player.prevX = player.x;
    player.prevY = player.y;

    let mx = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    let my = (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0);
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my); // по диагонали не быстрее
      player.x = clamp(player.x + (mx / len) * MOVE_SPEED * dt, MIN_X, MAX_X - player.width);
      player.y = clamp(player.y + (my / len) * MOVE_SPEED * dt, MIN_Y, MAX_Y - player.height);
    }

    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const ax = pointer.x - cx, ay = pointer.y - cy;
    const al = Math.hypot(ax, ay);
    if (al > 0.001) { player.aim.x = ax / al; player.aim.y = ay / al; }
    player.facing = player.aim.x >= 0 ? 1 : -1;
  }

  function render(ctx, alpha) {
    ctx.fillStyle = PALETTE.skyDeep; // фон за стенами
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.fillStyle = PALETTE.skyMid;  // пол комнаты
    ctx.fillRect(WALL, WALL, VIEW_WIDTH - 2 * WALL, VIEW_HEIGHT - 2 * WALL);

    ctx.fillStyle = '#2b3566';       // стены
    ctx.fillRect(0, 0, VIEW_WIDTH, WALL);
    ctx.fillRect(0, VIEW_HEIGHT - WALL, VIEW_WIDTH, WALL);
    ctx.fillRect(0, 0, WALL, VIEW_HEIGHT);
    ctx.fillRect(VIEW_WIDTH - WALL, 0, WALL, VIEW_HEIGHT);

    const px = lerp(player.prevX, player.x, alpha);
    const py = lerp(player.prevY, player.y, alpha);
    drawCharacter(ctx, px, py, player.width, player.height, skin, player.facing);

    // «оружие» — короткая линия в сторону прицела
    const cx = px + player.width / 2, cy = py + player.height / 2;
    ctx.strokeStyle = PALETTE.amber;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + player.aim.x * 26, cy + player.aim.y * 26);
    ctx.stroke();
  }

  return {
    update,
    render,
    setSkin(next) { skin = next; },
    destroy() { canvas.removeEventListener('pointermove', onPointerMove); }
  };
}

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

function lerp(from, to, t) {
  return from + (to - from) * t;
}
