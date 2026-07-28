import { createRng, hashSeed } from './rng.js';
import { algebraTasks } from './algebra.js';
import { geometryTasks } from './geometry.js';
import { physicsTasks } from './physics.js';

// Движок задач: выбирает генератор под запрос уровня, разворачивает его в
// конкретную задачу с конкретными числами и судит ответы.
//
// Про интерфейс он ничего не знает — ни про DOM, ни про canvas. Поэтому его
// целиком можно прогнать скриптом, что и делает scripts/verify-tasks.mjs.

export const ALL_GENERATORS = [...algebraTasks, ...geometryTasks, ...physicsTasks];

export const MAX_ATTEMPTS = 3;

// Ответ вида «3,5» и «3.5» — это один и тот же ответ. Ребёнок пишет запятую,
// потому что его так учили, и спотыкаться об это он не должен.
export function parseAnswer(raw) {
  const text = String(raw ?? '').trim().replace(',', '.').replace(/\s+/g, '');
  if (text === '') return { ok: false, reason: 'empty' };
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) return { ok: false, reason: 'not-a-number' };
  return { ok: true, value: Number(text) };
}

export function createTaskEngine({ generators = ALL_GENERATORS, runSeed = Date.now() } = {}) {
  // Статистика по каждому генератору — ровно в той форме, в которой её ждёт
  // сохранение (см. раздел 6 ТЗ). Писать в localStorage будет Этап 5.
  const stats = new Map();
  const attempts = [];

  function selectGenerator(spec, rng) {
    // Сужаем по очереди и на каждом шаге откатываемся, если не осталось ничего:
    // уровень не должен падать из-за того, что для «геометрии 5 класса
    // сложности 3» пока не написан ни один генератор.
    const bySubject = generators.filter((task) => !spec.subject || task.subject === spec.subject);
    const pool = bySubject.length > 0 ? bySubject : generators;

    const byGrade = pool.filter((task) => !spec.grade || task.grade.includes(spec.grade));
    const graded = byGrade.length > 0 ? byGrade : pool;

    const byDifficulty = graded.filter((task) => !spec.difficulty || task.difficulty === spec.difficulty);
    return rng.pick(byDifficulty.length > 0 ? byDifficulty : graded);
  }

  // `key` различает сундуки между собой: у двух сундуков одного уровня должны
  // быть разные задачи, а у одного и того же — одна и та же, пока идёт забег.
  function createTask(spec, key) {
    const seed = hashSeed(runSeed, key, spec.subject ?? '', spec.grade ?? '', spec.difficulty ?? '');
    const rng = createRng(seed);
    const generator = selectGenerator(spec, rng);
    const generated = generator.generate(rng);

    const entry = stats.get(generator.id) ?? { seen: 0, solvedFirstTry: 0, usedSolution: 0 };
    entry.seen += 1;
    stats.set(generator.id, entry);

    return {
      taskId: generator.id,
      subject: generator.subject,
      seed,
      attempts: 0,
      solved: false,
      usedSolution: false,
      ...generated
    };
  }

  function submit(task, raw) {
    const parsed = parseAnswer(raw);

    // Пустое поле и «пять» вместо числа попытку не съедают: это не неверный
    // ответ, это ещё не ответ.
    if (!parsed.ok) {
      return { status: parsed.reason, attemptsLeft: MAX_ATTEMPTS - task.attempts };
    }

    task.attempts += 1;
    const tolerance = task.tolerance ?? 1e-6;

    if (Math.abs(parsed.value - task.answer) <= tolerance) {
      task.solved = true;
      finish(task);
      return { status: 'correct', firstTry: task.attempts === 1, attempts: task.attempts };
    }

    // Три попытки — и разбор. Ключ выдаётся всё равно: ребёнок не должен
    // застревать в тупике, из которого нет выхода, кроме как бросить игру.
    if (task.attempts >= MAX_ATTEMPTS) {
      task.solved = true;
      task.usedSolution = true;
      finish(task);
      return { status: 'exhausted', attempts: task.attempts };
    }

    return {
      status: 'wrong',
      attempts: task.attempts,
      attemptsLeft: MAX_ATTEMPTS - task.attempts,
      // Подсказка появляется после первой же ошибки.
      showHint: true
    };
  }

  function finish(task) {
    const entry = stats.get(task.taskId) ?? { seen: 1, solvedFirstTry: 0, usedSolution: 0 };
    if (task.usedSolution) entry.usedSolution += 1;
    else if (task.attempts === 1) entry.solvedFirstTry += 1;
    stats.set(task.taskId, entry);

    attempts.push({
      taskId: task.taskId,
      attempts: task.attempts,
      solvedAt: new Date().toISOString(),
      usedSolution: task.usedSolution
    });
  }

  return {
    runSeed,
    createTask,
    submit,
    stats,
    attempts,
    // Плоский вид статистики — как раз то, что ляжет в сохранение на Этапе 5.
    toSave() {
      return Object.fromEntries(stats);
    }
  };
}
