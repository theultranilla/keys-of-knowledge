import { overlaps } from '../engine/physics.js';
import { TILE, PALETTE } from '../engine/constants.js';

// Всё, что стоит на уровне и с чем игрок сталкивается. Модуль не знает про
// отрисовку и про счётчики: он только двигает платформы и сообщает событиями,
// чего игрок коснулся. Что это значит для жизней и ключей — решает main.js.

export const KEY_COLORS = {
  amber: PALETTE.amber,
  teal: PALETTE.teal,
  coral: PALETTE.coral
};

// Хитбоксы намеренно меньше тайла: монету приятнее собирать с запасом, а на
// шипе не должно убивать за касание уголком.
const COIN_SIZE = 16;
// Комета — движущийся шип. Хитбокс — маленькое ядро, а рисуется звезда крупнее:
// умираешь, когда влетел в тело, а не когда задел кончик луча или пустой угол
// прямоугольника вокруг звезды.
const HAZARD_HIT = 15;
const HAZARD_VISUAL = 24;
// У шипа то же расхождение: зубья рисуем почти во весь тайл, но убивает только
// центральная нижняя часть — там, где зубья сплошные, а не пустые углы коробки.
const SPIKE_HIT_INSET = 9;
const SPIKE_HIT_TOP = 18;
const SPIKE_VIS_INSET = 5;
const SPIKE_VIS_TOP = 13;
const CHEST_WIDTH = 26;
const CHEST_HEIGHT = 22;
const DOOR_WIDTH = 26;
const DOOR_HEIGHT = TILE * 2;
const FLAG_WIDTH = 18;
const FLAG_HEIGHT = 30;
const PLATFORM_HEIGHT = 12;
// Снаряд пушки: хитбокс меньше картинки, как у монет и комет — цепляет телом,
// а не пустым углом коробки.
const PROJECTILE_HIT = 14;
const CANNON_SIZE = 22;
// Враг: хитбокс. Топанье засчитывается, если ступни игрока вошли в верхнюю
// STOMP_MARGIN врага при падении — иначе это касание сбоку и смерть.
const ENEMY_W = 26;
const ENEMY_H = 24;
const STOMP_MARGIN = 14;
const ENEMY_DEATH_TIME = 0.22; // сколько «блин» лежит после топанья, прежде чем исчезнуть
// Финиш-флаг: тонкий столб, коснулся — уровень пройден. Чем выше коснулся, тем
// больше бонус — есть смысл заходить на флаг с разбегу/прыжка.
const FLAG_POLE_W = 12;
const FLAG_MAX_BONUS = 500;

const POWERUP_SIZE = 20;

