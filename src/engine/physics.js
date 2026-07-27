import { TILE } from './constants.js';

// Столкновения тела с тайловой сеткой. Тело — любой объект с x, y, width, height
// и velocityX / velocityY: игрок, а на Этапе 3 и движущиеся платформы.

// Чтобы тело, стоящее вплотную к стене, не считалось залезшим в соседний тайл:
// координата 64 при тайле 32 принадлежит второму тайлу, а не третьему.
const EPSILON = 1e-6;

// Двигает тело по скорости и разбирает столкновения. Возвращает, чего тело
// коснулось на этом шаге — вызывающий код решает, что это значит: приземление,
// удар головой или упор в стену.
export function moveAndCollide(body, map, dt) {
  const contacts = { left: false, right: false, above: false, below: false };

  // Оси разбираются по очереди: сначала полностью решаем X, потом Y. Если двигать
  // обе сразу, угол тела и угол тайла пересекутся, и выталкивать его будет некуда —
  // непонятно, упёрлись мы в стену или встали на пол.
  body.x += body.velocityX * dt;
  resolveHorizontal(body, map, contacts);

  body.y += body.velocityY * dt;
  resolveVertical(body, map, contacts);

  return contacts;
}

function resolveHorizontal(body, map, contacts) {
  if (body.velocityX === 0) return;

  const lineFrom = Math.floor(body.y / TILE);
  const lineTo = Math.floor((body.y + body.height - EPSILON) / TILE);
  const columnFrom = Math.floor(body.x / TILE);
  const columnTo = Math.floor((body.x + body.width - EPSILON) / TILE);

  // Идём навстречу движению: тело останавливает тот твёрдый тайл, в который оно
  // въехало первым по ходу, а не первый попавшийся в переборе. При движении влево
  // это самый правый из перекрытых — иначе в стене толщиной в два тайла тело
  // вытолкнет к границе левого, то есть внутрь правого.
  const movingRight = body.velocityX > 0;
  const first = movingRight ? columnFrom : columnTo;
  const last = movingRight ? columnTo : columnFrom;
  const step = movingRight ? 1 : -1;

  for (let column = first; movingRight ? column <= last : column >= last; column += step) {
    for (let line = lineFrom; line <= lineTo; line++) {
      if (!map.isSolid(column, line)) continue;

      if (movingRight) {
        body.x = column * TILE - body.width;
        contacts.right = true;
      } else {
        body.x = (column + 1) * TILE;
        contacts.left = true;
      }
      body.velocityX = 0;
      return;
    }
  }
}

function resolveVertical(body, map, contacts) {
  if (body.velocityY === 0) return;

  const columnFrom = Math.floor(body.x / TILE);
  const columnTo = Math.floor((body.x + body.width - EPSILON) / TILE);
  const lineFrom = Math.floor(body.y / TILE);
  const lineTo = Math.floor((body.y + body.height - EPSILON) / TILE);

  // Та же логика, что и по горизонтали: при падении ловит самый верхний твёрдый
  // тайл, при прыжке вверх — самый нижний.
  const movingDown = body.velocityY > 0;
  const first = movingDown ? lineFrom : lineTo;
  const last = movingDown ? lineTo : lineFrom;
  const step = movingDown ? 1 : -1;

  for (let line = first; movingDown ? line <= last : line >= last; line += step) {
    for (let column = columnFrom; column <= columnTo; column++) {
      if (!map.isSolid(column, line)) continue;

      if (movingDown) {
        body.y = line * TILE - body.height;
        contacts.below = true;
      } else {
        body.y = (line + 1) * TILE;
        contacts.above = true;
      }
      body.velocityY = 0;
      return;
    }
  }
}

// Пересечение двух прямоугольников. Нужно всему, что не тайл: чекпоинты сейчас,
// монеты, сундуки и шипы на Этапе 3.
export function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
