import { allWalls, roomInterior } from './dungeonFloor.js';
import { PALETTE } from '../engine/constants.js';

// Бой данжа: враги трёх видов, снаряды игрока и врагов-стрелков. Владеет своими
// массивами и обновляет их; про игрока/этаж/награды знает через параметры и колбэки
// (hitPlayer — урон игроку, onClear — комната зачищена, onEnemyHit — искры-полировка).
// Числа геймплея — на ощупь, крутить можно.

export const SHOT_SPEED = 560, SHOT_LIFE = 1.1, SHOT_R = 5, SHOT_DMG = 1;
const ENEMY_SPEED = 95, ENEMY_HP = 3, ENEMY_R = 15, HIT_FLASH = 0.08, CONTACT_DMG = 1;
const BOSS_R = 30, BOSS_SPEED = 60;
const SHOOTER_RANGE = 250, SHOOTER_FIRE_CD = 1.3, SHOOTER_SPEED = 70;
const TANK_R = 26, TANK_HP = 9, TANK_SPEED = 45;
const ESHOT_SPEED = 280, ESHOT_R = 6, ESHOT_LIFE = 2.4, ESHOT_DMG = 1;
const ENEMY_COLOR = { chaser: PALETTE.coral, shooter: '#f0a04b', tank: '#8a3a52', boss: '#b0343f' };

export function createCombat({ audio, hitPlayer, onClear, onEnemyHit }) {
  const shots = [], eShots = [];

  function reset() { shots.length = 0; eShots.length = 0; }

  function spawnEnemies(room, floorNumber) {
    if (room.kind === 'boss') { room.enemies.push(makeEnemy(room.cx, room.cy - 60, 'boss', floorNumber)); return; }
    const it = roomInterior(room);
    const n = 4 + floorNumber;
    for (let i = 0; i < n; i++) {
      room.enemies.push(makeEnemy(rand(it.x0 + 30, it.x1 - 30), rand(it.y0 + 30, it.y1 - 30), pickKind(floorNumber), floorNumber));
    }
  }

  function fire(cx, cy, aim) {
    shots.push({ x: cx + aim.x * 20, y: cy + aim.y * 20, vx: aim.x * SHOT_SPEED, vy: aim.y * SHOT_SPEED, life: SHOT_LIFE });
    audio?.play?.('shoot');
  }

  // pc — центр игрока {x,y}; half — половина ширины игрока; dmgMul — множитель урона.
  function update(dt, floor, current, pc, dmgMul, half) {
    const walls = allWalls(floor);

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      let dead = s.life <= 0 || walls.some((r) => s.x > r.x && s.x < r.x + r.w && s.y > r.y && s.y < r.y + r.h);
      if (!dead) for (const e of current.enemies) {
        if (e.hp > 0 && Math.hypot(s.x - e.x, s.y - e.y) < e.r + SHOT_R) {
          e.hp -= SHOT_DMG * dmgMul; e.hitFlash = HIT_FLASH; dead = true;
          audio?.play?.('enemyHit'); onEnemyHit?.(s.x, s.y, false); break;
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
      if (e.hp <= 0) { current.enemies.splice(i, 1); audio?.play?.('enemyDie'); onEnemyHit?.(e.x, e.y, true); continue; }
      const dx = pc.x - e.x, dy = pc.y - e.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
      if (e.kind === 'shooter') {
        if (d > SHOOTER_RANGE + 30) { e.x += nx * e.speed * dt; e.y += ny * e.speed * dt; }
        else if (d < SHOOTER_RANGE - 30) { e.x -= nx * e.speed * dt; e.y -= ny * e.speed * dt; }
        e.fireCd -= dt;
        if (e.fireCd <= 0) { eShots.push({ x: e.x, y: e.y, vx: nx * ESHOT_SPEED, vy: ny * ESHOT_SPEED, life: ESHOT_LIFE }); e.fireCd = SHOOTER_FIRE_CD; }
      } else { e.x += nx * e.speed * dt; e.y += ny * e.speed * dt; }
      e.x = Math.max(it.x0 + e.r, Math.min(it.x1 - e.r, e.x));
      e.y = Math.max(it.y0 + e.r, Math.min(it.y1 - e.r, e.y));
      if (d < e.r + half && hitPlayer(CONTACT_DMG)) return;
    }
    if (current.enemies.length === 0) { current.cleared = true; current.doorsClosed = false; onClear(current); }
  }

  function draw(ctx, current) {
    for (const e of current.enemies) {
      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : (ENEMY_COLOR[e.kind] ?? PALETTE.coral);
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff8a4b';
    for (const s of eShots) { ctx.beginPath(); ctx.arc(s.x, s.y, ESHOT_R, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = PALETTE.chalk;
    for (const s of shots) { ctx.beginPath(); ctx.arc(s.x, s.y, SHOT_R, 0, Math.PI * 2); ctx.fill(); }
  }

  return { reset, spawnEnemies, fire, update, draw };
}

function pickKind(floorNumber) {
  const roll = Math.random();
  if (roll < 0.25) return 'shooter';
  if (roll < 0.4 && floorNumber >= 2) return 'tank';
  return 'chaser';
}

function makeEnemy(x, y, kind, floorNumber) {
  let r = ENEMY_R, hp = ENEMY_HP, speed = ENEMY_SPEED;
  if (kind === 'boss') { r = BOSS_R; hp = ENEMY_HP * 6 + floorNumber * 4; speed = BOSS_SPEED; }
  else if (kind === 'shooter') { r = 14; hp = 2; speed = SHOOTER_SPEED; }
  else if (kind === 'tank') { r = TANK_R; hp = TANK_HP; speed = TANK_SPEED; }
  return { x, y, r, hp, maxHp: hp, speed, kind, hitFlash: 0, fireCd: rand(0.5, SHOOTER_FIRE_CD) };
}

function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
