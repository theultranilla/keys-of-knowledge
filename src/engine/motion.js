// Один источник правды про prefers-reduced-motion. И фон с параллаксом, и осколки
// при хлопке смотрят на одну и ту же настройку — заводить по своему matchMedia
// в каждом модуле значит однажды забыть про один из них.

const query = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduced = query.matches;

// Настройку можно переключить в системе, не перезагружая игру.
query.addEventListener('change', (event) => {
  reduced = event.matches;
});

export function prefersReducedMotion() {
  return reduced;
}
