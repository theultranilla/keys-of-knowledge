import { STEP, MAX_FRAME_TIME } from './constants.js';

// Игровой цикл с фиксированным шагом.
//
// Симуляция всегда идёт кусками ровно по STEP секунд, сколько бы времени ни прошло
// между кадрами. Это значит, что физика ведёт себя одинаково на 60, 120 и 144 Гц —
// на быстром мониторе игрок не начнёт прыгать выше. Остаток времени, не покрытый
// целым шагом, отдаётся в render как alpha ∈ [0, 1): рендер дорисовывает движение
// между двумя состояниями симуляции, иначе на 144 Гц была бы заметна ступенчатость.

export function createLoop({ update, render }) {
  let frameId = null;
  let previousTime = 0;
  let accumulator = 0;

  function frame(now) {
    frameId = requestAnimationFrame(frame);

    const elapsed = (now - previousTime) / 1000;
    previousTime = now;
    accumulator += Math.min(elapsed, MAX_FRAME_TIME);

    while (accumulator >= STEP) {
      update(STEP);
      accumulator -= STEP;
    }

    render(accumulator / STEP);
  }

  return {
    start() {
      if (frameId !== null) return;
      previousTime = performance.now();
      accumulator = 0;
      frameId = requestAnimationFrame(frame);
    },

    stop() {
      if (frameId === null) return;
      cancelAnimationFrame(frameId);
      frameId = null;
    },

    get running() {
      return frameId !== null;
    }
  };
}
