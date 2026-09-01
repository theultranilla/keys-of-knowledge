// Математика для 1–5 классов (бывшие «алгебра» + «геометрия» вместе). От сложения
// в пределах 20 до умножения в столбик, простых задач и площади/периметра фигур.
// Числа подобраны так, чтобы ответ всегда был целым: ребёнок спотыкается о ход
// решения, а не о деление с остатком. Геометрия рисует чертёж через figure.
import { withUnit } from './plural.js';

export const addSmall = {
  id: 'math.add.v1', subject: 'math', grade: [1, 2], difficulty: 1,
  generate(rng) {
    const a = rng.int(1, 10), b = rng.int(1, 10);
    return { prompt: `Сколько будет ${a} + ${b}?`, answer: a + b, type: 'number', unit: null,
      hint: 'Прибавляй по одному или посчитай на пальцах.', solution: `${a} + ${b} = ${a + b}` };
  }
};

export const subSmall = {
  id: 'math.sub.v1', subject: 'math', grade: [1, 2], difficulty: 1,
  generate(rng) {
    const a = rng.int(5, 20), b = rng.int(1, a);
    return { prompt: `Сколько будет ${a} − ${b}?`, answer: a - b, type: 'number', unit: null,
      hint: 'Отними меньшее число от большего.', solution: `${a} − ${b} = ${a - b}` };
  }
};

export const addHundred = {
  id: 'math.add100.v1', subject: 'math', grade: [2, 3], difficulty: 1,
  generate(rng) {
    const a = rng.int(10, 60), b = rng.int(10, 39);
    return { prompt: `Сложи: ${a} + ${b}`, answer: a + b, type: 'number', unit: null,
      hint: 'Сложи десятки, потом единицы.', solution: `${a} + ${b} = ${a + b}` };
  }
};

export const missingAddend = {
  id: 'math.missing.v1', subject: 'math', grade: [2, 3], difficulty: 2,
  generate(rng) {
    const a = rng.int(2, 15), sum = a + rng.int(2, 15);
    return { prompt: `Какое число пропущено: ${a} + ? = ${sum}`, answer: sum - a, type: 'number', unit: null,
      hint: `Отними ${a} от ${sum}.`, solution: `? = ${sum} − ${a} = ${sum - a}` };
  }
};

export const multTable = {
  id: 'math.mult.v1', subject: 'math', grade: [3, 4], difficulty: 1,
  generate(rng) {
    const a = rng.int(2, 9), b = rng.int(2, 9);
    return { prompt: `Сколько будет ${a} × ${b}?`, answer: a * b, type: 'number', unit: null,
      hint: 'Вспомни таблицу умножения.', solution: `${a} × ${b} = ${a * b}` };
  }
};

export const divTable = {
  id: 'math.div.v1', subject: 'math', grade: [3, 4], difficulty: 1,
  generate(rng) {
    const a = rng.int(2, 9), b = rng.int(2, 9), p = a * b;
    return { prompt: `Сколько будет ${p} : ${a}?`, answer: b, type: 'number', unit: null,
      hint: 'Какое число умножить на делитель, чтобы вышло делимое?', solution: `${p} : ${a} = ${b}` };
  }
};

export const multBig = {
  id: 'math.multbig.v1', subject: 'math', grade: [4, 5], difficulty: 2,
  generate(rng) {
    const a = rng.int(11, 25), b = rng.int(2, 7);
    return { prompt: `Вычисли: ${a} × ${b}`, answer: a * b, type: 'number', unit: null,
      hint: 'Умножь десятки и единицы по отдельности, потом сложи.', solution: `${a} × ${b} = ${a * b}` };
  }
};

export const wordShop = {
  id: 'math.word.v1', subject: 'math', grade: [2, 4], difficulty: 2,
  generate(rng) {
    const start = rng.int(12, 30), spent = rng.int(3, start - 1);
    return { prompt: `У Маши было ${withUnit(start, 'наклейка', 'наклейки', 'наклеек')}. Она подарила ${spent}. Сколько осталось?`,
      answer: start - spent, type: 'number', unit: null,
      hint: 'Отними подаренные от того, что было.', solution: `${start} − ${spent} = ${start - spent}` };
  }
};

export const rectPerimeter = {
  id: 'math.rect.v1', subject: 'math', grade: [4, 5], difficulty: 2,
  generate(rng) {
    const w = rng.int(2, 9), h = rng.int(2, 9);
    return { prompt: 'Найди периметр прямоугольника', answer: 2 * (w + h), type: 'number', unit: 'см',
      figure: { kind: 'rectangle', width: w, height: h, labelWidth: `${w} см`, labelHeight: `${h} см` },
      hint: 'Периметр — сумма всех сторон; противоположные стороны равны.',
      solution: `P = (${w} + ${h}) · 2 = ${2 * (w + h)} см` };
  }
};

export const squareArea = {
  id: 'math.square.v1', subject: 'math', grade: [4, 5], difficulty: 2,
  generate(rng) {
    const s = rng.int(2, 9);
    return { prompt: 'Найди площадь квадрата', answer: s * s, type: 'number', unit: 'см²',
      figure: { kind: 'rectangle', width: s, height: s, labelWidth: `${s} см`, labelHeight: `${s} см` },
      hint: 'Площадь квадрата — сторона, умноженная сама на себя.',
      solution: `S = ${s} · ${s} = ${s * s} см²` };
  }
};

export const multiStep = {
  id: 'math.multistep.v1', subject: 'math', grade: [5], difficulty: 3,
  generate(rng) {
    const a = rng.int(2, 9), b = rng.int(2, 9), c = rng.int(2, 20);
    return { prompt: `Вычисли по порядку действий: ${a} × ${b} + ${c}`, answer: a * b + c, type: 'number', unit: null,
      hint: 'Сначала умножение, потом сложение.', solution: `${a} × ${b} = ${a * b};  ${a * b} + ${c} = ${a * b + c}` };
  }
};

export const mathTasks = [
  addSmall, subSmall, addHundred, missingAddend, multTable, divTable,
  multBig, wordShop, rectPerimeter, squareArea, multiStep
];
