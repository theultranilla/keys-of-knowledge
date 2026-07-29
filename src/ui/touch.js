import { el } from './dom.js';
import { t } from './i18n.js';

// Экранное управление для телефона. Кнопки появляются только после первого
// касания: на десктопе они не нужны и только мешали бы смотреть на игру.
//
// Кнопка паузы — исключение, она видна всегда: на телефоне Esc нажать нечем.

export function createTouchControls({ mount, input, onPause }) {
  let touched = false;
  let playing = false;

  const pad = el('div', { class: 'touch', hidden: true },
    el('div', { class: 'touch__cluster touch__cluster--left' },
      key('left', '←', 'touch.left'),
      key('right', '→', 'touch.right')),
    el('div', { class: 'touch__cluster touch__cluster--right' },
      key('interact', 'E', 'touch.interact'),
      key('jump', '▲', 'touch.jump')));

  const pause = el('button', {
    class: 'touch__pause',
    type: 'button',
    hidden: true,
    'aria-label': t('touch.pause'),
    onClick: onPause
  }, el('span', { 'aria-hidden': 'true', text: '⏸' }));

  mount.append(pad, pause);

  // Кнопка держит действие, пока палец на ней. Отпустили, увели палец, пришёл
  // системный жест — во всех случаях отжимаем, иначе игрок побежит навсегда.
  function key(action, glyph, labelKey) {
    const node = el('button', {
      class: `touch__key touch__key--${action}`,
      type: 'button',
      'aria-label': t(labelKey)
    }, el('span', { 'aria-hidden': 'true', text: glyph }));

    const down = (event) => {
      event.preventDefault();
      node.setPointerCapture?.(event.pointerId);
      input.setAction(action, true);
      node.classList.add('touch__key--down');
    };
    const up = () => {
      input.setAction(action, false);
      node.classList.remove('touch__key--down');
    };

    node.addEventListener('pointerdown', down);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('lostpointercapture', up);
    // Контекстное меню по долгому нажатию прерывает игру на ровном месте.
    node.addEventListener('contextmenu', (event) => event.preventDefault());

    return node;
  }

  window.addEventListener(
    'touchstart',
    () => {
      touched = true;
      pad.hidden = !playing;
    },
    { once: true, passive: true }
  );

  return {
    // Показываем только во время игры: поверх меню кнопки только мешают.
    setPlaying(value) {
      playing = value;
      pad.hidden = !(value && touched);
      pause.hidden = !value;
      if (!value) {
        for (const action of ['left', 'right', 'jump', 'interact']) input.setAction(action, false);
      }
    }
  };
}
