import {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  CAMERA_DEADZONE_X,
  CAMERA_DEADZONE_Y,
  CAMERA_SMOOTHING
} from './constants.js';

// Камера смотрит на игрока, но не приклеена к нему: сначала мёртвая зона
// (мелкие шаги и прыжки картинку не двигают), потом плавное подтягивание,
// и только затем — жёсткие границы уровня.

export function createCamera(map) {
  const camera = {
    x: 0,
    y: 0,
    // Как и у игрока, прошлая позиция нужна рендеру для интерполяции —
    // иначе мир дёргался бы ровно на те доли шага, которые сгладил игрок.
    previousX: 0,
    previousY: 0,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT
  };

  function update(target, dt) {
    camera.previousX = camera.x;
    camera.previousY = camera.y;

    const desiredX = focus(camera.x, target.x + target.width / 2 - VIEW_WIDTH / 2, CAMERA_DEADZONE_X);
    const desiredY = focus(camera.y, target.y + target.height / 2 - VIEW_HEIGHT / 2, CAMERA_DEADZONE_Y);

    // Экспоненциальное сглаживание вместо линейного: не зависит от величины шага,
    // поэтому камера ведёт себя одинаково при любом dt и никогда не перелетает цель.
    const weight = 1 - Math.exp(-CAMERA_SMOOTHING * dt);
    camera.x += (desiredX - camera.x) * weight;
    camera.y += (desiredY - camera.y) * weight;

    clampToLevel();
  }

  // Мгновенный перенос без сглаживания — после респауна камера должна уже быть
  // на месте, а не лететь через полуровня.
  function snapTo(target) {
    camera.x = target.x + target.width / 2 - VIEW_WIDTH / 2;
    camera.y = target.y + target.height / 2 - VIEW_HEIGHT / 2;
    clampToLevel();
    camera.previousX = camera.x;
    camera.previousY = camera.y;
  }

  function clampToLevel() {
    // Уровень уже экрана — центрируем его, иначе он прижмётся к левому краю.
    camera.x =
      map.widthPx <= VIEW_WIDTH
        ? (map.widthPx - VIEW_WIDTH) / 2
        : clamp(camera.x, 0, map.widthPx - VIEW_WIDTH);
    camera.y =
      map.heightPx <= VIEW_HEIGHT
        ? (map.heightPx - VIEW_HEIGHT) / 2
        : clamp(camera.y, 0, map.heightPx - VIEW_HEIGHT);
  }

  camera.update = update;
  camera.snapTo = snapTo;
  return camera;
}

// Пока цель внутри мёртвой зоны — оставляем камеру как есть. Вышла за край —
// тянем ровно настолько, чтобы цель снова оказалась на границе зоны.
function focus(current, target, deadzone) {
  const delta = target - current;
  if (Math.abs(delta) <= deadzone) return current;
  return target - Math.sign(delta) * deadzone;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
