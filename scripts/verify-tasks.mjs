import { verifyTasks, RUNS_PER_GENERATOR } from './checks.js';

// Прогон всех генераторов задач. Тестового фреймворка в проекте нет и не будет —
// это самописный скрипт на голом Node.
//
// Запуск:
//   node --experimental-default-type=module scripts/verify-tasks.mjs
//
// Флаг нужен потому, что package.json в проекте нет (и не должно быть), а без
// него Node считает файлы .js модулями CommonJS. Флаг говорит «здесь ESM».
// Node 20.10 и новее. Если Node не установлен вовсе — те же проверки открываются
// в браузере: scripts/verify-tasks.html.

const report = verifyTasks(RUNS_PER_GENERATOR);

console.log(`Генераторов: ${report.generators}`);
for (const [subject, count] of Object.entries(report.bySubject)) {
  console.log(`  ${subject}: ${count}`);
}
console.log(`Прогонов на генератор: ${RUNS_PER_GENERATOR}\n`);

for (const entry of report.results) {
  const ok = entry.problems.length === 0;
  console.log(`${ok ? 'ок  ' : 'СБОЙ'}  ${entry.id}`);
  for (const problem of entry.problems) {
    console.log(`        ${problem}`);
  }
}

if (report.rules.length > 0) {
  console.log('\nПравила движка:');
  for (const problem of report.rules) console.log(`  СБОЙ  ${problem}`);
}

console.log(report.ok ? '\nВсё сошлось.' : '\nЕсть расхождения — см. выше.');
process.exit(report.ok ? 0 : 1);
