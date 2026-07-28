import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { createRenderer } from './engine/renderer.js';
import { createCamera } from './engine/camera.js';
import { prefersReducedMotion } from './engine/motion.js';
import { TILE } from './engine/constants.js';
import { createPlayer, updatePlayer, startPop, respawn } from './game/player.js';
import { createEntities } from './game/entities.js';
import { createPop } from './game/pop.js';
import { loadLevel } from './game/level.js';
import { createHud } from './ui/hud.js';
import { createTaskEngine } from './tasks/engine.js';
import { createTaskModal } from './ui/taskModal.js';

// Бутстрап Этапа 3: уровень грузится из JSON, сущности живут своей жизнью,
// счётчики висят на HUD. Конечный автомат сцен (меню → уровень → пауза)
// появится в game/state.js на Этапе 5, пока сцена ровно одна.

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const input = createInput();
const pop = createPop();
const hud = createHud();
const modal = createTaskModal();
// Сид забега: пока живёт только в памяти, поэтому перезагрузка страницы даёт
// новые числа в задачах. Класть его в сохранение будет Этап 5.
const tasks = createTaskEngine();

// Пока открыта карточка с задачей, мир замирает целиком.
let paused = false;

// Ключи и открытые сундуки переживают и смерть, и перезапуск уровня. Это
// инвариант: наказывать за платформинг потерей учебного прогресса нельзя.
const run = { coins: 0, lives: 3, keys: new Set(), finished: false };

const scene = { map: null, player: null, camera: null, entities: null, pop, hud, hudState: run, time: 0 };
let level = null;
let world = null;
let restartAfterPop = false;

function startLevel() {
  const entities = createEntities(level);
  // Ключ на руках означает, что сундук уже открыт: перезапуск уровня не должен
  // возвращать задачу, которую ребёнок уже прошёл.
  for (const chest of entities.chests) {
    if (run.keys.has(chest.keyColor)) chest.opened = true;
  }

  const player = createPlayer(level.spawn);
  const camera = createCamera(level);
  camera.snapTo(player);

  world = { map: level, boxes: entities.solidBoxes };
  run.coins = 0;
  run.lives = level.lives;
  run.finished = false;
  restartAfterPop = false;

  scene.map = level;
  scene.entities = entities;
  scene.player = player;
  scene.camera = camera;
}

// Игрок сам возвращает себя на чекпоинт. Страховка от геометрии, из которой
// не выпрыгнуть. Жизни не стоит: это обход бага, а не игровая ошибка.
function selfDestruct() {
  const { player, camera } = scene;
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
  const chest = scene.entities.chestInReach(scene.player);
  if (!chest || paused) return;

  // Сид привязан к месту сундука: вышел из карточки и вернулся — задача та же,
  // а не свежая с другими числами.
  const task = tasks.createTask(
    { subject: chest.subject, grade: chest.grade, difficulty: chest.difficulty },
    `${level.id}:${chest.column}:${chest.line}`
  );

  paused = true;
  input.releaseAll();
  const outcome = await modal.open(task, tasks);
  paused = false;

  // Не решил и вышел — сундук остаётся закрытым, к нему можно вернуться.
  if (!outcome.solved) return;

  chest.opened = true;
  run.keys.add(chest.keyColor);
  hud.gainKey(chest.keyColor);
}

function handleEvent(event) {
  const { player, camera } = scene;

  switch (event.type) {
    case 'coin':
      run.coins += 1;
      break;

    case 'checkpoint':
      // Точка возврата — тайл с флажком: игрок появится на той же земле,
      // на которой этот флажок и стоит.
      player.respawnX = event.checkpoint.column * TILE + (TILE - player.width) / 2;
      player.respawnY = event.checkpoint.line * TILE + TILE - player.height;
      break;

    case 'spike':
      if (player.popTimer > 0) break;
      pop.burst(player.x + player.width / 2, player.y + player.height / 2);
      startPop(player);
      restartAfterPop = loseLife();
      break;

    case 'door-opened':
      run.finished = true;
      break;

    case 'door-locked':
      // Пока просто нельзя пройти. Подсказка «нужен ключ» — Этап 7.
      break;

    default:
      break;
  }
}

function update(dt) {
  // Карточка задачи открыта — мир стоит целиком, включая анимации.
  if (paused) return;

  scene.time += dt;
  hud.update(dt);
  pop.update(dt);

  // Уровень пройден: мир замирает, R начинает его заново. Экран победы и
  // переход на следующий уровень — Этап 5.
  if (run.finished) {
    if (input.consumePress('respawn')) startLevel();
    return;
  }

  if (input.consumePress('respawn')) selfDestruct();

  scene.entities.update(dt);
  const outcome = updatePlayer(scene.player, input, world, dt);

  if (outcome === 'fell') {
    if (loseLife()) startLevel();
    else scene.camera.snapTo(scene.player);
    return;
  }

  if (outcome === 'popped') {
    if (restartAfterPop) startLevel();
    else scene.camera.snapTo(scene.player);
    return;
  }

  if (scene.player.popTimer > 0) {
    scene.camera.update(scene.player, dt);
    return;
  }

  if (input.consumePress('interact')) openChest();
  for (const event of scene.entities.collide(scene.player, run.keys)) handleEvent(event);

  scene.camera.update(scene.player, dt);
}

const loop = createLoop({
  update,
  render: (alpha) => renderer.draw(scene, alpha)
});

// ResizeObserver, а не window.resize: он ловит любую смену размеров canvas —
// поворот телефона, изменение окна и, главное, момент, когда скрытый canvas
// наконец показали. По window.resize такое событие не приходит, и буфер остался
// бы нулевым навсегда.
new ResizeObserver(renderer.resize).observe(canvas);
// А это уже про перетаскивание окна на монитор с другим devicePixelRatio:
// CSS-размеры не меняются, ResizeObserver молчит, а плотность пикселей другая.
window.addEventListener('resize', renderer.resize);

// Вкладку свернули с зажатой клавишей — keyup не придёт, и игрок вернётся
// бегущим в стену. Гасим всё нажатое.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) input.releaseAll();
});

renderer.resize();

// Уровень выбирается через ?level=02 — удобно проверять карту, не трогая код.
const levelId = new URLSearchParams(window.location.search).get('level') ?? '01';
level = await loadLevel(levelId);
startLevel();
loop.start();
