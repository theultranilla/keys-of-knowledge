import { allWalls, roomInterior } from './dungeonFloor.js';
import { PALETTE } from '../engine/constants.js';

// Бой данжа: враги трёх видов, снаряды игрока и врагов-стрелков. Владеет своими
// массивами и обновляет их; про игрока/этаж/награды знает через параметры и колбэки
// (hitPlayer — урон игроку, onClear — комната зачищена, onEnemyHit — искры-полировка).
// Числа геймплея — на ощупь, крутить можно.

// Оружие игрока: у каждого свой характер (скорострельность, урон, число дробин,
// разброс, скорость/размер снаряда). Имена — контент, живут в данных. Числа на ощупь.
export const WEAPONS = {
  spark:  { name: 'Искра',      fireCd: 0.14, dmg: 1,   pellets: 1, spread: 0,    speed: 560, r: 5, life: 1.1 },
  spread: { name: 'Тройка',     fireCd: 0.34, dmg: 1,   pellets: 3, spread: 0.22, speed: 520, r: 5, life: 0.9 },
  rapid:  { name: 'Скорострел', fireCd: 0.07, dmg: 0.6, pellets: 1, spread: 0.05, speed: 640, r: 4, life: 0.9 },
  heavy:  { name: 'Тяжёлая',    fireCd: 0.5,  dmg: 3,   pellets: 1, spread: 0,    speed: 480, r: 9, life: 1.3 }
};
export const WEAPON_DROPS = ['spread', 'rapid', 'heavy']; // что может выпасть (кроме стартовой «Искры»)
const ENEMY_SPEED = 95, ENEMY_HP = 3, ENEMY_R = 15, HIT_FLASH = 0.08, CONTACT_DMG = 1;
const BOSS_R = 30, BOSS_SPEED = 60, BOSS_BURST_CD = 2.2, BOSS_BURST_N = 10;
// Босс-таранщик: подбирается, телеграфирует, делает быстрый рывок в игрока.
const CHARGE_CD = 1.4, CHARGE_WIND = 0.5, CHARGE_DASH = 0.45, CHARGE_SPEED = 360;
const CHARGER_COLOR = '#d1552b';
const SHOOTER_RANGE = 250, SHOOTER_FIRE_CD = 1.3, SHOOTER_SPEED = 70;
const TANK_R = 26, TANK_HP = 9, TANK_SPEED = 45;
const ESHOT_SPEED = 280, ESHOT_R = 6, ESHOT_LIFE = 2.4, ESHOT_DMG = 1;
const ENEMY_COLOR = { chaser: PALETTE.coral, shooter: '#f0a04b', tank: '#8a3a52', boss: '#b0343f' };
// Отдача от попаданий: скорость толчка и затухание за кадр, плюс «масса» по типу
// (танк тяжёлый, босс не сдвигается) — чтобы удар ощущался, но не ломал бой.
const KB_STRENGTH = 230, KB_DECAY = 0.85;
const KB_MASS = { chaser: 1, shooter: 1, tank: 0.35, boss: 0 };
// Нова знаний (расходник): урон всем врагам в комнате + сильный отброс от центра.
const NOVA_DMG = 6, NOVA_KB = 420;
// Кривая сложности по этажам (подобрано на ощупь, крутится безопасно). Этаж 1 —
// нулевая надбавка: раннее прохождение остаётся мягким.
const ENEMY_CAP = 12;                       // потолок числа врагов в комнате
const RAMP_HP = 0.12;                       // +12% HP за каждый этаж после первого
const RAMP_SPEED = 0.04, SPEED_CAP = 1.4;   // прирост скорости и его потолок
// Элитные враги: редкие крупные с этажа 3, крепче и медленнее, роняют монету.
const ELITE_FLOOR = 3, ELITE_CHANCE = 0.12;
const ELITE_HP_MUL = 2.2, ELITE_R_MUL = 1.5, ELITE_SLOW = 0.85;
const MINI_R = 24, MINI_COLOR = '#c77dff'; // мини-босс: между рядовым врагом и боссом этажа

