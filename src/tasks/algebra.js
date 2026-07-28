// Генераторы задач по алгебре. Каждый получает сидированный rng и возвращает
// готовую задачу: условие, ответ, подсказку и разбор.
//
// Числа подбираются так, чтобы ответ всегда получался целым. Ребёнок 5-7 класса
// должен спотыкаться о ход решения, а не о деление в столбик с остатком.

export const linearEquation = {
  id: 'algebra.linear.v1',
  subject: 'algebra',
  grade: [5, 6, 7],
  difficulty: 1,
  generate(rng) {
    const a = rng.int(2, 9);
    const x = rng.int(1, 12);
    const b = rng.int(1, 20);
    const right = a * x + b;

    return {
      prompt: `Реши уравнение: ${a}x + ${b} = ${right}`,
      answer: x,
      type: 'number',
      unit: null,
      hint: 'Сначала перенеси свободное слагаемое в правую часть.',
      solution: `${a}x = ${right} − ${b} = ${a * x};  x = ${a * x} : ${a} = ${x}`
    };
  }
};

export const unknownFactor = {
  id: 'algebra.factor.v1',
  subject: 'algebra',
  grade: [5, 6],
  difficulty: 1,
  generate(rng) {
    const a = rng.int(3, 12);
    const x = rng.int(2, 12);

    return {
      prompt: `Найди неизвестный множитель: ${a} · ? = ${a * x}`,
      answer: x,
      type: 'number',
      unit: null,
      hint: 'Чтобы найти множитель, раздели произведение на известный множитель.',
      solution: `? = ${a * x} : ${a} = ${x}`
    };
  }
};

export const percentOfNumber = {
  id: 'algebra.percent.v1',
  subject: 'algebra',
  grade: [5, 6],
  difficulty: 2,
  generate(rng) {
    const percent = rng.pick([5, 10, 20, 25, 50, 75]);
    // Кратность 20 гарантирует целый ответ для всех процентов из набора.
    const total = rng.multiple(60, 500, 20);
    const answer = (total * percent) / 100;

    return {
      prompt: `Найди ${percent}% от числа ${total}`,
      answer,
      type: 'number',
      unit: null,
      hint: `Один процент — это сотая часть. Раздели ${total} на 100, потом умножь на ${percent}.`,
      solution: `${total} : 100 = ${total / 100};  ${total / 100} · ${percent} = ${answer}`
    };
  }
};

export const proportion = {
  id: 'algebra.proportion.v1',
  subject: 'algebra',
  grade: [6, 7],
  difficulty: 2,
  generate(rng) {
    const b = rng.int(2, 9);
    const factor = rng.int(2, 9);
    const a = b * factor;
    const d = rng.int(2, 12);
    const x = factor * d;

    return {
      prompt: `Реши пропорцию: ${a} : ${b} = x : ${d}`,
      answer: x,
      type: 'number',
      unit: null,
      hint: 'Во сколько раз первое число больше второго — во столько же раз x больше последнего.',
      solution: `${a} : ${b} = ${factor};  x = ${factor} · ${d} = ${x}`
    };
  }
};

export const collectLikeTerms = {
  id: 'algebra.simplify.v1',
  subject: 'algebra',
  grade: [6, 7],
  difficulty: 2,
  generate(rng) {
    const a = rng.int(3, 12);
    const b = rng.int(2, 9);
    const c = rng.int(1, Math.min(a + b - 1, 9));
    const answer = a + b - c;

    return {
      prompt: `Упрости выражение и запиши, сколько получилось x:\n${a}x + ${b}x − ${c}x`,
      answer,
      type: 'number',
      unit: null,
      hint: 'Подобные слагаемые складывают и вычитают по коэффициентам, x остаётся один.',
      solution: `(${a} + ${b} − ${c})x = ${answer}x, значит ответ ${answer}`
    };
  }
};

export const algebraTasks = [
  linearEquation,
  unknownFactor,
  percentOfNumber,
  proportion,
  collectLikeTerms
];
