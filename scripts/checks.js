import { ALL_GENERATORS, createTaskEngine, MAX_ATTEMPTS } from '../src/tasks/engine.js';
import { createRng, hashSeed } from '../src/tasks/rng.js';

// Общая логика проверки генераторов. Отдельно от запускалок, потому что
// запускалок две: scripts/verify-tasks.mjs для Node и scripts/verify-tasks.html
// для браузера. Проверяют они одно и то же одним и тем же кодом.

export const RUNS_PER_GENERATOR = 100;

const FIGURE_KINDS = new Set(['rectangle', 'triangle', 'triangleAngles', 'circle', 'box']);

export function verifyTasks(runs = RUNS_PER_GENERATOR) {
  const engine = createTaskEngine({ runSeed: 1 });
  const results = ALL_GENERATORS.map((generator) => ({
    id: generator.id,
    subject: generator.subject,
    runs,
    problems: checkGenerator(generator, engine, runs)
  }));

  const rules = checkAttemptRules();

  return {
    results,
    rules,
    generators: ALL_GENERATORS.length,
    bySubject: countBySubject(),
    ok: results.every((entry) => entry.problems.length === 0) && rules.length === 0
  };
}

function checkGenerator(generator, engine, runs) {
  const problems = [];
  const note = (run, text) => {
    if (problems.length < 5) problems.push(`прогон ${run}: ${text}`);
  };

  for (let run = 0; run < runs; run++) {
    const seed = hashSeed('verify', generator.id, run);
    const task = { taskId: generator.id, attempts: 0, ...generator.generate(createRng(seed)) };

    if (typeof task.prompt !== 'string' || task.prompt.trim() === '') {
      note(run, 'пустое условие');
      continue;
    }
    if (!Number.isFinite(task.answer)) {
      note(run, `ответ не число: ${task.answer}`);
      continue;
    }
    if (task.type !== 'number') note(run, `неожиданный тип ответа: ${task.type}`);
    if (!task.hint?.trim()) note(run, 'нет подсказки');
    if (!task.solution?.trim()) note(run, 'нет разбора');

    // Нецелый ответ без допуска — ловушка: ребёнок напишет округлённое число
    // и получит «не подходит», хотя решил правильно.
    if (!Number.isInteger(task.answer) && !(task.tolerance > 0)) {
      note(run, `нецелый ответ ${task.answer} без tolerance`);
    }

    if (generator.subject === 'geometry') {
      if (!task.figure) note(run, 'у геометрии нет чертежа');
      else if (!FIGURE_KINDS.has(task.figure.kind)) note(run, `неизвестный чертёж: ${task.figure.kind}`);
    }

    // Собственный ответ задачи обязан приниматься движком.
    const exact = engine.submit({ ...task, attempts: 0 }, String(task.answer));
    if (exact.status !== 'correct') note(run, `правильный ответ отвергнут: ${exact.status}`);

    // И тот же ответ, записанный через запятую.
    const comma = engine.submit({ ...task, attempts: 0 }, String(task.answer).replace('.', ','));
    if (comma.status !== 'correct') note(run, 'ответ с запятой не принят');

    // Заведомо неверный ответ обязан отвергаться.
    const wrong = engine.submit({ ...task, attempts: 0 }, String(task.answer + 1));
    if (wrong.status === 'correct') note(run, `принят неверный ответ ${task.answer + 1}`);

    // Тот же сид обязан давать ту же задачу.
    const twin = generator.generate(createRng(seed));
    if (twin.prompt !== task.prompt || twin.answer !== task.answer) {
      note(run, 'один сид дал разные задачи');
    }
  }

  return problems;
}

// Правило трёх попыток проверяется отдельно: оно про движок, а не про генераторы.
function checkAttemptRules() {
  const problems = [];
  const engine = createTaskEngine({ runSeed: 7 });
  const make = () => ({ taskId: 'test', attempts: 0, answer: 42, solved: false, usedSolution: false });

  const task = make();
  const first = engine.submit(task, '1');
  if (first.status !== 'wrong' || !first.showHint) problems.push('после первой ошибки нет подсказки');

  engine.submit(task, '2');
  const third = engine.submit(task, '3');
  if (third.status !== 'exhausted') problems.push('третья ошибка не показала разбор');
  if (!task.solved) problems.push('после трёх попыток задача не считается закрытой — ключ бы не выдали');
  if (!task.usedSolution) problems.push('не помечено, что решено с разбором');
  if (task.attempts !== MAX_ATTEMPTS) problems.push(`попыток насчитано ${task.attempts}, а должно ${MAX_ATTEMPTS}`);

  const blank = make();
  const empty = engine.submit(blank, '   ');
  if (empty.status !== 'empty' || blank.attempts !== 0) problems.push('пустой ответ съел попытку');

  const words = make();
  engine.submit(words, 'сорок два');
  if (words.attempts !== 0) problems.push('не-число съело попытку');

  return problems;
}

function countBySubject() {
  const counts = {};
  for (const generator of ALL_GENERATORS) {
    counts[generator.subject] = (counts[generator.subject] ?? 0) + 1;
  }
  return counts;
}
