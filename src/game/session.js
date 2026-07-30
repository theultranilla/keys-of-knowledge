import { createCamera } from '../engine/camera.js';
import { prefersReducedMotion } from '../engine/motion.js';
import { TILE, SPRING_PULSE_TIME } from '../engine/constants.js';
import { createPlayer, updatePlayer, startPop, respawn } from './player.js';
import { createEntities } from './entities.js';

// Один забег по одному уровню: игрок, сущности, камера, счётчики. Всё, что
// живёт от «начали уровень» до «прошли или начали заново».
//
// Сцены, меню и сохранение сюда не заглядывают: забег сообщает наверх одним
// вызовом onComplete, когда дверь открыта.

export function createSession({ level, tasks, modal, hud, pop, input, audio, onComplete }) {
  const run = { coins: 0, lives: level.lives, keys: new Set(), elapsedMs: 0 };
  // Ключ на руках означает, что задача уже решена: перезапуск уровня не должен
  // возвращать её обратно.
  const solvedChests = new Set();
  let usedSolution = false;

  let entities = null;
  let player = null;
  let camera = null;
  let world = null;
  let restartAfterPop = false;
  let finished = false;
  // Пока открыта карточка с задачей, мир стоит целиком.
  let busy = false;

  // Пружины, сработавшие только что: тайл «колонка:строка» → остаток времени
  // анимации. Рендер по нему рисует сжатие-отскок пада.
  const springPulses = new Map();

  const scene = { map: level, player: null, camera: null, entities: null, pop, hud, hudState: run, time: 0, springPulses };

  function build() {
    entities = createEntities(level);
    for (const chest of entities.chests) {
      if (solvedChests.has(chestKey(chest))) chest.opened = true;
    }

    player = createPlayer(level.spawn);
    camera = createCamera(level);
    camera.snapTo(player);
    world = { map: level, boxes: entities.solidBoxes };

    run.coins = 0;
    run.lives = level.lives;
    restartAfterPop = false;
    finished = false;
    springPulses.clear();

    scene.entities = entities;
    scene.player = player;
    scene.camera = camera;
  }

  function chestKey(chest) {
    return `${chest.column}:${chest.line}`;
  }

  // Гасим анимации пружин: отыгравшую убираем из карты, чтобы она не копилась.
  function decaySpringPulses(dt) {
    for (const [tile, remaining] of springPulses) {
      const next = remaining - dt;
      if (next <= 0) springPulses.delete(tile);
      else springPulses.set(tile, next);
    }
  }

  // Игрок сам возвращает себя на чекпоинт. Жизни не стоит: это страховка от
  // геометрии, из которой не выпрыгнуть, а не игровая ошибка.
  function selfDestruct() {
    if (player.popTimer > 0) return;

    if (prefersReducedMotion()) {
      respawn(player);
      camera.snapTo(player);
      return;
    }
    pop.burst(player.x + player.width / 2, player.y + player.height / 2);
    startPop(player);
  }

  // Возвращает true, если жизни кончились и уровень пора начинать заново.
  function loseLife() {
    run.lives = Math.max(0, run.lives - 1);
    return run.lives === 0;
  }

  async function openChest() {
    const chest = entities.chestInReach(player);
    if (!chest || busy) return;

    // Сид привязан к месту сундука и к сиду уровня: вышел из карточки и
    // вернулся — задача та же, а не свежая с другими числами.
    const task = tasks.createTask(
      { subject: chest.subject, grade: chest.grade, difficulty: chest.difficulty },
      `${level.id}:${chestKey(chest)}`
    );

    busy = true;
    input.releaseAll();
    const outcome = await modal.open(task, tasks);
    busy = false;

    // Не решил и вышел — сундук остаётся закрытым, к нему можно вернуться.
    if (!outcome.solved) return;

    if (outcome.usedSolution) usedSolution = true;
    chest.opened = true;
    solvedChests.add(chestKey(chest));
    run.keys.add(chest.keyColor);
    hud.gainKey(chest.keyColor);
    audio.play('key');
  }

  function handleEvent(event) {
    switch (event.type) {
      case 'coin':
        run.coins += 1;
        audio.play('coin');
        break;

      case 'checkpoint':
        player.respawnX = event.checkpoint.column * TILE + (TILE - player.width) / 2;
        player.respawnY = event.checkpoint.line * TILE + TILE - player.height;
        audio.play('checkpoint');
        break;

      case 'spike':
        if (player.popTimer > 0) break;
        pop.burst(player.x + player.width / 2, player.y + player.height / 2);
        startPop(player);
        audio.play('hurt');
        restartAfterPop = loseLife();
        break;

      case 'door-opened':
        audio.play('door');
        // Обычная дверь просто перестаёт мешать. Уровень заканчивает только та,
        // что помечена в JSON как выход.
        if (event.door.exit) complete();
        break;

      default:
        break;
    }
  }

  function complete() {
    if (finished) return;
    finished = true;
    audio.play('complete');

    const coinsMax = entities.coins.length;
    // Третья звезда: все сундуки уровня открыты и ни один не потребовал разбора.
    const cleanTasks = entities.chests.every((chest) => chest.opened) && !usedSolution;

    onComplete({ coins: run.coins, coinsMax, timeMs: run.elapsedMs, cleanTasks });
  }

  function update(dt) {
    if (busy || finished) return;

    run.elapsedMs += dt * 1000;
    scene.time += dt;
    hud.update(dt);
    pop.update(dt);

    if (input.consumePress('respawn')) selfDestruct();
    entities.update(dt);

    const outcome = updatePlayer(player, input, world, dt);
    if (player.jumpedNow) audio.play('jump');
    if (player.sprungNow) {
      audio.play('spring');
      const column = Math.floor((player.x + player.width / 2) / TILE);
      const line = Math.round((player.y + player.height) / TILE);
      springPulses.set(`${column}:${line}`, SPRING_PULSE_TIME);
    }
    decaySpringPulses(dt);

    if (outcome === 'fell') {
      if (loseLife()) build();
      else camera.snapTo(player);
      return;
    }

    if (outcome === 'popped') {
      if (restartAfterPop) build();
      else camera.snapTo(player);
      return;
    }

    if (player.popTimer > 0) {
      camera.update(player, dt);
      return;
    }

    if (input.consumePress('interact')) openChest();
    for (const event of entities.collide(player, run.keys)) handleEvent(event);

    camera.update(player, dt);
  }

  build();

  return {
    scene,
    update,
    restart() {
      run.keys.clear();
      solvedChests.clear();
      usedSolution = false;
      run.elapsedMs = 0;
      build();
    },
    get busy() {
      return busy;
    }
  };
}
