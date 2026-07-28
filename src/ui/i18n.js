// Все строки интерфейса живут здесь. Пока язык один, но карта строк отдельно от
// кода нужна уже сейчас: добавить английский или таджикский потом будет значить
// «дописать словарь», а не «искать текст по всем модулям».

const ru = {
  'task.title.algebra': 'Задача по алгебре',
  'task.title.geometry': 'Задача по геометрии',
  'task.title.physics': 'Задача по физике',
  'task.answer.label': 'Ответ',
  'task.check': 'Проверить',
  'task.back': 'Вернуться',
  'task.close': 'Закрыть',
  'task.attempts': 'Попытка {current} из {total}',
  'task.hint': 'Подсказка',
  'task.solution': 'Как решается',
  'task.correct': 'Верно! Ключ твой.',
  'task.wrong': 'Это число не подходит. Попробуй ещё раз.',
  'task.exhausted': 'Ничего страшного — вот как это решается. Ключ всё равно твой.',
  'task.empty': 'Впиши ответ числом.',
  'task.not-a-number': 'Нужно число. Дробную часть можно писать через запятую.',
  'task.figure.alt': 'Чертёж к задаче'
};

const dictionaries = { ru };
let current = 'ru';

export function setLanguage(code) {
  if (dictionaries[code]) current = code;
}

// Подстановка вида {current} — чтобы «Попытка 2 из 3» собиралась в словаре, а не
// склейкой строк в коде: в другом языке порядок слов будет другим.
export function t(key, values) {
  const template = dictionaries[current][key] ?? key;
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : match
  );
}
