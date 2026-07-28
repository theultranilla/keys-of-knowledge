// Сидируемый генератор случайных чисел. Нужен, чтобы задача у конкретного
// сундука была одна и та же, пока идёт этот забег: вышел из карточки, вернулся —
// числа те же, а не новые. Новый забег — новый сид, значит и числа другие,
// поэтому ответ нельзя заучить.
//
// Алгоритм — mulberry32: короткий, быстрый и с достаточно приличным
// распределением для наших задач. Криптостойкость тут никому не нужна.

export function createRng(seed) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,

    // Целое от min до max включительно.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },

    pick(list) {
      return list[Math.floor(next() * list.length)];
    },

    // Целое из диапазона, кратное step. Нужно, чтобы у задач с делением
    // получались круглые ответы, а не 3.7142857.
    multiple(min, max, step) {
      const from = Math.ceil(min / step);
      const to = Math.floor(max / step);
      return (from + Math.floor(next() * (to - from + 1))) * step;
    }
  };
}

// Превращает набор строк и чисел в один сид. Нужен, чтобы у каждого сундука на
// каждом уровне был свой поток чисел, а не общий на всю игру.
export function hashSeed(...parts) {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return hash >>> 0;
}