export function createEntities(level) {
  const coins = [];
  const spikes = [];
  const checkpoints = [];
  const powerups = []; // звезда/щит/крылья — собираются касанием, как монеты
  const crumbles = []; // рушащиеся тайлы: твёрдые, пока на них не встанешь

  for (let line = 0; line < level.lines; line++) {
    for (let column = 0; column < level.columns; column++) {
      const x = column * TILE;
      const y = line * TILE;

      switch (level.tileAt(column, line)) {
        case 'coin':
          coins.push({
            x: x + (TILE - COIN_SIZE) / 2,
            y: y + (TILE - COIN_SIZE) / 2,
            width: COIN_SIZE,
            height: COIN_SIZE,
            // Фаза нужна, чтобы монеты покачивались вразнобой, а не строем.
            phase: (column * 7 + line * 13) % 100 / 100,
            taken: false
          });
          break;
        case 'spike':
          spikes.push({
            // Хитбокс — уже картинки: убивает центральная нижняя часть зубьев.
            x: x + SPIKE_HIT_INSET,
            y: y + SPIKE_HIT_TOP,
            width: TILE - SPIKE_HIT_INSET * 2,
            height: TILE - SPIKE_HIT_TOP,
            // Что рисуем — крупнее, во всю привычную ширину зубьев.
            drawX: x + SPIKE_VIS_INSET,
            drawY: y + SPIKE_VIS_TOP,
            drawWidth: TILE - SPIKE_VIS_INSET * 2,
            drawHeight: TILE - SPIKE_VIS_TOP,
            column,
            line
          });
          break;
        case 'checkpoint':
          checkpoints.push({
            column,
            line,
            x: x + (TILE - FLAG_WIDTH) / 2,
            y: y + TILE - FLAG_HEIGHT,
            width: FLAG_WIDTH,
            height: FLAG_HEIGHT,
            active: false
          });
          break;
        case 'star':
        case 'shield':
        case 'wing':
          powerups.push({
            x: x + (TILE - POWERUP_SIZE) / 2,
            y: y + (TILE - POWERUP_SIZE) / 2,
            width: POWERUP_SIZE,
            height: POWERUP_SIZE,
            kind: level.tileAt(column, line),
            phase: (column * 5 + line * 11) % 100 / 100,
            taken: false
          });
          break;
        case 'crumble':
          // Твёрдый блок с состоянием: solid → shaking (на нём стоят) → gone.
          crumbles.push({ x, y, width: TILE, height: TILE, deltaX: 0, deltaY: 0, crumble: true, state: 'solid', timer: 0 });
          break;
        default:
          break;
      }
    }
  }

  const chests = level.chests.map((entry) => ({
    ...entry,
    column: entry.at[0],
    line: entry.at[1],
    x: entry.at[0] * TILE + (TILE - CHEST_WIDTH) / 2,
    y: entry.at[1] * TILE + TILE - CHEST_HEIGHT,
    width: CHEST_WIDTH,
    height: CHEST_HEIGHT,
    opened: false
  }));

  // Дверь стоит на своём тайле и уходит на два тайла вверх — так она читается
  // как дверь, а не как люк в полу.
  const doors = level.doors.map((entry) => ({
    ...entry,
    column: entry.at[0],
    line: entry.at[1],
    x: entry.at[0] * TILE + (TILE - DOOR_WIDTH) / 2,
    y: (entry.at[1] + 1) * TILE - DOOR_HEIGHT,
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
    // Дверь неподвижна, но физика разбирает её тем же кодом, что и платформы,
    // а он читает смещение за шаг. Без этих нулей игрок, вставший на дверь,
    // сдвинулся бы на undefined.
    deltaX: 0,
    deltaY: 0,
    exit: Boolean(entry.exit),
    opened: false
  }));

  const platforms = level.platforms.map((entry) => {
    const width = entry.tiles * TILE;
    const fromX = entry.from[0] * TILE;
    const fromY = entry.from[1] * TILE;
    return {
      x: fromX,
      y: fromY,
      previousX: fromX,
      previousY: fromY,
      // Смещение за шаг — по нему игрок едет вместе с платформой.
      deltaX: 0,
      deltaY: 0,
      width,
      height: PLATFORM_HEIGHT,
      fromX,
      fromY,
      toX: entry.to[0] * TILE,
      toY: entry.to[1] * TILE,
      speed: entry.speed,
      forward: true
    };
  });

  // Кометы бывают двух повадок. По умолчанию `patrol` — ходят «туда-обратно» тем
  // же движком, что и платформы (movePlatform). При `mode: "fall"` — падают из
  // from в to в одну сторону и, дойдя, мгновенно возвращаются в начало: так с неба
  // сыплется поток. Общего с платформой у обеих: не твёрдые и убивают касанием.
  const hazards = (level.hazards ?? []).map((entry) => {
    const mode = entry.mode === 'fall' ? 'fall' : 'patrol';
    const fromX = entry.from[0] * TILE + (TILE - HAZARD_HIT) / 2;
    const fromY = entry.from[1] * TILE + (TILE - HAZARD_HIT) / 2;
    const toX = entry.to[0] * TILE + (TILE - HAZARD_HIT) / 2;
    const toY = entry.to[1] * TILE + (TILE - HAZARD_HIT) / 2;
    const span = Math.hypot(toX - fromX, toY - fromY) || 1;
    // phase (0..1) сдвигает старт вдоль траектории: дождь комет летит вразнобой,
    // а не одной стенкой.
    const progress = ((((entry.phase ?? 0) % 1) + 1) % 1);
    return {
      mode,
      x: fromX + (toX - fromX) * progress,
      y: fromY + (toY - fromY) * progress,
      previousX: fromX + (toX - fromX) * progress,
      previousY: fromY + (toY - fromY) * progress,
      deltaX: 0,
      deltaY: 0,
      width: HAZARD_HIT,
      height: HAZARD_HIT,
      // Рисуется крупнее хитбокса — лучи звезды выходят за пределы опасной зоны.
      visualRadius: HAZARD_VISUAL / 2,
      fromX,
      fromY,
      toX,
      toY,
      span,
      travel: progress * span,
      speed: entry.speed,
      forward: true,
      // Собственный сдвиг вращения, чтобы кометы крутились вразнобой.
      spinOffset: (((entry.from[0] * 7 + entry.from[1] * 13) % 100) / 100) * Math.PI * 2
    };
  });

  // Пушки: стоят на месте и раз в interval выпускают снаряд вбок (dir). Снаряд
  // летит по прямой, убивает касанием и исчезает за краем уровня.
  const cannons = (level.cannons ?? []).map((entry) => ({
    column: entry.at[0],
    line: entry.at[1],
    x: entry.at[0] * TILE + (TILE - CANNON_SIZE) / 2,
    y: entry.at[1] * TILE + (TILE - CANNON_SIZE) / 2,
    width: CANNON_SIZE,
    height: CANNON_SIZE,
    dir: entry.dir ?? 0,
    diry: entry.diry ?? 0, // 0 — горизонтальная, -1 вверх, 1 вниз
    speed: entry.speed,
    interval: entry.interval,
    kind: entry.kind === 'bullet' ? 'bullet' : 'ball',
    // phase (0..1) — задержка первого выстрела в долях интервала: 0 — сразу,
    // 0.5 — через полцикла. Разные phase = пушки палят вразнобой, а не залпом.
    timer: (((((entry.phase ?? 0) % 1) + 1) % 1)) * entry.interval
  }));
  const projectiles = [];

  // Враги патрулируют между from и to тем же движком, что платформы (movePlatform).
  // walker стоит на полу своей строки, flyer парит по центру тайла (from→to может
  // быть и диагональю). Не твёрдые: игрок проходит сквозь, но касание решает всё.
  const enemies = (level.enemies ?? []).map((entry) => {
    const kind = entry.kind === 'flyer' ? 'flyer' : 'walker';
    const offY = kind === 'walker' ? TILE - ENEMY_H : (TILE - ENEMY_H) / 2;
    const fromX = entry.from[0] * TILE + (TILE - ENEMY_W) / 2;
    const toX = entry.to[0] * TILE + (TILE - ENEMY_W) / 2;
    const fromY = entry.from[1] * TILE + offY;
    const toY = entry.to[1] * TILE + offY;
    return {
      kind, x: fromX, y: fromY, previousX: fromX, previousY: fromY, deltaX: 0, deltaY: 0,
      width: ENEMY_W, height: ENEMY_H, fromX, fromY, toX, toY, speed: entry.speed, forward: true,
      dead: false, deadTimer: 0
    };
  });

  // Финиш-флаг (если есть): столб от пола вверх на height тайлов. Хитбокс — узкая
  // вертикаль, коснулся в любом месте — засчитано.
  const flag = level.flag ? buildFlag(level.flag) : null;

  // Запертая дверь перегораживает проход. Открытая перестаёт быть препятствием,
  // поэтому уходит из этого списка. Рушащийся тайл тоже твёрдый, пока не осыпался.
  const solid = [...platforms, ...doors, ...crumbles];

  function update(dt) {
    for (const platform of platforms) {
      movePlatform(platform, dt);
    }
    for (const hazard of hazards) {
      if (hazard.mode === 'fall') moveFalling(hazard, dt);
      else movePlatform(hazard, dt);
    }
    for (const cannon of cannons) {
      cannon.timer -= dt;
      if (cannon.timer <= 0) {
        cannon.timer += cannon.interval;
        const cx = cannon.x + cannon.width / 2, cy = cannon.y + cannon.height / 2;
        projectiles.push({
          x: cx - PROJECTILE_HIT / 2, y: cy - PROJECTILE_HIT / 2,
          width: PROJECTILE_HIT, height: PROJECTILE_HIT,
          vx: cannon.dir * cannon.speed, vy: cannon.diry * cannon.speed, kind: cannon.kind
        });
      }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -TILE || p.x > level.widthPx + TILE || p.y < -TILE || p.y > level.heightPx + TILE) {
        projectiles.splice(i, 1); // улетел за край
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (enemy.dead) { enemy.deadTimer -= dt; if (enemy.deadTimer <= 0) enemies.splice(i, 1); continue; }
      movePlatform(enemy, dt);
    }
    for (const crumble of crumbles) {
      if (crumble.state !== 'shaking') continue;
      crumble.timer -= dt;
      if (crumble.timer <= 0) { // осыпался — убираем из твёрдых, игрок проваливается
        crumble.state = 'gone';
        const idx = solid.indexOf(crumble);
        if (idx !== -1) solid.splice(idx, 1);
      }
    }
    for (const coin of coins) {
      coin.phase = (coin.phase + dt * 0.6) % 1;
    }
  }

  // Собирает всё, чего игрок коснулся на этом шаге. Возвращает список событий:
  // порядок в нём — порядок, в котором они случились.
  function collide(player, keys) {
    const events = [];

    for (const coin of coins) {
      if (coin.taken || !overlaps(player, coin)) continue;
      coin.taken = true;
      events.push({ type: 'coin', coin });
    }

    for (const checkpoint of checkpoints) {
      if (checkpoint.active || !overlaps(player, checkpoint)) continue;
      checkpoint.active = true;
      events.push({ type: 'checkpoint', checkpoint });
    }

    for (const pu of powerups) {
      if (pu.taken || !overlaps(player, pu)) continue;
      pu.taken = true;
      events.push({ type: 'powerup', kind: pu.kind });
    }

    // Шип и комета убивают одинаково — событие одно и то же. Одной смерти за шаг
    // достаточно, поэтому как только нашли — выходим.
    let died = false;
    for (const spike of spikes) {
      if (!overlaps(player, spike)) continue;
      events.push({ type: 'spike', spike });
      died = true;
      break;
    }
    if (!died) {
      for (const hazard of hazards) {
        if (!overlaps(player, hazard)) continue;
        events.push({ type: 'spike', spike: hazard });
        died = true;
        break;
      }
    }
    if (!died) {
      for (const projectile of projectiles) {
        if (!overlaps(player, projectile)) continue;
        events.push({ type: 'spike', spike: projectile }); // снаряд убивает как шип
        died = true;
        break;
      }
    }
    // Враг: прыжок на голову (падаешь И ступни вошли в верх врага) убивает его с
    // отскоком; любое другое касание убивает игрока. Топанье приоритетнее.
    if (!died) {
      let stomped = null, sideHit = null;
      for (const enemy of enemies) {
        if (enemy.dead || !overlaps(player, enemy)) continue;
        const fromAbove = player.velocityY > 0 && (player.y + player.height) - enemy.y < STOMP_MARGIN;
        if (fromAbove) { if (!stomped) stomped = enemy; }
        else if (!sideHit) sideHit = enemy;
      }
      if (stomped) {
        stomped.dead = true;
        stomped.deadTimer = ENEMY_DEATH_TIME;
        events.push({ type: 'stomp', enemy: stomped });
      } else if (sideHit) {
        events.push({ type: 'spike', spike: sideHit });
      }
    }

    // Финиш-флаг: коснулся столба — уровень пройден. Бонус тем больше, чем выше
    // точка касания (по центру игрока относительно высоты столба).
    if (flag && !flag.reached && overlaps(player, flag)) {
      flag.reached = true;
      const touchY = player.y + player.height / 2;
      const frac = Math.max(0, Math.min(1, (flag.baseY - touchY) / flag.poleHeight));
      events.push({ type: 'goal', bonus: Math.round(frac * FLAG_MAX_BONUS) });
    }

    // Запертая дверь твёрдая, поэтому «коснуться» её можно только вплотную —
    // проверяем чуть расширенный прямоугольник игрока, иначе касание не
    // засчитывается никогда.
    const reach = { x: player.x - 2, y: player.y - 2, width: player.width + 4, height: player.height + 4 };
    for (const door of doors) {
      if (door.opened || !overlaps(reach, door)) continue;
      if (keys.has(door.keyColor)) {
        door.opened = true;
        const index = solid.indexOf(door);
        if (index !== -1) solid.splice(index, 1);
        events.push({ type: 'door-opened', door });
      } else {
        events.push({ type: 'door-locked', door });
      }
    }

    return events;
  }

  // Сундук открывается по кнопке, а не касанием: иначе игрок влетал бы в задачу
  // на бегу, не поняв, что произошло.
  function chestInReach(player) {
    return chests.find((chest) => !chest.opened && overlaps(player, chest)) ?? null;
  }

  return {
    coins,
    spikes,
    hazards,
    cannons,
    projectiles,
    enemies,
    flag,
    powerups,
    crumbles,
    checkpoints,
    chests,
    doors,
    platforms,
    update,
    collide,
    chestInReach,
    // Платформы и запертые двери твёрдые: физика игрока разбирает их наравне
    // с тайлами. Список живой — открывшаяся дверь из него уходит.
    get solidBoxes() {
      return solid;
    }
  };
}

