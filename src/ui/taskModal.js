import { t } from './i18n.js';
import { createFigure } from './figures.js';
import { MAX_ATTEMPTS } from '../tasks/engine.js';
import { prefersReducedMotion } from '../engine/motion.js';

// Карточка с задачей. Обычный DOM поверх canvas, а не рисование в самом canvas:
// нативный <dialog> бесплатно даёт ловушку фокуса, фон становится inert, а поле
// ввода работает с экранной клавиатурой и со скринридером как настоящее поле.

const CORRECT_CLOSE_DELAY = 1200;

export function createTaskModal() {
  const dialog = document.createElement('dialog');
  dialog.className = 'task';
  dialog.innerHTML = `
    <div class="task__card">
      <h2 class="task__title"></h2>
      <p class="task__prompt"></p>
      <div class="task__figure"></div>
      <div class="task__field">
        <label class="task__label" for="task-answer"></label>
        <input class="task__input" id="task-answer" type="text" inputmode="decimal"
               autocomplete="off" autocorrect="off" spellcheck="false" />
        <span class="task__unit"></span>
      </div>
      <p class="task__attempts"></p>
      <p class="task__message" role="status" aria-live="polite"></p>
      <div class="task__note task__note--hint" hidden></div>
      <div class="task__note task__note--solution" hidden></div>
      <div class="task__actions">
        <button class="task__button task__button--check" type="button"></button>
        <button class="task__button task__button--back" type="button"></button>
      </div>
    </div>
  `;
  document.body.append(dialog);

  const parts = {
    title: dialog.querySelector('.task__title'),
    prompt: dialog.querySelector('.task__prompt'),
    figure: dialog.querySelector('.task__figure'),
    label: dialog.querySelector('.task__label'),
    input: dialog.querySelector('.task__input'),
    unit: dialog.querySelector('.task__unit'),
    attempts: dialog.querySelector('.task__attempts'),
    message: dialog.querySelector('.task__message'),
    hint: dialog.querySelector('.task__note--hint'),
    solution: dialog.querySelector('.task__note--solution'),
    check: dialog.querySelector('.task__button--check'),
    back: dialog.querySelector('.task__button--back')
  };

  let session = null;

  function open(task, engine) {
    return new Promise((resolve) => {
      session = { task, engine, resolve, closing: false };

      parts.title.textContent = t(`task.title.${task.subject}`);
      parts.prompt.textContent = task.prompt;
      parts.label.textContent = t('task.answer.label');
      parts.check.textContent = t('task.check');
      parts.back.textContent = t('task.back');
      parts.unit.textContent = task.unit ?? '';
      parts.unit.hidden = !task.unit;
      parts.input.value = '';
      parts.message.textContent = '';
      parts.message.className = 'task__message';
      parts.hint.hidden = true;
      parts.solution.hidden = true;
      parts.check.hidden = false;
      parts.back.hidden = false;

      parts.figure.replaceChildren();
      const figure = createFigure(task.figure);
      if (figure) parts.figure.append(figure);
      parts.figure.hidden = !figure;

      updateAttempts();
      dialog.showModal();
      parts.input.focus();
    });
  }

  function updateAttempts() {
    parts.attempts.textContent = t('task.attempts', {
      current: Math.min(session.task.attempts + 1, MAX_ATTEMPTS),
      total: MAX_ATTEMPTS
    });
  }

  function check() {
    if (!session || session.closing) return;

    const result = session.engine.submit(session.task, parts.input.value);

    switch (result.status) {
      case 'correct':
        say(t('task.correct'), 'ok');
        finish({ solved: true, usedSolution: false }, CORRECT_CLOSE_DELAY);
        break;

      case 'wrong':
        // «Это число не подходит», а не «Ошибка!». Ошибка — часть работы,
        // пугать ею ребёнка незачем.
        say(t('task.wrong'), 'warn');
        showNote(parts.hint, t('task.hint'), session.task.hint);
        shake();
        updateAttempts();
        parts.input.select();
        break;

      case 'exhausted':
        say(t('task.exhausted'), 'ok');
        showNote(parts.solution, t('task.solution'), session.task.solution);
        parts.attempts.textContent = '';
        parts.check.hidden = true;
        parts.back.textContent = t('task.close');
        // Ключ выдаётся всё равно — задача помечена как решённая с разбором.
        session.outcome = { solved: true, usedSolution: true };
        parts.back.focus();
        break;

      default:
        // Пустое поле или не число: попытка не потрачена, просто говорим, что не так.
        say(t(`task.${result.status}`), 'warn');
        parts.input.focus();
        break;
    }
  }

  function back() {
    if (!session || session.closing) return;
    finish(session.outcome ?? { solved: false, usedSolution: false }, 0);
  }

  function finish(outcome, delay) {
    session.closing = true;
    const { resolve } = session;
    const close = () => {
      dialog.close();
      session = null;
      resolve(outcome);
    };
    if (delay > 0) setTimeout(close, delay);
    else close();
  }

  function say(text, tone) {
    parts.message.textContent = text;
    parts.message.className = `task__message task__message--${tone}`;
  }

  function showNote(node, caption, body) {
    node.replaceChildren();
    const title = document.createElement('b');
    title.textContent = caption;
    const text = document.createElement('span');
    text.textContent = body;
    node.append(title, text);
    node.hidden = false;
  }

  function shake() {
    if (prefersReducedMotion()) return;
    parts.input.classList.remove('task__input--shake');
    // Перезапуск анимации: без чтения offsetWidth браузер не заметит, что класс
    // сняли и вернули в одном кадре, и второй раз тряски не будет.
    void parts.input.offsetWidth;
    parts.input.classList.add('task__input--shake');
  }

  parts.check.addEventListener('click', check);
  parts.back.addEventListener('click', back);
  parts.input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    check();
  });
  // Esc закрывает диалог по-нативному — считаем это как «Вернуться».
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    back();
  });

  return {
    open,
    get isOpen() {
      return dialog.open;
    }
  };
}
