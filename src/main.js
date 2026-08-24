import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { createRenderer } from './engine/renderer.js';
import { setReducedMotionOverride } from './engine/motion.js';
import { createAudio } from './engine/audio.js';
import { createPop } from './game/pop.js';
import { loadLevel, loadLevelIndex, parseLevel } from './game/level.js';
import { createSession } from './game/session.js';
import { createDungeonSession } from './game/dungeonSession.js';
import { createState, SCENE } from './game/state.js';
import { createHud } from './ui/hud.js';
import { createTaskModal } from './ui/taskModal.js';
import { createMenu } from './ui/menu.js';
import { createOverlays } from './ui/overlays.js';
import { createTouchControls } from './ui/touch.js';
import { createTaskEngine } from './tasks/engine.js';
import { createSave } from './save.js';

// Бутстрап: собирает всё вместе и владеет переходами между сценами. Сама игра
// живёт в game/session.js, экраны — в ui/, прогресс — в save.js.

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const input = createInput();
const pop = createPop();
const hud = createHud();
const save = createSave();
const audio = createAudio(save.settings);
const modal = createTaskModal({ audio });

setReducedMotionOverride(save.settings.reducedMotion);

// Браузер не даст завести звук до действия пользователя. Ловим первое любое —
// нажатие клавиши, щелчок или касание — и заводим контекст тогда.
for (const event of ['pointerdown', 'keydown', 'touchstart']) {
  window.addEventListener(event, () => audio.unlock(), { passive: true });
}

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
    dungeon: () => startDungeon(),
    levels: () => state.go(SCENE.LEVELS),
    wardrobe: () => state.go(SCENE.WARDROBE),
    settings: () => state.go(SCENE.SETTINGS),
    back: () => state.go(state.previous === SCENE.PAUSED ? SCENE.PAUSED : SCENE.MENU),
    pick: (id) => startLevel(id),
    // Надел вещь в гардеробе — сразу перекрашиваем героя в застывшей сцене за меню.
    skinChanged: (equipped) => session?.setSkin(equipped),
    setting: (name, value) => {
      save.setSetting(name, value);
      if (name === 'reducedMotion') setReducedMotionOverride(value);
      else audio.setSetting(name, value);
    },
    reset: () => {
      save.reset();
      setReducedMotionOverride(save.settings.reducedMotion);
      audio.setSetting('sound', save.settings.sound);
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

const touch = createTouchControls({
  mount: document.body,
  input,
  onPause: () => state.go(SCENE.PAUSED)
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

  session?.destroy?.(); // прошлый режим мог навесить слушатели (данж) — снимаем
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
    audio,
    skin: save.equipped,
    onComplete: (result) => finishLevel(id, result)
  });

  state.go(SCENE.PLAYING);
}

// Запуск режима «Данж» (рогалик). Общий слой берём тот же, что у платформера.
function startDungeon() {
  session?.destroy?.();
  currentLevelId = null;
  session = createDungeonSession({ input, audio, save, canvas });
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
  touch.setPlaying(scene === SCENE.PLAYING);

  switch (scene) {
    case SCENE.MENU:
      menu.showMain();
      break;
    case SCENE.LEVELS:
      menu.showLevels();
      break;
    case SCENE.WARDROBE:
      menu.showWardrobe();
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
  // что игра — вот она, а не где-то потом. Данж рисует свою сцену сам (session.render),
  // платформер — через профильный renderer.draw.
  render: (alpha) => {
    if (!session) return;
    if (session.render) session.render(renderer.ctx, alpha);
    else renderer.draw(session.scene, alpha);
  }
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
// не проходя игру заново. А ?test=1 запускает уровень, который редактор карт
// положил в localStorage: кнопка «Тест» открывает игру именно так.
const params = new URLSearchParams(window.location.search);
const requested = params.get('level');

if (params.has('test')) {
  try {
    const level = parseLevel(JSON.parse(localStorage.getItem('keysofknowledge.testlevel')));
    levelsById.set(level.id, level);
    startLevel(level.id);
  } catch (error) {
    console.error('Тест-уровень не загрузился:', error);
    startLevel(nextPlayableId());
    state.go(SCENE.MENU);
  }
  // Из сыгранной карты можно вернуться в редактор и поправить.
  const back = document.createElement('button');
  back.className = 'editor-back';
  back.type = 'button';
  back.textContent = '← В редактор';
  back.addEventListener('click', () => { window.location.href = 'scripts/level-editor.html'; });
  document.body.append(back);
} else if (requested && levelsById.has(requested)) {
  startLevel(requested);
} else {
  // Иначе за меню стоит первый доступный уровень — застывшая, но живая сцена.
  startLevel(nextPlayableId());
  state.go(SCENE.MENU);
}

loop.start();
