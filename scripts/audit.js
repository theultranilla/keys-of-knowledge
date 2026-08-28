import { createEntities } from '../src/game/entities.js';
import { createPlayer, updatePlayer } from '../src/game/player.js';
import { overlaps } from '../src/engine/physics.js';
import { TILE, STEP } from '../src/engine/constants.js';

// Аудит уровня: можно ли его пройти и нет ли на нём места, откуда не выбраться.
//
// Написан после того, как на Этапе 2 я построил колодец, из которого игрок не
// мог выпрыгнуть, и не заметил этого, потому что проверял только «куда можно
// допрыгнуть», а не «можно ли откуда-то уйти».
//
// Модель простая: перебираем площадки, на которых игрок стоит, из каждой пробуем
// все разумные политики (влево/вправо × момент прыжка × длина удержания) и
// смотрим, куда он попадает. Ключи копятся по мере того, как становятся
// достижимы сундуки, — поэтому дверь, запертую до своего сундука, аудит не
// путает с непроходимой.

const JUMP_TIMINGS = [0, 2, 4, 6, 8, 11, 14, 18, 22, 27, 33, 40];
const HOLD_STEPS = [2, 60];
const RUN_STEPS = 110;
// Площадки округляем: без этого каждый пиксель приземления был бы отдельной
// вершиной графа, и обход бы не сошёлся.
const GRID_X = 16;
const GRID_Y = 8;

export function auditLevel(level) {
  const problems = [];
  const notes = [];

  checkPlacement(level, problems);

  // Монеты собираем той же симуляцией, что и всё остальное: монета достижима,
  // если хотя бы один разумный прыжок реально её касается на пути, с которого
  // игрок потом приземляется живым. До монеты, куда можно только упасть в
  // пропасть или напороться на шип, «не добраться»: собрать её, не потеряв
  // жизнь, нельзя, а значит и звезду за монеты честно не взять.
  const coins = createEntities(level).coins.map((coin, index) => ({
    id: index,
    column: Math.floor(coin.x / TILE),
    line: Math.floor(coin.y / TILE),
    box: { x: coin.x, y: coin.y, width: coin.width, height: coin.height }
  }));
  const collected = new Set();

  const keys = new Set();
  let spots = new Map();
  let openedChests = new Set();

  // Ключи открывают новые куски уровня, новые куски дают новые ключи. Крутим
  // до тех пор, пока перестанет добавляться и то, и другое.
  for (let pass = 0; pass <= level.chests.length; pass++) {
    spots = explore(level, keys, coins, collected);
    const before = openedChests.size;

    for (const chest of level.chests) {
      if (openedChests.has(chest.keyColor)) continue;
      if (canReach(spots, chest.at)) {
        openedChests.add(chest.keyColor);
        keys.add(chest.keyColor);
      }
    }
    if (openedChests.size === before) break;
  }

  for (const chest of level.chests) {
    if (!openedChests.has(chest.keyColor)) {
      problems.push(`до сундука на [${chest.at}] не добраться`);
    }
  }

  const exit = level.doors.find((door) => door.exit);
  if (exit && !canReach(spots, exit.at)) {
    problems.push(`до двери-выхода на [${exit.at}] не добраться`);
  }

  if (level.flag && !canReach(spots, level.flag.at)) {
    problems.push(`до финиш-флага на [${level.flag.at}] не добраться`);
  }

  const traps = [...spots.values()].filter((spot) => spot.exits === 0);
  for (const trap of traps.slice(0, 3)) {
    problems.push(`капкан: с площадки [колонка ${Math.round(trap.x / TILE)}, y ${Math.round(trap.y)}] не уйти`);
  }

  const unreachable = coins.filter((coin) => !collected.has(coin.id));
  for (const coin of unreachable.slice(0, 5)) {
    problems.push(`до монеты на [${coin.column},${coin.line}] не добраться`);
  }
  if (unreachable.length > 5) {
    problems.push(`…и ещё ${unreachable.length - 5} недостижимых монет`);
  }

  notes.push(`площадок: ${spots.size}`);
  notes.push(`монет достижимо: ${collected.size}/${coins.length}`);
  notes.push(`ключей в обороте: ${[...keys].join(', ') || 'нет'}`);

  return { id: level.id, title: level.title, problems, notes };
}

// Сущности не должны стоять внутри стен, а платформа в точке покоя — налезать
// на пол: и то, и другое ломает уровень тихо.
function checkPlacement(level, problems) {
  for (let line = 0; line < level.lines; line++) {
    for (let column = 0; column < level.columns; column++) {
      const kind = level.tileAt(column, line);
      // ground/platform/spring — сами твёрдые тайлы, это не «сущность в стене».
      if (kind === 'empty' || kind === 'ground' || kind === 'platform' || kind === 'spring') continue;
      if (level.isSolid(column, line)) problems.push(`«${kind}» на [${column},${line}] внутри твёрдого тайла`);
    }
  }

  const entities = createEntities(level);
  for (const platform of entities.platforms) {
    for (const [x, y, label] of [[platform.fromX, platform.fromY, 'from'], [platform.toX, platform.toY, 'to']]) {
      const box = { x, y, width: platform.width, height: platform.height };
      if (touchesSolid(level, box)) {
        problems.push(`платформа в точке ${label} [${x / TILE},${y / TILE}] налезает на пол`);
      }
    }
  }
}

