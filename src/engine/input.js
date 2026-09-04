// Ввод: физические клавиши переводятся в игровые действия, всё остальное
// про них знать не должно. Экранные кнопки для тача придут на Этап 7 и просто
// добавят ещё один источник тех же действий.

// event.code, а не event.key: код привязан к позиции клавиши, поэтому WASD
// работает и на русской раскладке, где key вернёт «ц» вместо «w».
// Одна клавиша может давать несколько действий: W — это и «jump» (платформер),
// и «up» (данж). Режим сам читает нужные.
const BINDINGS = {
  ArrowLeft: ['left'],
  KeyA: ['left'],
  ArrowRight: ['right'],
  KeyD: ['right'],
  ArrowUp: ['up', 'jump'],
  KeyW: ['up', 'jump'],
  ArrowDown: ['down'],
  KeyS: ['down'],
  Space: ['jump'],
  KeyE: ['interact'],
  KeyF: ['nova'],       // способность слота (данж)
  KeyQ: ['shield'],     // щит-неуязвимость (данж)
  Tab: ['swap'],        // сменить оружие (данж)
  ShiftLeft: ['dash'],  // рывок (данж)
  // Аварийный выход: игрок сам возвращает себя на чекпоинт. Нужен на случай,
  // когда геометрия уровня загнала его в угол, откуда не выпрыгнуть.
  KeyR: ['respawn'],
  Escape: ['pause']
};

// Пока фокус в поле ввода или внутри карточки с задачей, клавиши принадлежат ей,
// а не игроку: иначе ответ «3» заодно был бы командой игре, а буква R посреди
// набора отправляла бы персонажа на чекпоинт.
function isTyping(target) {
  return target instanceof HTMLElement && target.closest('input, textarea, select, dialog') !== null;
}

export function createInput(target = window) {
  const held = new Set();
  const pressed = new Set();

  function onKeyDown(event) {
    if (isTyping(event.target)) return;
    const actions = BINDINGS[event.code];
    if (!actions) return;
    // Иначе Space, стрелки и Tab прокрутят/переведут фокус на странице под игрой.
    event.preventDefault();
    if (event.repeat) return;
    for (const action of actions) { held.add(action); pressed.add(action); }
  }

  function onKeyUp(event) {
    if (isTyping(event.target)) return;
    const actions = BINDINGS[event.code];
    if (!actions) return;
    event.preventDefault();
    for (const action of actions) held.delete(action);
  }

  function releaseAll() {
    held.clear();
    pressed.clear();
  }

  target.addEventListener('keydown', onKeyDown, { passive: false });
  target.addEventListener('keyup', onKeyUp, { passive: false });
  // Alt+Tab в прыжке не должен оставлять клавишу зажатой навсегда.
  target.addEventListener('blur', releaseAll);

  return {
    isDown(action) {
      return held.has(action);
    },

    // Нажатие живёт до тех пор, пока его кто-нибудь не заберёт. Клавиша, нажатая
    // и отпущенная в промежутке между шагами симуляции, всё равно сработает.
    consumePress(action) {
      if (!pressed.has(action)) return false;
      pressed.delete(action);
      return true;
    },

    // Тот же вход, но снаружи: экранные кнопки нажимают действия напрямую,
    // не притворяясь клавиатурой.
    setAction(action, down) {
      if (down) {
        held.add(action);
        pressed.add(action);
      } else {
        held.delete(action);
      }
    },

    releaseAll,

    destroy() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', releaseAll);
      releaseAll();
    }
  };
}
