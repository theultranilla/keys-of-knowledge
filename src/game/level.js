import { TILE } from '../engine/constants.js';

// Загрузка и разбор уровня из levels/<id>.json. Формат описан в levels/schema.md.
//
// Разбор придирчивый нарочно: уровни правятся руками, и опечатка в карте должна
// выглядеть как понятная ошибка при загрузке, а не как игрок, проваливающийся
// сквозь пол через десять минут игры.

const SOLID = new Set(['ground', 'platform']);

export async function loadLevel(id) {
  // Путь относительный — игра должна работать из подпапки на GitHub Pages.
  const response = await fetch(`./levels/${id}.json`);
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
