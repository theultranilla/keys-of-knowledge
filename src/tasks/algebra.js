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

export const divisionEquation = {
  id: 'algebra.division.v1',
  subject: 'algebra',
  grade: [5, 6],
  difficulty: 1,
  generate(rng) {
    const a = rng.int(2, 9);
    const b = rng.int(2, 12);
    const x = a * b;

    return {
      prompt: `Реши уравнение: x : ${a} = ${b}`,
      answer: x,
      type: 'number',
      unit: null,
      hint: 'Чтобы найти делимое, умножь частное на делитель.',
      solution: `x = ${b} · ${a} = ${x}`
    };
  }
};

export const numberRiddle = {
  id: 'algebra.riddle.v1',
  subject: 'algebra',
  grade: [5, 6],
  difficulty: 2,
  generate(rng) {
    const x = rng.int(2, 12);
    const a = rng.int(2, 6);
    const b = rng.int(1, 15);
    const c = a * x + b;

    return {
      prompt: `Задумали число, умножили на ${a} и прибавили ${b} — получилось ${c}. Какое число задумали?`,
      answer: x,
      type: 'number',
      unit: null,
      hint: `Разверни действия наоборот: сначала вычти ${b}, потом раздели на ${a}.`,
      solution: `(${c} − ${b}) : ${a} = ${a * x} : ${a} = ${x}`
    };
  }
};

export const arithmeticMean = {
  id: 'algebra.mean.v1',
  subject: 'algebra',
  grade: [5, 6, 7],
  difficulty: 2,
  generate(rng) {
    const mean = rng.int(4, 20);
    const spread = rng.int(1, 3);
    const a = mean - spread;
    const b = mean;
    const c = mean + spread;

    return {
      prompt: `Найди среднее арифметическое чисел ${a}, ${b} и ${c}`,
      answer: mean,
      type: 'number',
      unit: null,
      hint: 'Сложи все числа и раздели сумму на их количество.',
      solution: `(${a} + ${b} + ${c}) : 3 = ${a + b + c} : 3 = ${mean}`
    };
  }
};

export const square = {
  id: 'algebra.square.v1',
  subject: 'algebra',
  grade: [5, 6],
  difficulty: 1,
  generate(rng) {
    const a = rng.int(2, 15);

    return {
      prompt: `Вычисли ${a}²`,
      answer: a * a,
      type: 'number',
      unit: null,
      hint: 'Вторая степень — это число, умноженное само на себя.',
      solution: `${a}² = ${a} · ${a} = ${a * a}`
    };
  }
};

export const bracketsEquation = {
  id: 'algebra.brackets.v1',
  subject: 'algebra',
  grade: [6, 7],
  difficulty: 3,
  generate(rng) {
    const a = rng.int(2, 6);
    const x = rng.int(2, 10);
    const b = rng.int(1, 9);
    const c = a * (x + b);

    return {
      prompt: `Реши уравнение: ${a}(x + ${b}) = ${c}`,
      answer: x,
      type: 'number',
      unit: null,
      hint: `Раздели обе части на ${a}, потом вычти ${b}.`,
      solution: `x + ${b} = ${c} : ${a} = ${x + b};  x = ${x + b} − ${b} = ${x}`
    };
  }
};

export const algebraTasks = [
  linearEquation,
  unknownFactor,
  percentOfNumber,
  proportion,
  collectLikeTerms,
  divisionEquation,
  numberRiddle,
  arithmeticMean,
  square,
  bracketsEquation
];
