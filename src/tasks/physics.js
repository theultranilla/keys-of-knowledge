// Физика для 1–5 классов: не формулы 7 класса, а простые наблюдения и счёт в
// контексте — лапы, колёса, температура, вес, путь и время. Единица измерения
// возвращается отдельным полем, чтобы карточка показала её у поля ввода.
import { withUnit } from './plural.js';

export const countLegs = {
  id: 'physics.legs.v1', subject: 'physics', grade: [1, 2], difficulty: 1,
  generate(rng) {
    const n = rng.int(2, 6);
    return { prompt: `У кошки 4 лапы. Сколько лап у ${n} кошек?`, answer: n * 4, type: 'number', unit: null,
      hint: 'Умножь 4 на количество кошек.', solution: `4 × ${n} = ${n * 4}` };
  }
};

export const countWheels = {
  id: 'physics.wheels.v1', subject: 'physics', grade: [2, 3], difficulty: 1,
  generate(rng) {
    const n = rng.int(2, 8);
    return { prompt: `У машины 4 колеса. Сколько колёс у ${n} машин?`, answer: n * 4, type: 'number', unit: null,
      hint: 'Умножь 4 на число машин.', solution: `4 × ${n} = ${n * 4}` };
  }
};

export const tempDiff = {
  id: 'physics.temp.v1', subject: 'physics', grade: [2, 3], difficulty: 2,
  generate(rng) {
    const day = rng.int(10, 25), night = rng.int(0, day - 2);
    return { prompt: `Днём было +${day}°, ночью +${night}°. На сколько градусов днём теплее?`,
      answer: day - night, type: 'number', unit: '°',
      hint: 'Отними ночную температуру от дневной.', solution: `${day} − ${night} = ${day - night}°` };
  }
};

export const heavier = {
  id: 'physics.heavier.v1', subject: 'physics', grade: [2, 3], difficulty: 2,
  generate(rng) {
    const a = rng.int(6, 20), b = rng.int(1, a - 1);
    return { prompt: `Арбуз весит ${a} кг, дыня ${b} кг. На сколько арбуз тяжелее дыни?`,
      answer: a - b, type: 'number', unit: 'кг',
      hint: 'Найди разницу весов.', solution: `${a} − ${b} = ${a - b} кг` };
  }
};

export const dayHours = {
  id: 'physics.hours.v1', subject: 'physics', grade: [3, 4], difficulty: 2,
  generate(rng) {
    const n = rng.int(2, 5);
    return { prompt: `В одном дне 24 часа. Сколько часов в ${withUnit(n, 'дне', 'днях', 'днях')}?`, answer: n * 24, type: 'number', unit: 'ч',
      hint: 'Умножь 24 на число дней.', solution: `24 × ${n} = ${n * 24} ч` };
  }
};

export const trainDistance = {
  id: 'physics.distance.v1', subject: 'physics', grade: [4, 5], difficulty: 2,
  generate(rng) {
    const v = rng.int(3, 15), t = rng.int(2, 6);
    return { prompt: `Поезд едет ${v} км в час. Сколько км он пройдёт за ${withUnit(t, 'час', 'часа', 'часов')}?`,
      answer: v * t, type: 'number', unit: 'км',
      hint: 'Путь — это скорость, умноженная на время.', solution: `${v} × ${t} = ${v * t} км` };
  }
};

export const simpleSpeed = {
  id: 'physics.speed.v1', subject: 'physics', grade: [5], difficulty: 3,
  generate(rng) {
    const v = rng.int(3, 12), t = rng.int(2, 6), s = v * t;
    return { prompt: `Машина проехала ${s} км за ${withUnit(t, 'час', 'часа', 'часов')}. Какая у неё скорость?`,
      answer: v, type: 'number', unit: 'км/ч',
      hint: 'Скорость — это путь, делённый на время.', solution: `${s} : ${t} = ${v} км/ч` };
  }
};

export const physicsTasks = [
  countLegs, countWheels, tempDiff, heavier, dayHours, trainDistance, simpleSpeed
];
