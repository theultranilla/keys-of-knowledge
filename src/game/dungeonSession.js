import { VIEW_WIDTH, VIEW_HEIGHT, TILE, PALETTE, PLAYER_WIDTH, PLAYER_HEIGHT } from '../engine/constants.js';
import { drawCharacter } from '../engine/character.js';
import { DEFAULT_SKIN } from './skins.js';

// Режим «Данж» (рогалик в духе Soul Knight): top-down забег. Пока одна комната:
// ходишь (WASD/стрелки), целишься мышью, стреляешь (ЛКМ/удержание), врагов-
// преследователей сносишь снарядами. Дальше нарастим карту комнат, награды, задачи.
// Рисует сцену сам (renderer отдаёт ctx); общий слой (звук/сохранения/скины) — общий.

const WALL = TILE;
const MIN_X = WALL, MAX_X = VIEW_WIDTH - WALL;
const MIN_Y = WALL, MAX_Y = VIEW_HEIGHT - WALL;

// Числа геймплея — на ощупь, крутить можно.
const MOVE_SPEED = 235;        // px/с
const FIRE_COOLDOWN = 0.14;    // с между выстрелами
const SHOT_SPEED = 560, SHOT_LIFE = 0.9, SHOT_R = 5, SHOT_DMG = 1;
const MUZZLE_TIME = 0.05;
const ENEMY_SPEED = 95, ENEMY_HP = 3, ENEMY_R = 15, ENEMY_COUNT = 5;
const HIT_FLASH = 0.08, PLAYER_HP = 6, CONTACT_DMG = 1, CONTACT_CD = 0.8;

