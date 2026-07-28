// Генераторы задач по физике. Единица измерения возвращается отдельным полем:
// карточка показывает её рядом с полем ввода, чтобы ребёнок не гадал, в чём
// писать ответ, и не терял балл из-за «5 м/с» вместо «5».

export const speedFromDistance = {
  id: 'physics.speed.v1',
  subject: 'physics',
  grade: [7],
  difficulty: 2,
  generate(rng) {
    const speed = rng.int(2, 25);
    const time = rng.int(2, 12);
    const distance = speed * time;

    return {
      prompt: `Велосипедист проехал ${distance} м за ${time} с. Найди его скорость`,
      answer: speed,
      type: 'number',
      unit: 'м/с',
      tolerance: 0.01,
      hint: 'Скорость — это путь, делённый на время.',
      solution: `v = s : t = ${distance} : ${time} = ${speed} м/с`
    };
  }
};

export const densityFromMass = {
  id: 'physics.density.v1',
  subject: 'physics',
  grade: [7],
  difficulty: 3,
  generate(rng) {
    const density = rng.pick([2, 3, 5, 7, 8, 11, 13]);
    const volume = rng.int(3, 15);
    const mass = density * volume;

    return {
      prompt: `Тело массой ${mass} г занимает объём ${volume} см³. Найди плотность вещества`,
      answer: density,
      type: 'number',
      unit: 'г/см³',
      tolerance: 0.01,
      hint: 'Плотность — это масса, делённая на объём.',
      solution: `ρ = m : V = ${mass} : ${volume} = ${density} г/см³`
    };
  }
};

export const distanceFromSpeed = {
  id: 'physics.distance.v1',
  subject: 'physics',
  grade: [5, 6, 7],
  difficulty: 1,
  generate(rng) {
    const speed = rng.int(3, 20);
    const time = rng.int(2, 9);

    return {
      prompt: `Поезд идёт со скоростью ${speed} км/ч. Какой путь он пройдёт за ${time} ч?`,
      answer: speed * time,
      type: 'number',
      unit: 'км',
      hint: 'Путь при равномерном движении — это скорость, умноженная на время.',
      solution: `s = v · t = ${speed} · ${time} = ${speed * time} км`
    };
  }
};

export const bodyWeight = {
  id: 'physics.weight.v1',
  subject: 'physics',
  grade: [7],
  difficulty: 1,
  generate(rng) {
    const mass = rng.int(2, 40);

    return {
      prompt: `Найди вес тела массой ${mass} кг. Считай, что g = 10 Н/кг`,
      answer: mass * 10,
      type: 'number',
      unit: 'Н',
      hint: 'Вес равен массе, умноженной на g.',
      solution: `F = m · g = ${mass} · 10 = ${mass * 10} Н`
    };
  }
};

export const mechanicalWork = {
  id: 'physics.work.v1',
  subject: 'physics',
  grade: [7],
  difficulty: 2,
  generate(rng) {
    const force = rng.multiple(10, 120, 5);
    const distance = rng.int(2, 15);

    return {
      prompt: `Груз тянут с силой ${force} Н на расстояние ${distance} м. Найди работу`,
      answer: force * distance,
      type: 'number',
      unit: 'Дж',
      hint: 'Работа равна силе, умноженной на пройденный путь.',
      solution: `A = F · s = ${force} · ${distance} = ${force * distance} Дж`
    };
  }
};

export const physicsTasks = [
  speedFromDistance,
  densityFromMass,
  distanceFromSpeed,
  bodyWeight,
  mechanicalWork
];
