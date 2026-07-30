import { TILE } from '../engine/constants.js';

// Загрузка и разбор уровня из levels/<id>.json. Формат описан в levels/schema.md.
//
// Разбор придирчивый нарочно: уровни правятся руками, и опечатка в карте должна
// выглядеть как понятная ошибка при загрузке, а не как игрок, проваливающийся
// сквозь пол через десять минут игры.

// Батут тоже твёрдый: на нём стоят и с него отталкиваются. Подброс добавляет
// игрок при приземлении, а сама коллизия — обычная, как с полом.
const SOLID = new Set(['ground', 'platform', 'spring']);

// Путь считается от самого модуля, а не от страницы: уровни грузит и игра из
// корня, и служебные страницы из scripts/. Ссылка при этом остаётся
// относительной, так что игра работает и из подпапки на GitHub Pages.
function levelsUrl(file) {
  return new URL(`../../levels/${file}`, import.meta.url);
}

// Уровни правятся руками, и правка должна быть видна сразу после перезагрузки.
// Без этого браузер отдаёт JSON из кэша, автор видит старую карту и ищет ошибку
// не там. 'no-cache' — это не «не кэшировать», а «каждый раз спрашивать сервер,
// не изменилось ли»: неизменившийся файл по-прежнему придёт как 304.
const FETCH_OPTIONS = { cache: 'no-cache' };

// Порядок уровней. Отдельный файл, потому что список файлов в папке из браузера
// не увидеть, а меню должно знать, какие уровни есть и в каком они порядке.
export async function loadLevelIndex() {
  const response = await fetch(levelsUrl('index.json'), FETCH_OPTIONS);
  if (!response.ok) throw new Error(`Список уровней не открылся (HTTP ${response.status})`);

  const data = await response.json();
  if (!Array.isArray(data?.order) || data.order.length === 0) {
    throw new Error('levels/index.json: поле order должно быть непустым массивом');
  }
  return data.order.map(String);
}

export async function loadLevel(id) {
  const response = await fetch(levelsUrl(`${id}.json`), FETCH_OPTIONS);
  if (!response.ok) {
    throw new Error(`Уровень «${id}»: файл не открылся (HTTP ${response.status})`);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`Уровень «${id}»: файл не разобрался как JSON — ${error.message}`);
  }

  return parseLevel(data, id);
}