export function createDungeonSession({ input, audio, save, canvas }) {
  const player = {
    x: VIEW_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: VIEW_HEIGHT / 2 - PLAYER_HEIGHT / 2,
    width: PLAYER_WIDTH, height: PLAYER_HEIGHT,
    prevX: 0, prevY: 0, aim: { x: 1, y: 0 }, facing: 1,
    hp: PLAYER_HP, hurtCd: 0
  };
  player.prevX = player.x; player.prevY = player.y;

  let skin = save?.equipped ?? DEFAULT_SKIN;
  const pointer = { x: VIEW_WIDTH * 0.7, y: VIEW_HEIGHT / 2 };
  let firing = false;
  let fireCd = 0;
  let muzzle = 0;

  const shots = [];   // {x,y,vx,vy,life}
  const enemies = [];
  spawnEnemies();

  function spawnEnemies() {
    enemies.length = 0;
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const x = rand(MIN_X + 40, MAX_X - 40);
      const y = rand(MIN_Y + 40, MAX_Y - 40);
      // не спавним впритык к игроку
      if (Math.hypot(x - center().x, y - center().y) < 120) { i--; continue; }
      enemies.push({ x, y, hp: ENEMY_HP, hitFlash: 0 });
    }
  }

  function center() {
    return { x: player.x + player.width / 2, y: player.y + player.height / 2 };
  }

  // --- ввод мыши: прицел + стрельба ---
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    if (r.width < 1) return;
    pointer.x = ((e.clientX - r.left) / r.width) * VIEW_WIDTH;
    pointer.y = ((e.clientY - r.top) / r.height) * VIEW_HEIGHT;
  };
  const onDown = () => { firing = true; };
  const onUp = () => { firing = false; };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);

  function update(dt) {
    player.prevX = player.x; player.prevY = player.y;
    if (fireCd > 0) fireCd -= dt;
    if (muzzle > 0) muzzle -= dt;
    if (player.hurtCd > 0) player.hurtCd -= dt;

    // движение
    let mx = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    let my = (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my);
      player.x = clamp(player.x + (mx / len) * MOVE_SPEED * dt, MIN_X, MAX_X - player.width);
      player.y = clamp(player.y + (my / len) * MOVE_SPEED * dt, MIN_Y, MAX_Y - player.height);
    }

    // прицел (камеры нет — указатель = мир)
    const c = center();
    const ax = pointer.x - c.x, ay = pointer.y - c.y, al = Math.hypot(ax, ay);
    if (al > 0.001) { player.aim.x = ax / al; player.aim.y = ay / al; }
    player.facing = player.aim.x >= 0 ? 1 : -1;

    // стрельба
    if (firing && fireCd <= 0) {
      shots.push({ x: c.x + player.aim.x * 20, y: c.y + player.aim.y * 20,
        vx: player.aim.x * SHOT_SPEED, vy: player.aim.y * SHOT_SPEED, life: SHOT_LIFE });
      fireCd = FIRE_COOLDOWN; muzzle = MUZZLE_TIME;
    }

    updateShots(dt);
    updateEnemies(dt, c);
  }

  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      let dead = s.life <= 0 || s.x < MIN_X || s.x > MAX_X || s.y < MIN_Y || s.y > MAX_Y;
      if (!dead) {
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          if (Math.hypot(s.x - e.x, s.y - e.y) < ENEMY_R + SHOT_R) {
            e.hp -= SHOT_DMG; e.hitFlash = HIT_FLASH; dead = true; break;
          }
        }
      }
      if (dead) shots.splice(i, 1);
    }
  }

  function updateEnemies(dt, c) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.hp <= 0) { enemies.splice(i, 1); continue; }

      const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * ENEMY_SPEED * dt;
      e.y += (dy / d) * ENEMY_SPEED * dt;

      // касание — урон игроку (с перезарядкой)
      if (d < ENEMY_R + player.width / 2 && player.hurtCd <= 0) {
        player.hp = Math.max(0, player.hp - CONTACT_DMG);
        player.hurtCd = CONTACT_CD;
        if (player.hp <= 0) { player.hp = PLAYER_HP; spawnEnemies(); } // пока просто рестарт волны
      }
    }
    if (enemies.length === 0) spawnEnemies(); // зачистил — новая волна (временно)
  }

  function render(ctx, alpha) {
    ctx.fillStyle = PALETTE.skyDeep; ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = PALETTE.skyMid; ctx.fillRect(WALL, WALL, VIEW_WIDTH - 2 * WALL, VIEW_HEIGHT - 2 * WALL);
    ctx.fillStyle = '#2b3566';
    ctx.fillRect(0, 0, VIEW_WIDTH, WALL);
    ctx.fillRect(0, VIEW_HEIGHT - WALL, VIEW_WIDTH, WALL);
    ctx.fillRect(0, 0, WALL, VIEW_HEIGHT);
    ctx.fillRect(VIEW_WIDTH - WALL, 0, WALL, VIEW_HEIGHT);

    for (const e of enemies) {
      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : PALETTE.coral;
      ctx.beginPath(); ctx.arc(e.x, e.y, ENEMY_R, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = PALETTE.chalk;
    for (const s of shots) { ctx.beginPath(); ctx.arc(s.x, s.y, SHOT_R, 0, Math.PI * 2); ctx.fill(); }

    const px = lerp(player.prevX, player.x, alpha), py = lerp(player.prevY, player.y, alpha);
    drawCharacter(ctx, px, py, player.width, player.height, skin, player.facing);

    // оружие + вспышка
    const cx = px + player.width / 2, cy = py + player.height / 2;
    ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + player.aim.x * 26, cy + player.aim.y * 26); ctx.stroke();
    if (muzzle > 0) {
      ctx.fillStyle = '#fff4c0';
      ctx.beginPath(); ctx.arc(cx + player.aim.x * 28, cy + player.aim.y * 28, 7, 0, Math.PI * 2); ctx.fill();
    }

    drawHp(ctx);
  }

  function drawHp(ctx) {
    const x = 20, y = 20, w = 220, h = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PALETTE.coral; ctx.fillRect(x + 3, y + 3, (w - 6) * (player.hp / PLAYER_HP), h - 6);
  }

  return {
    update, render,
    setSkin(next) { skin = next; },
    destroy() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    }
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
