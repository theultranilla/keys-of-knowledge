import { el } from './dom.js';
import { t } from './i18n.js';

// Экран «Как играть» для обоих режимов. Показывается сам при первом входе в режим
// и открывается из меню. Собирает только содержимое; кнопку действия («Начать» или
// «Назад») добавляет меню — она зависит от того, откуда пришли.
//
// Значки клавиш (←, W, Shift, 🖱) — не слова, а имена кнопок, поэтому вписаны
// прямо тут, как в нижней подсказке index.html. Все настоящие фразы — через i18n.

const CONTROLS = {
  platformer: [
    [['←', '→', 'A', 'D'], 'howto.p.move'],
    [['Space', '↑', 'W'], 'howto.p.jump'],
    [['E'], 'howto.p.interact'],
    [['R'], 'howto.p.respawn'],
    [['Esc'], 'howto.common.pause']
  ],
  dungeon: [
    [['W', 'A', 'S', 'D'], 'howto.d.move'],
    [['🖱'], 'howto.d.aim'],
    [['Shift'], 'howto.d.dash'],
    [['F'], 'howto.d.nova'],
    [['Q'], 'howto.d.shield'],
    [['Tab'], 'howto.d.swap'],
    [['E'], 'howto.d.interact'],
    [['Esc'], 'howto.common.pause']
  ]
};

const TIPS = {
  platformer: ['howto.p.tip1', 'howto.p.tip2'],
  dungeon: ['howto.d.tip1', 'howto.d.tip2', 'howto.d.tip3']
};

function controlRow(keys, labelKey) {
  return el('div', { class: 'howto__row' },
    el('div', { class: 'howto__keys' }, keys.map((k) => el('span', { class: 'kbd', text: k }))),
    el('span', { class: 'howto__label', text: t(labelKey) }));
}

export function buildTutorial(mode) {
  const rows = (CONTROLS[mode] ?? []).map(([keys, label]) => controlRow(keys, label));
  const tips = (TIPS[mode] ?? []).map((key) => el('li', { class: 'howto__tip', text: t(key) }));

  return [
    el('h2', { class: 'screen__title', text: t(`howto.${mode}.name`) }),
    el('div', { class: 'howto' },
      el('div', { class: 'howto__section' },
        el('h3', { class: 'howto__cap', text: t('howto.goal') }),
        el('p', { class: 'howto__goal', text: t(`howto.${mode}.goal`) })),
      el('div', { class: 'howto__section' },
        el('h3', { class: 'howto__cap', text: t('howto.controls') }),
        el('div', { class: 'howto__controls' }, rows),
        el('p', { class: 'howto__touch', text: t('howto.touch') })),
      el('div', { class: 'howto__section' },
        el('h3', { class: 'howto__cap', text: t('howto.tips') }),
        el('ul', { class: 'howto__tips' }, tips)))
  ];
}
