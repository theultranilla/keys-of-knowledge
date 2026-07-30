// Генераторы задач по геометрии. Каждая обязана вернуть `figure` — описание
// чертежа, который карточка нарисует inline-SVG по этим параметрам.
// Прямоугольник с подписанными сторонами читается ребёнком в десять раз быстрее
// того же условия текстом, поэтому чертёж здесь не украшение, а часть задачи.

export const rectangleSides = {
  id: 'geometry.rectangle.v1',
  subject: 'geometry',
  grade: [5, 6],
  difficulty: 1,
  generate(rng) {
    const width = rng.int(3, 14);
    const height = rng.int(2, 11);
    const askArea = rng.next() < 0.5;

    const perimeter = 2 * (width + height);
    const area = width * height;

    return {
      prompt: askArea
        ? 'Найди площадь прямоугольника'
        : 'Найди периметр прямоугольника',
      answer: askArea ? area : perimeter,
      type: 'number',
      unit: askArea ? 'см²' : 'см',
      figure: { kind: 'rectangle', width, height, labelWidth: `${width} см`, labelHeight: `${height} см` },
      hint: askArea
        ? 'Площадь прямоугольника — это длина, умноженная на ширину.'
        : 'Периметр — сумма всех сторон. Противоположные стороны равны.',
      solution: askArea
        ? `S = ${width} · ${height} = ${area} см²`
        : `P = (${width} + ${height}) · 2 = ${perimeter} см`
    };
  }
};

export const triangleArea = {
  id: 'geometry.triangleArea.v1',
  subject: 'geometry',
  grade: [5, 6, 7],
  difficulty: 2,
  generate(rng) {
    // Одна из сторон чётная — тогда деление пополам даёт целый ответ.
    const base = rng.multiple(4, 20, 2);
    const height = rng.int(3, 12);
    const area = (base * height) / 2;

    return {
      prompt: 'Найди площадь треугольника',
      answer: area,
      type: 'number',
      unit: 'см²',
      figure: { kind: 'triangle', base, height, labelBase: `${base} см`, labelHeight: `${height} см` },
      hint: 'Площадь треугольника — половина от основания, умноженного на высоту.',
      solution: `S = ${base} · ${height} : 2 = ${base * height} : 2 = ${area} см²`
    };
  }
};

export const triangleAngles = {
  id: 'geometry.triangleAngles.v1',
  subject: 'geometry',
  grade: [6, 7],
  difficulty: 2,
  generate(rng) {
    const first = rng.multiple(25, 90, 5);
    const second = rng.multiple(20, Math.min(150 - first, 95), 5);
    const third = 180 - first - second;

    return {
      prompt: 'Найди третий угол треугольника',
      answer: third,
      type: 'number',
      unit: '°',
      figure: { kind: 'triangleAngles', first, second },
      hint: 'Сумма углов любого треугольника равна 180°.',
      solution: `∠3 = 180° − ${first}° − ${second}° = ${third}°`
    };
  }
};

export const circleLength = {
  id: 'geometry.circle.v1',
  subject: 'geometry',
  grade: [6, 7],
  difficulty: 3,
  generate(rng) {
    const radius = rng.int(2, 12);
    // π округляем до 3.14, как в школьном учебнике, и допускаем сотую погрешности.
    const length = Number((2 * 3.14 * radius).toFixed(2));

    return {
      prompt: 'Найди длину окружности. Считай, что π ≈ 3,14',
      answer: length,
      type: 'number',
      unit: 'см',
      tolerance: 0.01,
      figure: { kind: 'circle', radius, label: `r = ${radius} см` },
      hint: 'Длина окружности равна двум π, умноженным на радиус.',
      solution: `C = 2 · 3,14 · ${radius} = ${String(length).replace('.', ',')} см`
    };
  }
};

export const boxVolume = {
  id: 'geometry.volume.v1',
  subject: 'geometry',
  grade: [5, 6],
  difficulty: 2,
  generate(rng) {
    const isCube = rng.next() < 0.4;
    const a = rng.int(2, 9);
    const b = isCube ? a : rng.int(2, 9);
    const c = isCube ? a : rng.int(2, 7);
    const volume = a * b * c;

    return {
      prompt: isCube ? 'Найди объём куба' : 'Найди объём прямоугольного параллелепипеда',
      answer: volume,
      type: 'number',
      unit: 'см³',
      figure: { kind: 'box', a, b, c, isCube },
      hint: isCube
        ? 'Объём куба — ребро, умноженное само на себя три раза.'
        : 'Объём — это длина, умноженная на ширину и на высоту.',
      solution: isCube
        ? `V = ${a} · ${a} · ${a} = ${volume} см³`
        : `V = ${a} · ${b} · ${c} = ${volume} см³`
    };
  }
};

