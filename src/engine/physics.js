import { TILE } from './constants.js';

// Столкновения тела с тайловой сеткой. Тело — любой объект с x, y, width, height
// и velocityX / velocityY: игрок, а на Этапе 3 и движущиеся платформы.

// Чтобы тело, стоящее вплотную к стене, не считалось залезшим в соседний тайл:
// координата 64 при тайле 32 принадлежит второму тайлу, а не третьему.
const EPSILON = 1e-6;

// Двигает тело по скорости и разбирает столкновения — сначала с тайловой сеткой,
// потом с подвижными коробками (движущимися платформами). Возвращает, чего тело
// коснулось на этом шаге: приземление, удар головой, упор в стену, а в
// `ground` — та самая коробка, если тело встало именно на неё.
//
// `world` — это { map, boxes }.
export function moveAndCollide(body, world, dt) {
  const contacts = { left: false, right: false, above: false, below: false, ground: null };
  const boxes = world.boxes ?? [];

  // Оси разбираются по очереди: сначала полностью решаем X, потом Y. Если двигать
  // обе сразу, угол тела и угол тайла пересекутся, и выталкивать его будет некуда —
  // непонятно, упёрлись мы в стену или встали на пол.
  body.x += body.velocityX * dt;
  resolveHorizontal(body, world.map, contacts);
  resolveHorizontalBoxes(body, boxes, contacts);

  body.y += body.velocityY * dt;
  resolveVertical(body, world.map, contacts);
  resolveVerticalBoxes(body, boxes, contacts);

  return contacts;
}

// Платформа может въехать в неподвижное тело сама — тогда направление
// выталкивания берём не по скорости тела, а по тому, с какой стороны оно
// торчит из коробки.
function resolveHorizontalBoxes(body, boxes, contacts) {
  for (const box of boxes) {
    if (!overlaps(body, box)) continue;

    const pushRight =
      body.velocityX < 0 ||
      (body.velocityX === 0 && body.x + body.width / 2 > box.x + box.width / 2);

    if (pushRight) {
      body.x = box.x + box.width;
      contacts.left = true;
    } else {
      body.x = box.x - body.width;
      contacts.right = true;
    }
    body.velocityX = 0;
  }
}

function resolveVerticalBoxes(body, boxes, contacts) {
  for (const box of boxes) {
    if (!overlaps(body, box)) continue;

    const landing =
      body.velocityY > 0 ||
      (body.velocityY === 0 && body.y + body.height / 2 < box.y + box.height / 2);

    if (landing) {
      body.y = box.y - body.height;
      contacts.below = true;
      contacts.ground = box;
    } else {
      body.y = box.y + box.height;
      contacts.above = true;
    }
    body.velocityY = 0;
  }
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
