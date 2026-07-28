import { el, button } from './dom.js';
import { t } from './i18n.js';

// Главное меню, выбор уровня и настройки. Все три — один и тот же слой поверх
// canvas, просто с разным содержимым: так между ними нельзя оказаться нигде.

export function createMenu({ mount, save, levels, on }) {
  const panel = el('div', { class: 'screen__panel' });
  const screen = el('div', { class: 'screen', hidden: true }, panel);
  mount.append(screen);

  function show(builder) {
    // Пустые узлы отбрасываем сами: replaceChildren, в отличие от el(), впишет
    // null в разметку буквально, текстом.
    panel.replaceChildren(...builder().filter(Boolean));
    screen.hidden = false;
    // Фокус на первую кнопку — экран должен быть проходим с клавиатуры без мыши.
    panel.querySelector('button')?.focus();
  }

  function hide() {
    screen.hidden = true;
  }

  function warning() {
    if (save.available) return null;
    return el('p', { class: 'screen__warning', text: t('menu.noSave') });
  }

  function mainScreen() {
    return [
      el('h1', { class: 'screen__title', text: t('menu.title') }),
      el('p', { class: 'screen__subtitle', text: t('menu.subtitle') }),
      el(
        'div',
        { class: 'screen__actions' },
        button('screen__button screen__button--primary', t('menu.play'), on.play),
        button('screen__button', t('menu.levels'), () => on.levels()),
        button('screen__button', t('menu.settings'), () => on.settings())
      ),
      warning()
    ];
  }

  function levelsScreen() {
    const cards = save.levels(levels.map((level) => level.id)).map((entry) => {
      const level = levels.find((item) => item.id === entry.id);
      const locked = entry.status === 'locked';

      return el(
        'button',
        {
          class: `level level--${entry.status}`,
          type: 'button',
          disabled: locked ? 'disabled' : null,
          onClick: () => !locked && on.pick(entry.id)
        },
        el('span', { class: 'level__id', text: entry.id }),
        el('span', { class: 'level__title', text: locked ? t('levels.locked') : level.title }),
        el('span', { class: 'level__stars', 'aria-label': t('levels.stars', { stars: entry.stars ?? 0 }) },
          stars(entry.stars ?? 0)),
        entry.status === 'completed'
          ? el('span', { class: 'level__meta', text: t('levels.coins', { coins: entry.coins, max: entry.coinsMax }) })
          : null
      );
    });

    return [
      el('h2', { class: 'screen__title', text: t('levels.title') }),
      el('div', { class: 'levels' }, cards),
      button('screen__button', t('menu.back'), () => on.back())
    ];
  }

  function settingsScreen() {
    const rows = ['sound', 'music', 'reducedMotion'].map((name) =>
      toggle(name, save.settings[name], (value) => on.setting(name, value))
    );

    return [
      el('h2', { class: 'screen__title', text: t('settings.title') }),
      el('div', { class: 'settings' }, rows),
      el('div', { class: 'screen__actions screen__actions--row' },
        button('screen__button screen__button--danger', t('settings.reset'), askReset),
        button('screen__button', t('menu.back'), () => on.back())),
      warning()
    ];
  }

  // Сброс прогресса — через подтверждение прямо на экране, а не через
  // системный confirm(): его нельзя оформить и он теряется на телефоне.
  function askReset() {
    const confirmation = el(
      'div',
      { class: 'confirm' },
      el('p', { class: 'confirm__text', text: t('settings.resetConfirm') }),
      el('div', { class: 'screen__actions screen__actions--row' },
        button('screen__button screen__button--danger', t('settings.resetYes'), () => {
          on.reset();
          show(settingsScreen);
        }),
        button('screen__button', t('settings.resetNo'), () => show(settingsScreen)))
    );

    panel.replaceChildren(
      el('h2', { class: 'screen__title', text: t('settings.title') }),
      confirmation
    );
    panel.querySelector('button')?.focus();
  }

  function toggle(name, checked, onChange) {
    const input = el('input', { type: 'checkbox', class: 'switch__input', id: `set-${name}` });
    input.checked = Boolean(checked);
    input.addEventListener('change', () => onChange(input.checked));

    return el('label', { class: 'switch', for: `set-${name}` },
      input,
      el('span', { class: 'switch__box', 'aria-hidden': 'true' }),
      el('span', { class: 'switch__label', text: t(`settings.${name}`) }));
  }

  return {
    showMain: () => show(mainScreen),
    showLevels: () => show(levelsScreen),
    showSettings: () => show(settingsScreen),
    hide
  };
}

// Звёзды текстом, а не картинкой: одинаково читается в любом языке и не тянет
// за собой ассет.
export function stars(count) {
  return el('span', { text: '★'.repeat(count) + '☆'.repeat(Math.max(0, 3 - count)) });
}
