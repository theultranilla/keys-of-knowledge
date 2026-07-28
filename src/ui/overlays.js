import { el, button } from './dom.js';
import { stars } from './menu.js';
import { t } from './i18n.js';

// Пауза и экран после пройденного уровня. Тот же слой поверх canvas, что и у
// меню, но отдельный: игра под ним осталась, и её видно.

export function createOverlays({ mount, on }) {
  const panel = el('div', { class: 'screen__panel screen__panel--compact' });
  const screen = el('div', { class: 'screen screen--over', hidden: true }, panel);
  mount.append(screen);

  function show(children) {
    panel.replaceChildren(...children.filter(Boolean));
    screen.hidden = false;
    panel.querySelector('button')?.focus();
  }

  function hide() {
    screen.hidden = true;
  }

  function showPause() {
    show([
      el('h2', { class: 'screen__title', text: t('pause.title') }),
      el('div', { class: 'screen__actions' },
        button('screen__button screen__button--primary', t('pause.resume'), on.resume),
        button('screen__button', t('menu.settings'), on.settings),
        button('screen__button', t('pause.toMenu'), on.toMenu))
    ]);
  }

  function showComplete(result) {
    const rows = [
      ['complete.star.done', true],
      ['complete.star.coins', result.coinsStar],
      ['complete.star.clean', result.cleanStar]
    ].map(([key, earned]) =>
      el('li', { class: `earned earned--${earned ? 'yes' : 'no'}` },
        el('span', { class: 'earned__mark', text: earned ? '★' : '☆', 'aria-hidden': 'true' }),
        el('span', { text: t(key) }))
    );

    show([
      el('h2', { class: 'screen__title', text: t('complete.title') }),
      el('div', { class: 'complete__stars' }, stars(result.stars)),
      el('ul', { class: 'earned-list' }, rows),
      el('dl', { class: 'complete__facts' },
        el('dt', { text: t('complete.coins') }),
        el('dd', { text: `${result.coins} / ${result.coinsMax}` }),
        el('dt', { text: t('complete.time') }),
        el('dd', { text: formatTime(result.timeMs) })),
      el('div', { class: 'screen__actions' },
        result.hasNext
          ? button('screen__button screen__button--primary', t('complete.next'), on.next)
          : null,
        button('screen__button', t('complete.retry'), on.retry),
        button('screen__button', t('complete.toMenu'), on.toMenu))
    ]);
  }

  return { showPause, showComplete, hide };
}

export function formatTime(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
