// Сохранение прогресса в localStorage. Один ключ, версионированная схема.
//
// Каждое обращение к хранилищу обёрнуто в try/catch, и это не перестраховка:
// в приватном режиме Safari localStorage существует, но бросает исключение при
// записи, а в некоторых браузерах доступ к нему падает ещё на чтении свойства.
// Игра в такой ситуации обязана просто работать без сохранения.

export const SAVE_KEY = 'keysofknowledge.save.v1';
export const SAVE_VERSION = 1;

// Порог второй звезды: собрать все монеты до одной — задача для перфекциониста,
// а не условие прогресса.
const COINS_FOR_STAR = 0.8;

export function createSave() {
  let broken = false;
  let data = read();

  function storage() {
    try {
      return window.localStorage;
    } catch {
      // Сам доступ к свойству может бросить — например, когда куки запрещены.
      broken = true;
      return null;
    }
  }

  function read() {
    try {
      const raw = storage()?.getItem(SAVE_KEY);
      if (!raw) return createDefaults();
      return migrate(JSON.parse(raw));
    } catch {
      broken = true;
      return createDefaults();
    }
  }

  function persist() {
    try {
      storage()?.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Записать не вышло — играем дальше без сохранения, но об этом надо знать,
      // чтобы меню могло честно сказать «прогресс не сохраняется».
      broken = true;
    }
  }

  function levelEntry(id) {
    if (!data.levels[id]) {
      data.levels[id] = { status: 'locked', coins: 0, coinsMax: 0, bestTimeMs: null, stars: 0, seed: null };
    }
    return data.levels[id];
  }

  // Первый уровень открыт всегда, остальные — когда пройден предыдущий.
  function unlockedIds(order) {
    const unlocked = new Set(order.slice(0, 1));
    for (let index = 0; index < order.length - 1; index++) {
      if (levelEntry(order[index]).status === 'completed') unlocked.add(order[index + 1]);
    }
    return unlocked;
  }

  return {
    get data() {
      return data;
    },

    // false — значит прогресс не переживёт перезагрузку. Игра при этом работает.
    get available() {
      return !broken;
    },

    levels(order) {
      const unlocked = unlockedIds(order);
      return order.map((id) => {
        const entry = levelEntry(id);
        const status = entry.status === 'completed' ? 'completed' : unlocked.has(id) ? 'unlocked' : 'locked';
        return { id, ...entry, status };
      });
    },

    // Сид задач на уровень. Пока уровень не пройден, он один и тот же: вернулся
    // к тому же сундуку — та же задача. После прохождения сид сбрасывается,
    // поэтому при повторном заходе числа будут другими.
    seedFor(id) {
      const entry = levelEntry(id);
      if (entry.seed === null) {
        entry.seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
        persist();
      }
      return entry.seed;
    },

    completeLevel(id, { coins, coinsMax, timeMs, cleanTasks }, order = []) {
      const entry = levelEntry(id);
      const ratio = coinsMax > 0 ? coins / coinsMax : 1;

      // Звёзды складываются: пройден — раз, собрал монеты — два, решил задачи
      // без разбора — три.
      const stars = 1 + (ratio >= COINS_FOR_STAR ? 1 : 0) + (cleanTasks ? 1 : 0);

      entry.status = 'completed';
      entry.coins = Math.max(entry.coins ?? 0, coins);
      entry.coinsMax = coinsMax;
      entry.stars = Math.max(entry.stars ?? 0, stars);
      entry.bestTimeMs = entry.bestTimeMs === null ? timeMs : Math.min(entry.bestTimeMs, timeMs);
      // Следующий заход по этому уровню должен дать другие числа в задачах.
      entry.seed = null;

      data.player.coinsTotal += coins;

      const next = order[order.indexOf(id) + 1];
      if (next) levelEntry(next).status = 'unlocked';

      persist();
      return { stars, ratio };
    },

    // Статистика по генераторам копится между забегами: сколько раз задача
    // попадалась, сколько раз решена с первой попытки и сколько — с разбором.
    mergeTaskStats(stats) {
      for (const [taskId, entry] of stats) {
        const stored = data.tasks[taskId] ?? { seen: 0, solvedFirstTry: 0, usedSolution: 0 };
        stored.seen += entry.seen;
        stored.solvedFirstTry += entry.solvedFirstTry;
        stored.usedSolution += entry.usedSolution;
        data.tasks[taskId] = stored;
      }
      persist();
    },

    get settings() {
      return data.settings;
    },

    setSetting(name, value) {
      data.settings[name] = value;
      persist();
    },

    reset() {
      data = createDefaults();
      try {
        storage()?.removeItem(SAVE_KEY);
      } catch {
        broken = true;
      }
      persist();
    }
  };
}

function createDefaults() {
  return {
    version: SAVE_VERSION,
    player: { name: null, coinsTotal: 0 },
    levels: {},
    tasks: {},
    settings: { sound: true, music: true, reducedMotion: false }
  };
}

// Точка, куда будут добавляться миграции. Пока версия одна, поэтому всё, что
// пришло с чужой версией, считается несовместимым и заменяется свежим
// сохранением: терять прогресс неприятно, но играть по сломанной схеме хуже.
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return createDefaults();
  if (raw.version !== SAVE_VERSION) return createDefaults();

  const fresh = createDefaults();
  return {
    version: SAVE_VERSION,
    player: { ...fresh.player, ...raw.player },
    levels: raw.levels ?? {},
    tasks: raw.tasks ?? {},
    settings: { ...fresh.settings, ...raw.settings }
  };
}
