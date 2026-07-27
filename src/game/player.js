import {
  TILE,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  RUN_ACCELERATION,
  RUN_MAX_SPEED,
  GROUND_FRICTION,
  AIR_FRICTION,
  AIR_CONTROL,
  GRAVITY,
  JUMP_SPEED,
  MAX_FALL_SPEED,
  FALL_OUT_MARGIN
} from '../engine/constants.js';

// Этап 1: движение и коллизии живут здесь целиком. На Этапе 2 разбор столкновений
// уедет в engine/physics.js, а сюда приедут coyote time, jump buffer и variable jump —
// то есть всё, что отвечает не за «куда», а за «как приятно».

// Чтобы игрок, стоящий вплотную к стене, не считался залезшим в соседний тайл.
const EPSILON = 1e-6;

export function createPlayer(spawn) {
  const [column, line] = spawn;
  const player = {
    x: column * TILE,
    y: line * TILE,
    // Позиция на прошлом шаге — рендер интерполирует между ней и текущей.
    previousX: column * TILE,
    previousY: line * TILE,
    velocityX: 0,
    velocityY: 0,
    onGround: false,
    facing: 1,
    spawnX: column * TILE,
    spawnY: line * TILE
  };
  return player;
}

export function updatePlayer(player, input, map, dt) {
  player.previousX = player.x;
  player.previousY = player.y;

  applyHorizontalControl(player, input, dt);
  applyJump(player, input);
  applyGravity(player, dt);

  // Оси разбираются по очереди: сначала полностью решаем X, потом Y. Если двигать
  // обе сразу, угол игрока и угол тайла пересекутся, и выталкивать его будет некуда.
  player.x += player.velocityX * dt;
  resolveHorizontal(player, map);

  player.y += player.velocityY * dt;
  player.onGround = false;
  resolveVertical(player, map);

  clampToLevel(player, map);
}

function applyHorizontalControl(player, input, dt) {
  const direction = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);

  if (direction !== 0) {
    const control = player.onGround ? 1 : AIR_CONTROL;
    player.velocityX += direction * RUN_ACCELERATION * control * dt;
    player.velocityX = Math.max(-RUN_MAX_SPEED, Math.min(RUN_MAX_SPEED, player.velocityX));
    player.facing = direction;
    return;
  }

  // Трение, а не мгновенная остановка: инерция читается как вес персонажа.
  const friction = (player.onGround ? GROUND_FRICTION : AIR_FRICTION) * dt;
  if (Math.abs(player.velocityX) <= friction) {
    player.velocityX = 0;
  } else {
    player.velocityX -= Math.sign(player.velocityX) * friction;
  }
}

function applyJump(player, input) {
  // Нажатие забираем всегда, даже в воздухе, иначе оно дождётся приземления
  // и сработает само собой. Осознанный буфер прыжка — это Этап 2.
  const wantsJump = input.consumePress('jump');
  if (wantsJump && player.onGround) {
    player.velocityY = -JUMP_SPEED;
    player.onGround = false;
  }
}

function applyGravity(player, dt) {
  player.velocityY = Math.min(player.velocityY + GRAVITY * dt, MAX_FALL_SPEED);
}

function resolveHorizontal(player, map) {
  if (player.velocityX === 0) return;

  const lineFrom = Math.floor(player.y / TILE);
  const lineTo = Math.floor((player.y + PLAYER_HEIGHT - EPSILON) / TILE);
  const columnFrom = Math.floor(player.x / TILE);
  const columnTo = Math.floor((player.x + PLAYER_WIDTH - EPSILON) / TILE);

  for (let line = lineFrom; line <= lineTo; line++) {
    for (let column = columnFrom; column <= columnTo; column++) {
      if (!map.isSolid(column, line)) continue;
      player.x = player.velocityX > 0 ? column * TILE - PLAYER_WIDTH : (column + 1) * TILE;
      player.velocityX = 0;
      return;
    }
  }
}

function resolveVertical(player, map) {
  if (player.velocityY === 0) return;

  const columnFrom = Math.floor(player.x / TILE);
  const columnTo = Math.floor((player.x + PLAYER_WIDTH - EPSILON) / TILE);
  const lineFrom = Math.floor(player.y / TILE);
  const lineTo = Math.floor((player.y + PLAYER_HEIGHT - EPSILON) / TILE);

  for (let column = columnFrom; column <= columnTo; column++) {
    for (let line = lineFrom; line <= lineTo; line++) {
      if (!map.isSolid(column, line)) continue;
      if (player.velocityY > 0) {
        player.y = line * TILE - PLAYER_HEIGHT;
        player.onGround = true;
      } else {
        player.y = (line + 1) * TILE;
      }
      player.velocityY = 0;
      return;
    }
  }
}

function clampToLevel(player, map) {
  player.x = Math.max(0, Math.min(map.widthPx - PLAYER_WIDTH, player.x));

  if (player.y > map.heightPx + FALL_OUT_MARGIN) {
    respawn(player);
  }
}

export function respawn(player) {
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.previousX = player.x;
  player.previousY = player.y;
  player.velocityX = 0;
  player.velocityY = 0;
  player.onGround = false;
}
