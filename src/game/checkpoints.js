import { overlaps } from '../engine/physics.js';
import { TILE } from '../engine/constants.js';

// Чекпоинты — флажки на карте. Коснулся — сюда же и вернёшься после падения.
// На Этапе 3 это переедет в game/entities.js вместе с монетами и сундуками.

// Флажок ниже тайла: он стоит на земле, а не висит в его середине.
const FLAG_WIDTH = 18;
const FLAG_HEIGHT = 30;

export function createCheckpoints(map) {
  const list = [];

  for (let line = 0; line < map.lines; line++) {
    for (let column = 0; column < map.columns; column++) {
      if (map.tileAt(column, line) !== 'checkpoint') continue;
      list.push({
        column,
        line,
        x: column * TILE + (TILE - FLAG_WIDTH) / 2,
        y: line * TILE + TILE - FLAG_HEIGHT,
        width: FLAG_WIDTH,
        height: FLAG_HEIGHT,
        active: false
      });
    }
  }

  // Возвращает флажок, который активировался именно сейчас — вызывающий код
  // может звякнуть звуком. Уже активный второй раз не срабатывает.
  function update(player) {
    for (const checkpoint of list) {
      if (checkpoint.active || !overlaps(player, checkpoint)) continue;

      checkpoint.active = true;
      // Точка возврата — левый верхний угол тайла с флажком: игрок появится
      // стоя на той же земле, на которой этот флажок и стоит.
      player.respawnX = checkpoint.column * TILE + (TILE - player.width) / 2;
      player.respawnY = checkpoint.line * TILE + TILE - player.height;
      return checkpoint;
    }
    return null;
  }

  return { list, update };
}
