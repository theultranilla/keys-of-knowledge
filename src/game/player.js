import { moveAndCollide } from '../engine/physics.js';
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
  FALL_GRAVITY_MULTIPLIER,
  JUMP_CUT_MULTIPLIER,
  MAX_FALL_SPEED,
  SPRING_SPEED,
  COYOTE_TIME,
  JUMP_BUFFER_TIME,
  FALL_OUT_MARGIN,
  POP_DURATION
} from '../engine/constants.js';

// Игрок отвечает за «как ощущается»: намерение из ввода превращается в скорость,
// а разбором столкновений занимается engine/physics.js.

export function createPlayer(spawn) {
  const [column, line] = spawn;
  return {
    x: column * TILE,
    y: line * TILE,
    // Позиция на прошлом шаге — рендер интерполирует между ней и текущей.
    previousX: column * TILE,
    previousY: line * TILE,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocityX: 0,
    velocityY: 0,
    onGround: false,
    facing: 1,
    // Окно, в котором прыжок ещё засчитывается после схода с платформы.
    coyoteTimer: 0,
    // Нажатие, сделанное чуть раньше приземления, ждёт своего момента здесь.
    jumpBufferTimer: 0,
    // Прыжок в подъёме и кнопку ещё не отпускали — только такой можно подрезать.
    isJumping: false,
    respawnX: column * TILE,
    respawnY: line * TILE,
    // Пока больше нуля — игрок лопнут: не рисуется, не управляется, ждёт возврата.
    popTimer: 0,
    // Платформа, на которой игрок стоит прямо сейчас. Пока она есть — он едет.
    ridingPlatform: null,
    // Считаем падения: на Этапе 3 из этого вырастут жизни и HUD.
    falls: 0
  };
}

// Возвращает, чем кончился шаг: `null` — ничего особенного, `'popped'` — хлопок
// доиграл и игрок вернулся на чекпоинт, `'fell'` — улетел за нижнюю границу.
// Разница важна: падение стоит жизни, а добровольный хлопок — нет.
export function updatePlayer(player, input, world, dt) {
  player.previousX = player.x;
  player.previousY = player.y;
  player.jumpedNow = false;
  player.sprungNow = false;

  if (player.popTimer > 0) {
    // Физики на время хлопка нет: осколки летят сами по себе, а игрок ждёт.
    player.popTimer = Math.max(0, player.popTimer - dt);
    if (player.popTimer > 0) return null;
    respawn(player);
    return 'popped';
  }

  updateTimers(player, input, dt);
  applyHorizontalControl(player, input, dt);
  tryJump(player);
  applyJumpCut(player, input);
  applyGravity(player, dt);

  // Игрок едет на платформе: сдвигаем его на её смещение до собственного
  // движения, иначе она уезжает из-под ног, а он остаётся висеть на месте.
  if (player.ridingPlatform) {
    player.x += player.ridingPlatform.deltaX;
    player.y += player.ridingPlatform.deltaY;
  }

  const contacts = moveAndCollide(player, world, dt);
  player.onGround = contacts.below;
  player.ridingPlatform = contacts.ground;
  if (contacts.below) player.isJumping = false;

  // Приземлился сверху на батут — фиксированный отскок вверх. Проверяем тайл под
  // ногами, а не коробку: батут — это тайл сетки, а не движущаяся платформа.
  // Логика живёт здесь, а не в physics.js, потому что это про «ощущение», а не
  // про разбор столкновений; аудитор гоняет тот же updatePlayer и отскок наследует.
  if (contacts.below && standingOnSpring(player, world.map)) {
    player.velocityY = -SPRING_SPEED;
    player.onGround = false;
    player.isJumping = false; // подброс не подрезается кнопкой — высота предсказуема
    player.ridingPlatform = null;
    player.sprungNow = true; // флажок на один шаг: сессия щёлкнет звуком
  }

  return clampToLevel(player, world.map) ? 'fell' : null;
}

// Стоит ли игрок на батуте. Проверяем тайл под ЦЕНТРОМ игрока, а не под всей
// шириной: иначе батут срабатывал, стоило краем заехать на соседний тайл-пружину,
// хотя игрок на неё и не вставал — «огромный радиус». После приземления ступни
// ровно на верхе тайла, поэтому его строка — round((низ игрока) / TILE).
function standingOnSpring(player, map) {
  const line = Math.round((player.y + player.height) / TILE);
  const column = Math.floor((player.x + player.width / 2) / TILE);
  return map.tileAt(column, line) === 'spring';
}

function updateTimers(player, input, dt) {
  // На земле окно всё время полное, в воздухе — тает.
  player.coyoteTimer = player.onGround ? COYOTE_TIME : Math.max(0, player.coyoteTimer - dt);

  if (input.consumePress('jump')) {
    player.jumpBufferTimer = JUMP_BUFFER_TIME;
  } else {
    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
  }
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

function tryJump(player) {
  if (player.jumpBufferTimer <= 0 || player.coyoteTimer <= 0) return;

  player.velocityY = -JUMP_SPEED;
  player.isJumping = true;
  // Флажок на один шаг: по нему сессия понимает, что пора щёлкнуть звуком.
  player.jumpedNow = true;
  player.onGround = false;
  // Оба окна закрываем сразу, иначе одно нажатие успеет отработать дважды:
  // сначала как буфер, а через кадр — ещё раз внутри койот-времени.
  player.jumpBufferTimer = 0;
  player.coyoteTimer = 0;
}

function applyJumpCut(player, input) {
  if (!player.isJumping || player.velocityY >= 0) return;
  if (input.isDown('jump')) return;

  player.velocityY *= JUMP_CUT_MULTIPLIER;
  // Подрезаем один раз за прыжок: иначе каждый следующий кадр делил бы скорость
  // ещё вдвое и подъём обрывался бы мгновенно.
  player.isJumping = false;
}

function applyGravity(player, dt) {
  const gravity = player.velocityY > 0 ? GRAVITY * FALL_GRAVITY_MULTIPLIER : GRAVITY;
  player.velocityY = Math.min(player.velocityY + gravity * dt, MAX_FALL_SPEED);
}

// Возвращает true, если игрок улетел за нижнюю границу и был возвращён на чекпоинт.
function clampToLevel(player, map) {
  player.x = Math.max(0, Math.min(map.widthPx - player.width, player.x));

  if (player.y <= map.heightPx + FALL_OUT_MARGIN) return false;

  player.falls += 1;
  respawn(player);
  return true;
}

// Запускает хлопок. Возвращает false, если игрок уже лопнут — тогда сыпать
// осколки второй раз не нужно.
export function startPop(player) {
  if (player.popTimer > 0) return false;

  player.popTimer = POP_DURATION;
  player.velocityX = 0;
  player.velocityY = 0;
  return true;
}

export function respawn(player) {
  player.x = player.respawnX;
  player.y = player.respawnY;
  player.previousX = player.x;
  player.previousY = player.y;
  player.velocityX = 0;
  player.velocityY = 0;
  player.onGround = false;
  player.coyoteTimer = 0;
  player.jumpBufferTimer = 0;
  player.isJumping = false;
  player.popTimer = 0;
  player.ridingPlatform = null;
}
