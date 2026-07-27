import { overlaps } from '../engine/physics.js';
import { TILE, PALETTE } from '../engine/constants.js';

// Всё, что стоит на уровне и с чем игрок сталкивается. Модуль не знает про
// отрисовку и про счётчики: он только двигает платформы и сообщает событиями,
// чего игрок коснулся. Что это значит для жизней и ключей — решает main.js.

export const KEY_COLORS = {
  amber: PALETTE.amber,
  teal: PALETTE.teal,
  coral: PALETTE.coral
};

// Хитбоксы намеренно меньше тайла: монету приятнее собирать с запасом, а на
// шипе не должно убивать за касание уголком.
const COIN_SIZE = 16;
const SPIKE_INSET = 5;
const SPIKE_TOP = 13;
const CHEST_WIDTH = 26;
const CHEST_HEIGHT = 22;
const DOOR_WIDTH = 26;
const DOOR_HEIGHT = TILE * 2;
const FLAG_WIDTH = 18;
const FLAG_HEIGHT = 30;
const PLATFORM_HEIGHT = 12;

export function createEntities(level) {
  const coins = [];
  const spikes = [];
  const checkpoints = [];

  for (let line = 0; line < level.lines; line++) {
    for (let column = 0; column < level.columns; column++) {
      const x = column * TILE;
      const y = line * TILE;

      switch (level.tileAt(column, line)) {
        case 'coin':
          coins.push({
            x: x + (TILE - COIN_SIZE) / 2,
            y: y + (TILE - COIN_SIZE) / 2,
            width: COIN_SIZE,
            height: COIN_SIZE,
            // Фаза нужна, чтобы монеты покачивались вразнобой, а не строем.
            phase: (column * 7 + line * 13) % 100 / 100,
            taken: false
          });
          break;
        case 'spike':
          spikes.push({
            x: x + SPIKE_INSET,
            y: y + SPIKE_TOP,
            width: TILE - SPIKE_INSET * 2,
            height: TILE - SPIKE_TOP,
            column,
            line
          });
          break;
        case 'checkpoint':
          checkpoints.push({
            column,
            line,
            x: x + (TILE - FLAG_WIDTH) / 2,
            y: y + TILE - FLAG_HEIGHT,
            width: FLAG_WIDTH,
            height: FLAG_HEIGHT,
            active: false
          });
          break;
        default:
          break;
      }
    }
  }

  const chests = level.chests.map((entry) => ({
    ...entry,
    column: entry.at[0],
    line: entry.at[1],
    x: entry.at[0] * TILE + (TILE - CHEST_WIDTH) / 2,
    y: entry.at[1] * TILE + TILE - CHEST_HEIGHT,
    width: CHEST_WIDTH,
    height: CHEST_HEIGHT,
    opened: false
  }));

  // Дверь стоит на своём тайле и уходит на два тайла вверх — так она читается
  // как дверь, а не как люк в полу.
  const doors = level.doors.map((entry) => ({
    ...entry,
    column: entry.at[0],
    line: entry.at[1],
    x: entry.at[0] * TILE + (TILE - DOOR_WIDTH) / 2,
    y: (entry.at[1] + 1) * TILE - DOOR_HEIGHT,
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
    opened: false
  }));

  const platforms = level.platforms.map((entry) => {
    const width = entry.tiles * TILE;
    const fromX = entry.from[0] * TILE;
    const fromY = entry.from[1] * TILE;
    return {
      x: fromX,
      y: fromY,
      previousX: fromX,
      previousY: fromY,
      // Смещение за шаг — по нему игрок едет вместе с платформой.
      deltaX: 0,
      deltaY: 0,
      width,
      height: PLATFORM_HEIGHT,
      fromX,
      fromY,
      toX: entry.to[0] * TILE,
      toY: entry.to[1] * TILE,
      speed: entry.speed,
      forward: true
    };
  });

  function update(dt) {
    for (const platform of platforms) {
      movePlatform(platform, dt);
    }
    for (const coin of coins) {
      coin.phase = (coin.phase + dt * 0.6) % 1;
    }
  }

  // Собирает всё, чего игрок коснулся на этом шаге. Возвращает список событий:
  // порядок в нём — порядок, в котором они случились.
  function collide(player, keys) {
    const events = [];

    for (const coin of coins) {
      if (coin.taken || !overlaps(player, coin)) continue;
      coin.taken = true;
      events.push({ type: 'coin', coin });
    }

    for (const checkpoint of checkpoints) {
      if (checkpoint.active || !overlaps(player, checkpoint)) continue;
      checkpoint.active = true;
      events.push({ type: 'checkpoint', checkpoint });
    }

    for (const spike of spikes) {
      if (!overlaps(player, spike)) continue;
      events.push({ type: 'spike', spike });
      break; // одной смерти за шаг достаточно
    }

    for (const door of doors) {
      if (door.opened || !overlaps(player, door)) continue;
      if (keys.has(door.keyColor)) {
        door.opened = true;
        events.push({ type: 'door-opened', door });
      } else {
        events.push({ type: 'door-locked', door });
      }
    }

    return events;
  }

  // Сундук открывается по кнопке, а не касанием: иначе игрок влетал бы в задачу
  // на бегу, не поняв, что произошло.
  function chestInReach(player) {
    return chests.find((chest) => !chest.opened && overlaps(player, chest)) ?? null;
  }

  return {
    coins,
    spikes,
    checkpoints,
    chests,
    doors,
    platforms,
    update,
    collide,
    chestInReach,
    // Платформы твёрдые: физика игрока разбирает их наравне с тайлами.
    get solidBoxes() {
      return platforms;
    }
  };
}

function movePlatform(platform, dt) {
  platform.previousX = platform.x;
  platform.previousY = platform.y;

  const targetX = platform.forward ? platform.toX : platform.fromX;
  const targetY = platform.forward ? platform.toY : platform.fromY;
  const dx = targetX - platform.x;
  const dy = targetY - platform.y;
  const distance = Math.hypot(dx, dy);
  const step = platform.speed * dt;

  if (distance <= step || distance === 0) {
    // Дошли до конца — встаём точно в точку и разворачиваемся. Без «точно»
    // платформа за сотни циклов уползла бы от заданных координат.
    platform.x = targetX;
    platform.y = targetY;
    platform.forward = !platform.forward;
  } else {
    platform.x += (dx / distance) * step;
    platform.y += (dy / distance) * step;
  }

  platform.deltaX = platform.x - platform.previousX;
  platform.deltaY = platform.y - platform.previousY;
}
