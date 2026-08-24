// Конечный автомат сцен. Держит одну переменную — какая сцена сейчас — и
// сообщает о переходах. Правила «что при этом обновляется» живут в main.js,
// здесь только сам переход, чтобы состояние нельзя было потерять в двух местах.

export const SCENE = {
  MENU: 'menu',
  LEVELS: 'levels',
  SETTINGS: 'settings',
  WARDROBE: 'wardrobe',
  PLAYING: 'playing',
  PAUSED: 'paused',
  // Открыта карточка с задачей: мир стоит, но это не пауза — выйти из неё
  // можно только через саму карточку.
  TASK: 'task',
  COMPLETE: 'complete',
  // Игрок погиб в данже: забег окончен, мир под оверлеем замер.
  DEFEAT: 'defeat'
};

export function createState(onChange) {
  let current = SCENE.MENU;
  let previous = null;

  return {
    get current() {
      return current;
    },

    get previous() {
      return previous;
    },

    is(...scenes) {
      return scenes.includes(current);
    },

    go(scene) {
      if (scene === current) return;
      previous = current;
      current = scene;
      onChange?.(current, previous);
    }
  };
}