function touchesSolid(level, box) {
  const eps = 1e-6;
  for (let column = Math.floor(box.x / TILE); column <= Math.floor((box.x + box.width - eps) / TILE); column++) {
    for (let line = Math.floor(box.y / TILE); line <= Math.floor((box.y + box.height - eps) / TILE); line++) {
      if (level.isSolid(column, line)) return true;
    }
  }
  return false;
}

function explore(level, keys, coins = [], collected = new Set()) {
  const spots = new Map();
  const queue = [];

  const start = settle(level, keys, createPlayer(level.spawn));
  if (!start) return spots;
  add(start);

  while (queue.length > 0) {
    const spot = queue.shift();
    spot.exits = 0;

    for (const direction of ['left', 'right', null]) {
      for (const jumpAt of JUMP_TIMINGS) {
        for (const hold of HOLD_STEPS) {
          const landing = simulate(level, keys, spot, direction, jumpAt, hold, coins, collected);
          if (!landing) continue;
          // Падение за границу уровня — тоже выход: игрок вернётся на чекпоинт.
          if (landing === 'fell') {
            spot.exits += 1;
            continue;
          }
          if (key(landing) !== key(spot)) {
            spot.exits += 1;
            add(landing);
          }
        }
      }
    }
  }

  return spots;

  function key(spot) {
    return `${Math.round(spot.x / GRID_X)}:${Math.round(spot.y / GRID_Y)}`;
  }

  function add(spot) {
    const id = key(spot);
    if (spots.has(id)) return;
    const entry = { x: spot.x, y: spot.y, exits: 0 };
    spots.set(id, entry);
    queue.push(entry);
  }
}

function world(level, keys) {
  const entities = createEntities(level);
  // Запертая дверь твёрдая, открытая — нет. Ключи на руках решают, какая какая.
  const boxes = [...entities.platforms, ...entities.doors.filter((door) => !keys.has(door.keyColor))];
  return { entities, world: { map: level, boxes } };
}

function settle(level, keys, player) {
  const { entities, world: box } = world(level, keys);
  for (let step = 0; step < 200; step++) {
    entities.update(STEP);
    if (updatePlayer(player, IDLE, box, STEP) === 'fell') return null;
    if (player.onGround) return { x: player.x, y: player.y };
  }
  return null;
}

function simulate(level, keys, spot, direction, jumpAt, hold, coins = [], collected = new Set()) {
  const { entities, world: box } = world(level, keys);
  const player = createPlayer(level.spawn);
  player.x = spot.x;
  player.y = spot.y;
  player.previousX = spot.x;
  player.previousY = spot.y;

  const held = new Set(direction ? [direction] : []);
  const pressed = new Set();
  const input = {
    isDown: (action) => held.has(action),
    consumePress: (action) => pressed.delete(action),
    releaseAll: () => held.clear()
  };

  // Монеты, которых коснулись по дороге. Засчитываем их, только если маршрут
  // закончился живым приземлением: собрать монету и тут же улететь в пропасть
  // или на шип — не «собрать».
  const touched = [];

  for (let step = 0; step < RUN_STEPS; step++) {
    if (step === jumpAt) {
      held.add('jump');
      pressed.add('jump');
    }
    if (step === jumpAt + hold) held.delete('jump');

    entities.update(STEP);
    const outcome = updatePlayer(player, input, box, STEP);

    for (const coin of coins) {
      if (!collected.has(coin.id) && overlaps(player, coin.box)) touched.push(coin.id);
    }

    if (outcome === 'fell') return 'fell';

    // Шип и комета — это смерть, а не проход: такой маршрут не считается. Кометы
    // движутся внутри entities.update, так что здесь у них уже текущие позиции —
    // аудит честно ищет окно между ними, а не водит игрока сквозь опасность.
    for (const spike of entities.spikes) {
      if (overlaps(player, spike)) return null;
    }
    for (const hazard of entities.hazards) {
      if (overlaps(player, hazard)) return null;
    }

    if (player.onGround && step > jumpAt + 3) {
      for (const id of touched) collected.add(id);
      return { x: player.x, y: player.y };
    }
  }
  return null;
}

// Достижимо — значит есть площадка, с которой до тайла дотягиваешься стоя.
function canReach(spots, at) {
  const targetX = at[0] * TILE + TILE / 2;
  const targetY = at[1] * TILE + TILE / 2;
  for (const spot of spots.values()) {
    if (Math.abs(spot.x + 11 - targetX) < TILE * 1.2 && Math.abs(spot.y + 15 - targetY) < TILE * 1.6) {
      return true;
    }
  }
  return false;
}

const IDLE = { isDown: () => false, consumePress: () => false, releaseAll: () => {} };