export function parseLevel(data, id = data?.id) {
  const where = `Уровень «${id}»`;

  if (!Array.isArray(data?.map) || data.map.length === 0) {
    throw new Error(`${where}: нет поля map или оно пустое`);
  }
  if (data.tileSize !== TILE) {
    throw new Error(`${where}: tileSize=${data.tileSize}, а движок собран под ${TILE}`);
  }

  const rows = data.map;
  const columns = rows[0].length;
  rows.forEach((row, line) => {
    if (row.length !== columns) {
      throw new Error(
        `${where}: строка ${line} длиной ${row.length}, а первая — ${columns}. Все строки карты должны быть одной длины`
      );
    }
  });

  const legend = data.legend ?? {};
  const spawn = data.spawn;
  if (!Array.isArray(spawn) || spawn.length !== 2) {
    throw new Error(`${where}: spawn должен быть парой [колонка, строка]`);
  }
  if (spawn[0] < 0 || spawn[0] >= columns || spawn[1] < 0 || spawn[1] >= rows.length) {
    throw new Error(`${where}: spawn [${spawn}] лежит за пределами карты ${columns}×${rows.length}`);
  }

  const level = {
    id: data.id ?? id,
    title: data.title ?? '',
    legend,
    rows,
    columns,
    lines: rows.length,
    widthPx: columns * TILE,
    heightPx: rows.length * TILE,
    spawn,
    lives: data.lives ?? 3,
    chests: data.chests ?? [],
    doors: data.doors ?? [],
    platforms: data.platforms ?? [],
    hazards: data.hazards ?? [],

    tileAt(column, line) {
      const row = rows[line];
      if (!row) return 'empty';
      return legend[row[column]] ?? 'empty';
    },

    isSolid(column, line) {
      // Края карты по бокам — невидимые стены, иначе игрок убежит в пустоту.
      // Сверху и снизу пусто: вверх можно прыгать, вниз — падать.
      if (column < 0 || column >= columns) return true;
      if (line < 0 || line >= rows.length) return false;
      return SOLID.has(this.tileAt(column, line));
    }
  };

  checkAnchors(level, level.chests, 'chest', 'chests', where);
  checkAnchors(level, level.doors, 'door', 'doors', where);
  checkPlatforms(level, where);
  checkHazards(level, where);

  // Без двери-выхода уровень нельзя закончить, и это молчаливый тупик —
  // ловим его при загрузке.
  if (level.doors.length > 0 && !level.doors.some((door) => door.exit)) {
    throw new Error(`${where}: ни одна дверь не помечена "exit": true — уровень нечем закончить`);
  }

  // Ключ, которого не выдаёт ни один сундук, — тоже тупик.
  const available = new Set(level.chests.map((chest) => chest.keyColor));
  for (const door of level.doors) {
    if (!available.has(door.keyColor)) {
      throw new Error(
        `${where}: дверь на [${door.at}] просит ключ «${door.keyColor}», но такого не выдаёт ни один сундук`
      );
    }
  }

  if (level.isSolid(spawn[0], spawn[1])) {
    throw new Error(`${where}: spawn [${spawn}] стоит внутри твёрдого тайла`);
  }

  return level;
}

// Сундуки и двери описаны дважды: символом на карте и записью с параметрами.
// Если они разъехались — это опечатка, и лучше узнать о ней сразу.
function checkAnchors(level, list, kind, field, where) {
  list.forEach((entry, index) => {
    const at = entry?.at;
    if (!Array.isArray(at) || at.length !== 2) {
      throw new Error(`${where}: ${field}[${index}].at должен быть парой [колонка, строка]`);
    }
    const actual = level.tileAt(at[0], at[1]);
    if (actual !== kind) {
      throw new Error(
        `${where}: ${field}[${index}] указывает на [${at}], но там тайл «${actual}», а ожидался «${kind}»`
      );
    }
    if (!entry.keyColor) {
      throw new Error(`${where}: у ${field}[${index}] не задан keyColor`);
    }
  });
}

function checkPlatforms(level, where) {
  level.platforms.forEach((platform, index) => {
    for (const field of ['from', 'to']) {
      const point = platform?.[field];
      if (!Array.isArray(point) || point.length !== 2) {
        throw new Error(`${where}: platforms[${index}].${field} должен быть парой [колонка, строка]`);
      }
    }
    if (!(platform.speed > 0)) {
      throw new Error(`${where}: platforms[${index}].speed должен быть больше нуля`);
    }
    if (!(platform.tiles > 0)) {
      throw new Error(`${where}: platforms[${index}].tiles должен быть больше нуля`);
    }
  });
}

// Кометы — движущиеся шипы. Проверяем то же, что у платформ, кроме ширины:
// размер кометы фиксированный.
function checkHazards(level, where) {
  level.hazards.forEach((hazard, index) => {
    for (const field of ['from', 'to']) {
      const point = hazard?.[field];
      if (!Array.isArray(point) || point.length !== 2) {
        throw new Error(`${where}: hazards[${index}].${field} должен быть парой [колонка, строка]`);
      }
    }
    if (!(hazard.speed > 0)) {
      throw new Error(`${where}: hazards[${index}].speed должен быть больше нуля`);
    }
    if (hazard.mode != null && hazard.mode !== 'patrol' && hazard.mode !== 'fall') {
      throw new Error(`${where}: hazards[${index}].mode должен быть "patrol" или "fall"`);
    }
  });
}
