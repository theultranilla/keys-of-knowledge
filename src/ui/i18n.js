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
  'task.figure.alt': 'Чертёж к задаче',

  'touch.left': 'Влево',
  'touch.right': 'Вправо',
  'touch.jump': 'Прыжок',
  'touch.interact': 'Открыть сундук',
  'touch.pause': 'Пауза',
  'touch.respawn': 'Застрял — вернуться на флажок',

  'menu.title': 'Ключи знаний',
  'menu.subtitle': 'Беги, прыгай, решай — и открывай двери',
  'menu.play': 'Играть',
  'menu.dungeon': 'Данж (рогалик)',
  'menu.levels': 'Выбрать уровень',
  'menu.wardrobe': 'Гардероб',
  'menu.settings': 'Настройки',
  'menu.back': 'Назад',
  'menu.noSave': 'Браузер запретил хранилище — прогресс не сохранится',

  'wardrobe.title': 'Гардероб',
  'wardrobe.balance': 'Монеты: {coins}',
  'wardrobe.buy': 'Купить · {price}',
  'wardrobe.equip': 'Надеть',
  'wardrobe.equipped': 'Надето',
  'wardrobe.noMoney': 'Не хватает · {price}',
  'wardrobe.hint': 'Монеты за уровни тратятся здесь. Собери больше — открой новое.',
  'wardrobe.cat.body': 'Цвет кожи',
  'wardrobe.cat.shirt': 'Футболка',
  'wardrobe.cat.pants': 'Штаны',
  'wardrobe.cat.outfit': 'Наряд',
  'wardrobe.cat.hat': 'Шапка',
  'wardrobe.cat.beard': 'Борода',

  'hub.title': 'Улучшения данжа',
  'hub.hint': 'Монеты из забегов тратятся здесь — усиления навсегда.',
  'hub.start': '▶ Начать забег',
  'hub.level': 'ур. {level}/{max}',
  'hub.maxed': 'макс',

  'levels.title': 'Выбор уровня',
  'levels.locked': 'Закрыто',
  'levels.coins': '{coins} из {max} монет',
  'levels.best': 'Лучшее время: {time}',
  'levels.stars': 'Звёзд: {stars} из 3',

  'settings.title': 'Настройки',
  'settings.sound': 'Звуки',
  'settings.music': 'Музыка',
  'settings.reducedMotion': 'Меньше движения',
  'settings.reset': 'Сбросить прогресс',
  'settings.resetConfirm': 'Стереть весь прогресс? Отменить это будет нельзя.',
  'settings.resetYes': 'Стереть',
  'settings.resetNo': 'Отмена',
  'settings.resetDone': 'Прогресс стёрт',

  'pause.title': 'Пауза',
  'pause.resume': 'Продолжить',
  'pause.toMenu': 'В меню',

  'complete.title': 'Уровень пройден!',
  'complete.coins': 'Монеты',
  'complete.time': 'Время',
  'complete.score': 'Очки',
  'complete.bonus': 'Бонус за флаг',
  'complete.next': 'Следующий уровень',
  'complete.retry': 'Пройти заново',
  'complete.toMenu': 'В меню',
  'complete.star.done': 'Уровень пройден',
  'complete.star.coins': 'Собрано больше 80% монет',
  'complete.star.clean': 'Все задачи решены без разбора',

  'defeat.title': 'Ты пал',
  'defeat.subtitle': 'Знания кончились раньше врагов',
  'defeat.floor': 'Дошёл до этажа',
  'defeat.coins': 'Собрано монет',
  'defeat.earned': 'В кошелёк за забег',
  'defeat.retry': 'Ещё раз',
  'defeat.toMenu': 'В меню',

  'dungeon.floor': 'Этаж {n}',
  'dungeon.coins': 'Монеты: {n}',
  'dungeon.enemiesLeft': 'Врагов: {n}',
  'dungeon.boss': 'БОСС',
  'dungeon.weapon': 'Оружие: {name}',
  'dungeon.take': 'Взять: {name}',
  'dungeon.open': 'Открыть',
  'dungeon.buy': 'Купить: {label} · {cost}',
  'dungeon.descend': 'Вниз',
  'dungeon.altar': 'Жертва: −1 макс.HP → +урон',
  'dungeon.rest': 'Отдохнуть (+HP)',
  'dungeon.gamble': 'Испытать удачу (−8 монет)'
};

// Похвалы за верный ответ — пул, из которого берём случайную, чтобы не приедалось.
// Каждая фраза сама сообщает и успех («верно/правильно»), и поддержку: работает и
// в платформере, и в данже, где «ключа» нет. Держим строки тут, а не в модуле.
const praise = {
  ru: [
    'Умничка! Всё верно 🌟',
    'Молодец! Так держать 💪',
    'Гениально! Ответ верный ✨',
    'Красава! Точно в цель 🎯',
    'Вот это голова! Правильно 🧠',
    'Блестяще! Ты справился 🎉',
    'Супер! Верное решение 👏',
    'Здорово! Всё сошлось ⭐'
  ]
};

const dictionaries = { ru };
let current = 'ru';

export function randomPraise() {
  const pool = praise[current] ?? praise.ru;
  return pool[(Math.random() * pool.length) | 0];
}

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