// Падающая комета: летит из from в to в одну сторону, дойдя до конца — мгновенно
// в начало. Хвост считаем по заданному направлению, а не по разнице позиций,
// иначе в кадре возврата он на миг смотрел бы вверх.
function moveFalling(hazard, dt) {
  hazard.previousX = hazard.x;
  hazard.previousY = hazard.y;

  hazard.travel = (hazard.travel + hazard.speed * dt) % hazard.span;
  const progress = hazard.travel / hazard.span;
  hazard.x = hazard.fromX + (hazard.toX - hazard.fromX) * progress;
  hazard.y = hazard.fromY + (hazard.toY - hazard.fromY) * progress;

  hazard.deltaX = ((hazard.toX - hazard.fromX) / hazard.span) * hazard.speed * dt;
  hazard.deltaY = ((hazard.toY - hazard.fromY) / hazard.span) * hazard.speed * dt;
}

function buildFlag(entry) {
  const [column, line] = entry.at;
  const poleTiles = entry.height ?? 6;
  const baseY = (line + 1) * TILE;          // низ столба — на уровне пола
  const poleHeight = poleTiles * TILE;
  const topY = baseY - poleHeight;
  return {
    column, line,
    x: column * TILE + (TILE - FLAG_POLE_W) / 2,
    y: topY, baseY, topY, poleHeight,
    width: FLAG_POLE_W, height: poleHeight,
    reached: false
  };
}

function movePlatform(platform, dt) {
  platform.previousX = platform.x;
  platform.previousY = platform.y;

  const targetX = platform.forward ? platform.toX : platform.fromX;
  const targetY = platform.forward ? platform.toY : platform.fromY;
  const dx = targetX - platform.x;
  const dy = targetY - platform.y;
  const distance = Math.hypot(dx, dy);
  const step = platform.speed * dt;

  if (distance <= step || distance === 0) {
    // Дошли до конца — встаём точно в точку и разворачиваемся. Без «точно»
    // платформа за сотни циклов уползла бы от заданных координат.
    platform.x = targetX;
    platform.y = targetY;
    platform.forward = !platform.forward;
  } else {
    platform.x += (dx / distance) * step;
    platform.y += (dy / distance) * step;
  }

  platform.deltaX = platform.x - platform.previousX;
  platform.deltaY = platform.y - platform.previousY;
}