export function createCombat({ audio, hitPlayer, onClear, onEnemyHit }) {
  const shots = [], eShots = [];

  function reset() { shots.length = 0; eShots.length = 0; }

  function spawnEnemies(room, floorNumber) {
    if (room.kind === 'boss') {
      // Чередуем типы боссов по этажам: нечётные — стрелок, чётные — таранщик.
      const variant = floorNumber % 2 === 0 ? 'charger' : 'gunner';
      room.enemies.push(makeEnemy(room.cx, room.cy - 60, 'boss', floorNumber, false, variant));
      return;
    }
    const it = roomInterior(room);
    if (room.mini) { // логово: усиленный враг с паттерном босса + пара миньонов
      const variant = Math.random() < 0.5 ? 'charger' : 'gunner';
      const mb = makeEnemy(room.cx, room.cy - 40, 'boss', floorNumber, false, variant);
      mb.mini = true; mb.r = MINI_R; mb.hp = mb.maxHp = ENEMY_HP * 4 + floorNumber * 2; // слабее финального босса
      room.enemies.push(mb);
      const minions = 2 + (floorNumber >= 5 ? 1 : 0);
      for (let i = 0; i < minions; i++) {
        room.enemies.push(makeEnemy(rand(it.x0 + 30, it.x1 - 30), rand(it.y0 + 30, it.y1 - 30), pickKind(floorNumber), floorNumber));
      }
      return;
    }
    const n = Math.min(ENEMY_CAP, 4 + floorNumber); // с потолком, иначе глубокие этажи — каша
    for (let i = 0; i < n; i++) {
      const elite = floorNumber >= ELITE_FLOOR && Math.random() < ELITE_CHANCE;
      room.enemies.push(makeEnemy(rand(it.x0 + 30, it.x1 - 30), rand(it.y0 + 30, it.y1 - 30), pickKind(floorNumber), floorNumber, elite));
    }
  }

  function fire(cx, cy, aim, weaponId) {
    const w = WEAPONS[weaponId] || WEAPONS.spark;
    const base = Math.atan2(aim.y, aim.x);
    for (let k = 0; k < w.pellets; k++) {
      const a = base + (k - (w.pellets - 1) / 2) * w.spread; // веером вокруг прицела
      const dx = Math.cos(a), dy = Math.sin(a);
      shots.push({ x: cx + dx * 20, y: cy + dy * 20, vx: dx * w.speed, vy: dy * w.speed, life: w.life, dmg: w.dmg, r: w.r });
    }
    audio?.play?.('shoot');
  }

  // Разрядка «Новы»: бьёт всех живых врагов комнаты и расшвыривает их от центра.
  // Смерти обработает следующий тик update (там же зачистка комнаты и дроп).
  function nova(current, cx, cy) {
    for (const e of current.enemies) {
      if (e.hp <= 0) continue;
      e.hp -= NOVA_DMG;
      e.hitFlash = HIT_FLASH;
      const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy) || 1, m = KB_MASS[e.kind] ?? 1;
      e.knockX += (dx / d) * NOVA_KB * m;
      e.knockY += (dy / d) * NOVA_KB * m;
    }
    audio?.play?.('nova');
  }

  // Поведение босса по варианту. Стрелок (gunner) медленно идёт и бьёт радиальным
  // залпом; таранщик (charger) подбирается, замирает-целится (телеграф) и делает
  // быстрый рывок в зафиксированную точку — уклоняться надо вбок, а не назад.
  function bossBehavior(e, dt, nx, ny) {
    if (e.variant === 'charger') {
      e.chargeTimer -= dt;
      if (e.chargeState === 'dash') {
        e.x += e.chargeDir.x * CHARGE_SPEED * dt;
        e.y += e.chargeDir.y * CHARGE_SPEED * dt;
        if (e.chargeTimer <= 0) { e.chargeState = 'idle'; e.chargeTimer = CHARGE_CD; }
      } else if (e.chargeState === 'wind') {
        // конец завода — фиксируем направление рывка на текущего игрока
        if (e.chargeTimer <= 0) { e.chargeState = 'dash'; e.chargeTimer = CHARGE_DASH; e.chargeDir = { x: nx, y: ny }; audio?.play?.('bossShot'); }
      } else {
        e.x += nx * e.speed * 0.5 * dt; e.y += ny * e.speed * 0.5 * dt;
        if (e.chargeTimer <= 0) { e.chargeState = 'wind'; e.chargeTimer = CHARGE_WIND; }
      }
      return;
    }
    // gunner
    e.x += nx * e.speed * dt; e.y += ny * e.speed * dt;
    e.burstCd -= dt;
    if (e.burstCd <= 0) {
      for (let k = 0; k < BOSS_BURST_N; k++) {
        const a = (k / BOSS_BURST_N) * Math.PI * 2 + e.burstAngle;
        eShots.push({ x: e.x, y: e.y, vx: Math.cos(a) * ESHOT_SPEED, vy: Math.sin(a) * ESHOT_SPEED, life: ESHOT_LIFE });
      }
      e.burstAngle += 0.4;
      e.burstCd = BOSS_BURST_CD;
      audio?.play?.('bossShot');
    }
  }

  // pc — центр игрока {x,y}; half — половина ширины игрока; dmgMul — множитель урона.
  function update(dt, floor, current, pc, dmgMul, half) {
    const walls = allWalls(floor);

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      let dead = s.life <= 0 || walls.some((r) => s.x > r.x && s.x < r.x + r.w && s.y > r.y && s.y < r.y + r.h);
      if (!dead) for (const e of current.enemies) {
        if (e.hp > 0 && Math.hypot(s.x - e.x, s.y - e.y) < e.r + s.r) {
          e.hp -= s.dmg * dmgMul; e.hitFlash = HIT_FLASH; dead = true;
          const sl = Math.hypot(s.vx, s.vy) || 1, m = KB_MASS[e.kind] ?? 1;
          e.knockX += (s.vx / sl) * KB_STRENGTH * m; // толчок по ходу пули
          e.knockY += (s.vy / sl) * KB_STRENGTH * m;
          audio?.play?.('enemyHit'); onEnemyHit?.(s.x, s.y, false, false); break;
        }
      }
      if (dead) shots.splice(i, 1);
    }

    for (let i = eShots.length - 1; i >= 0; i--) {
      const s = eShots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      let dead = s.life <= 0 || walls.some((r) => s.x > r.x && s.x < r.x + r.w && s.y > r.y && s.y < r.y + r.h);
      if (!dead && Math.hypot(s.x - pc.x, s.y - pc.y) < ESHOT_R + half) { dead = true; if (hitPlayer(ESHOT_DMG)) return; }
      if (dead) eShots.splice(i, 1);
    }

    if (!current.spawned || current.cleared) return;
    // Бой всегда в запертой комнате — держим врагов внутри её интерьера, иначе
    // они, не проверяя стены, уходят сквозь них наружу.
    const it = roomInterior(current);
    for (let i = current.enemies.length - 1; i >= 0; i--) {
      const e = current.enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.hp <= 0) { current.enemies.splice(i, 1); audio?.play?.('enemyDie'); onEnemyHit?.(e.x, e.y, true, e.elite); continue; }
      const dx = pc.x - e.x, dy = pc.y - e.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
      if (e.kind === 'shooter') {
        if (d > SHOOTER_RANGE + 30) { e.x += nx * e.speed * dt; e.y += ny * e.speed * dt; }
        else if (d < SHOOTER_RANGE - 30) { e.x -= nx * e.speed * dt; e.y -= ny * e.speed * dt; }
        e.fireCd -= dt;
        if (e.fireCd <= 0) { eShots.push({ x: e.x, y: e.y, vx: nx * ESHOT_SPEED, vy: ny * ESHOT_SPEED, life: ESHOT_LIFE }); e.fireCd = SHOOTER_FIRE_CD; }
      } else if (e.kind === 'boss') {
        bossBehavior(e, dt, nx, ny);
      } else { e.x += nx * e.speed * dt; e.y += ny * e.speed * dt; }
      // Отдача от попаданий поверх обычного движения, с затуханием.
      if (e.knockX || e.knockY) {
        e.x += e.knockX * dt; e.y += e.knockY * dt;
        e.knockX *= KB_DECAY; e.knockY *= KB_DECAY;
      }
      e.x = Math.max(it.x0 + e.r, Math.min(it.x1 - e.r, e.x));
      e.y = Math.max(it.y0 + e.r, Math.min(it.y1 - e.r, e.y));
      if (d < e.r + half && hitPlayer(CONTACT_DMG)) return;
    }
    if (current.enemies.length === 0) { current.cleared = true; current.doorsClosed = false; onClear(current); }
  }

  function draw(ctx, current) {
    for (const e of current.enemies) {
      const charger = e.kind === 'boss' && e.variant === 'charger';
      let col = charger ? CHARGER_COLOR : (ENEMY_COLOR[e.kind] ?? PALETTE.coral);
      if (e.mini) col = MINI_COLOR; // мини-босс — свой цвет
      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : col;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      if (e.elite) { // золотое кольцо — сразу видно, что враг опасный и с монетой
        ctx.strokeStyle = '#f6d24d'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3, 0, Math.PI * 2); ctx.stroke();
      }
      if (charger && e.chargeState === 'wind') { // телеграф рывка — уходи вбок
        ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.fillStyle = '#ff8a4b';
    for (const s of eShots) { ctx.beginPath(); ctx.arc(s.x, s.y, ESHOT_R, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = PALETTE.chalk;
    for (const s of shots) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
  }

  return { reset, spawnEnemies, fire, nova, update, draw };
}

// Глубже — меньше простых преследователей, больше стрелков и танков.
function pickKind(floorNumber) {
  const roll = Math.random();
  const shooterP = Math.min(0.42, 0.22 + floorNumber * 0.03);
  const tankP = floorNumber >= 2 ? Math.min(0.28, 0.08 + floorNumber * 0.03) : 0;
  if (roll < shooterP) return 'shooter';
  if (roll < shooterP + tankP) return 'tank';
  return 'chaser';
}

function makeEnemy(x, y, kind, floorNumber, elite = false, variant = 'gunner') {
  // Босс живёт по своей формуле HP и не попадает под общий множитель этажа.
  if (kind === 'boss') {
    const hp = ENEMY_HP * 6 + floorNumber * 4;
    return {
      x, y, r: BOSS_R, hp, maxHp: hp, speed: BOSS_SPEED, kind, variant, elite: false, hitFlash: 0,
      knockX: 0, knockY: 0, fireCd: 0, burstCd: BOSS_BURST_CD, burstAngle: 0,
      chargeState: 'idle', chargeTimer: CHARGE_CD, chargeDir: { x: 0, y: 0 }
    };
  }
  let r = ENEMY_R, hp = ENEMY_HP, speed = ENEMY_SPEED;
  if (kind === 'shooter') { r = 14; hp = 2; speed = SHOOTER_SPEED; }
  else if (kind === 'tank') { r = TANK_R; hp = TANK_HP; speed = TANK_SPEED; }
  // Крепче и чуть шустрее с глубиной, но скорость — с потолком, чтобы враг не
  // превратился в неотбиваемую пулю.
  const depth = floorNumber - 1;
  hp = Math.max(1, Math.round(hp * (1 + depth * RAMP_HP)));
  speed *= Math.min(SPEED_CAP, 1 + depth * RAMP_SPEED);
  if (elite) { r *= ELITE_R_MUL; hp = Math.round(hp * ELITE_HP_MUL); speed *= ELITE_SLOW; }
  return { x, y, r, hp, maxHp: hp, speed, kind, elite, hitFlash: 0, knockX: 0, knockY: 0, fireCd: rand(0.5, SHOOTER_FIRE_CD) };
}

function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
