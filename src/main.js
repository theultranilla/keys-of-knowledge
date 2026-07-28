import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { createRenderer } from './engine/renderer.js';
import { setReducedMotionOverride } from './engine/motion.js';
import { createPop } from './game/pop.js';
import { loadLevel, loadLevelIndex } from './game/level.js';
import { createSession } from './game/session.js';
import { createState, SCENE } from './game/state.js';
import { createHud } from './ui/hud.js';
import { createTaskModal } from './ui/taskModal.js';
import { createMenu } from './ui/menu.js';
import { createOverlays } from './ui/overlays.js';
import { createTaskEngine } from './tasks/engine.js';
import { createSave } from './save.js';

// Бутстрап: собирает всё вместе и владеет переходами между сценами. Сама игра
// живёт в game/session.js, экраны — в ui/, прогресс — в save.js.

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const input = createInput();
const pop = createPop();
const hud = createHud();
const modal = createTaskModal();
const save = createSave();

setReducedMotionOverride(save.settings.reducedMotion);

const order = await loadLevelIndex();
const levels = await Promise.all(order.map((id) => loadLevel(id)));
const levelsById = new Map(levels.map((level) => [level.id, level]));

const state = createState(onSceneChange);
let session = null;
let tasks = null;
let currentLevelId = null;

const menu = createMenu({
  mount: document.body,
  save,
  levels,
  on: {
    play: () => startLevel(nextPlayableId()),
    levels: () => state.go(SCENE.LEVELS),
    settings: () => state.go(SCENE.SETTINGS),
    back: () => state.go(state.previous === SCENE.PAUSED ? SCENE.PAUSED : SCENE.MENU),
    pick: (id) => startLevel(id),
    setting: (name, value) => {
      save.setSetting(name, value);
      if (name === 'reducedMotion') setReducedMotionOverride(value);
    },
    reset: () => {
      save.reset();
      setReducedMotionOverride(save.settings.reducedMotion);
    }
  }
});

const overlays = createOverlays({
  mount: document.body,
  on: {
    resume: () => state.go(SCENE.PLAYING),
    settings: () => state.go(SCENE.SETTINGS),
    toMenu: () => state.go(SCENE.MENU),
    retry: () => startLevel(currentLevelId),
    next: () => startLevel(order[order.indexOf(currentLevelId) + 1])
  }
});

// Первый уровень, который ещё не пройден. Кнопка «Играть» ведёт именно туда,
// а не в самое начало — возвращаться в пройденное можно через выбор уровня.
function nextPlayableId() {
  const entries = save.levels(order);
  return (entries.find((entry) => entry.status === 'unlocked') ?? entries[0]).id;
}

function startLevel(id) {
  const level = levelsById.get(id);
  if (!level) return;

  currentLevelId = id;
  // Сид уровня лежит в сохранении: пока уровень не пройден, задачи в нём те же.
  tasks = createTaskEngine({ runSeed: save.seedFor(id) });
  session = createSession({
    level,
    tasks,
    modal,
    hud,
    pop,
    input,
    onComplete: (result) => finishLevel(id, result)
  });

  state.go(SCENE.PLAYING);
}

function finishLevel(id, result) {
  const { stars, ratio } = save.completeLevel(id, result, order);
  save.mergeTaskStats(tasks.stats);

  overlays.showComplete({
    ...result,
    stars,
    coinsStar: ratio >= 0.8,
    cleanStar: result.cleanTasks,
    hasNext: Boolean(order[order.indexOf(id) + 1])
  });
  state.go(SCENE.COMPLETE);
}

function onSceneChange(scene) {
  if (scene !== SCENE.COMPLETE && scene !== SCENE.PAUSED) overlays.hide();

  switch (scene) {
    case SCENE.MENU:
      menu.showMain();
      break;
    case SCENE.LEVELS:
      menu.showLevels();
      break;
    case SCENE.SETTINGS:
      menu.showSettings();
      break;
    case SCENE.PAUSED:
      menu.hide();
      overlays.showPause();
      break;
    case SCENE.PLAYING:
      menu.hide();
      // Клавиши, зажатые до паузы, не должны «доиграть» после возвращения.
      input.releaseAll();
      break;
    default:
      menu.hide();
      break;
  }
}

function update(dt) {
  if (input.consumePress('pause')) {
    if (state.is(SCENE.PLAYING)) state.go(SCENE.PAUSED);
    else if (state.is(SCENE.PAUSED)) state.go(SCENE.PLAYING);
  }

  if (state.is(SCENE.PLAYING) && session) session.update(dt);
}

const loop = createLoop({
  update,
  // Мир рисуется всегда, даже под меню: экраны полупрозрачные, и за ними видно,
  // что игра — вот она, а не где-то потом.
  render: (alpha) => session && renderer.draw(session.scene, alpha)
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

// Уровень можно открыть прямо по ссылке: ?level=02 — удобно проверять карту,
// не проходя игру заново.
const requested = new URLSearchParams(window.location.search).get('level');
if (requested && levelsById.has(requested)) {
  startLevel(requested);
} else {
  // Иначе за меню стоит первый доступный уровень — застывшая, но живая сцена.
  startLevel(nextPlayableId());
  state.go(SCENE.MENU);
}

loop.start();
