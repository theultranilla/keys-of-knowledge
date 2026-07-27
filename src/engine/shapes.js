// Скруглённый прямоугольник нужен всем, кто рисует: тайлам, сущностям, игроку.
// Отдельный модуль, чтобы не копировать фолбэк для старых Safari в трёх местах.
export function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height); // старые Safari: просто углы поострее
  }
}
