// Русское согласование существительного с числом: «1 час», «2 часа», «5 часов».
// Без этого в задачах вылезали «24 наклеек» и «за 6 часа» — режет глаз ребёнку,
// который как раз учит родной язык. Правило стандартное для счётных форм.
export function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

// Число вместе с правильной формой слова: hoursWord(6) → «6 часов».
export const withUnit = (n, one, few, many) => `${n} ${plural(n, one, few, many)}`;