export const squareSides = {
  id: 'geometry.square.v1',
  subject: 'geometry',
  grade: [5, 6],
  difficulty: 1,
  generate(rng) {
    const side = rng.int(3, 12);
    const askArea = rng.next() < 0.5;

    return {
      prompt: askArea ? 'Найди площадь квадрата' : 'Найди периметр квадрата',
      answer: askArea ? side * side : side * 4,
      type: 'number',
      unit: askArea ? 'см²' : 'см',
      figure: { kind: 'rectangle', width: side, height: side, labelWidth: `${side} см`, labelHeight: `${side} см` },
      hint: askArea
        ? 'Площадь квадрата — сторона, умноженная сама на себя.'
        : 'У квадрата все четыре стороны равны.',
      solution: askArea
        ? `S = ${side} · ${side} = ${side * side} см²`
        : `P = ${side} · 4 = ${side * 4} см`
    };
  }
};

export const rectangleFindSide = {
  id: 'geometry.rectangleSide.v1',
  subject: 'geometry',
  grade: [5, 6],
  difficulty: 2,
  generate(rng) {
    const width = rng.int(3, 12);
    const height = rng.int(2, 9);
    const area = width * height;

    return {
      prompt: `Площадь прямоугольника ${area} см², а ширина ${width} см. Найди высоту`,
      answer: height,
      type: 'number',
      unit: 'см',
      // Искомую сторону подписываем «?»: чертёж читается как та же задача, что в тексте.
      figure: { kind: 'rectangle', width, height, labelWidth: `${width} см`, labelHeight: '? см' },
      hint: 'Высота — это площадь, делённая на ширину.',
      solution: `h = ${area} : ${width} = ${height} см`
    };
  }
};

export const triangleFindBase = {
  id: 'geometry.triangleBase.v1',
  subject: 'geometry',
  grade: [6, 7],
  difficulty: 2,
  generate(rng) {
    const base = rng.multiple(4, 20, 2);
    const height = rng.int(3, 12);
    const area = (base * height) / 2;

    return {
      prompt: `Площадь треугольника ${area} см², высота ${height} см. Найди основание`,
      answer: base,
      type: 'number',
      unit: 'см',
      figure: { kind: 'triangle', base, height, labelBase: '? см', labelHeight: `${height} см` },
      hint: 'Основание — это удвоенная площадь, делённая на высоту.',
      solution: `a = 2 · ${area} : ${height} = ${2 * area} : ${height} = ${base} см`
    };
  }
};

export const circleArea = {
  id: 'geometry.circleArea.v1',
  subject: 'geometry',
  grade: [7],
  difficulty: 3,
  generate(rng) {
    const radius = rng.int(2, 10);
    const area = Number((3.14 * radius * radius).toFixed(2));

    return {
      prompt: 'Найди площадь круга. Считай, что π ≈ 3,14',
      answer: area,
      type: 'number',
      unit: 'см²',
      tolerance: 0.01,
      figure: { kind: 'circle', radius, label: `r = ${radius} см` },
      hint: 'Площадь круга равна π, умноженному на радиус в квадрате.',
      solution: `S = 3,14 · ${radius}² = 3,14 · ${radius * radius} = ${String(area).replace('.', ',')} см²`
    };
  }
};

export const cubeSurface = {
  id: 'geometry.cubeSurface.v1',
  subject: 'geometry',
  grade: [6, 7],
  difficulty: 3,
  generate(rng) {
    const a = rng.int(2, 9);

    return {
      prompt: 'Найди площадь поверхности куба',
      answer: 6 * a * a,
      type: 'number',
      unit: 'см²',
      figure: { kind: 'box', a, b: a, c: a, isCube: true },
      hint: 'У куба шесть одинаковых квадратных граней. Найди площадь одной и умножь на шесть.',
      solution: `S = 6 · ${a}² = 6 · ${a * a} = ${6 * a * a} см²`
    };
  }
};

export const geometryTasks = [
  rectangleSides,
  triangleArea,
  triangleAngles,
  circleLength,
  boxVolume,
  squareSides,
  rectangleFindSide,
  triangleFindBase,
  circleArea,
  cubeSurface
];
