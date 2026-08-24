import { VIEW_WIDTH, VIEW_HEIGHT, PALETTE, PLAYER_WIDTH, PLAYER_HEIGHT } from '../engine/constants.js';
import { drawCharacter } from '../engine/character.js';
import { DEFAULT_SKIN } from './skins.js';
import {
  generateFloor, roomInterior, roomContains, allWalls, drawRooms, ROOM_W, ROOM_H, WALL
} from './dungeonFloor.js';
import { createDungeonTouch } from './dungeonTouch.js';

// Режим «Данж» (рогалик в духе Soul Knight). Этаж — карта комнат с дверями. Камера
// держит текущую комнату (Soul Knight-стайл), боевые запираются до зачистки, за боссом
// портал на следующий этаж. Рисует сцену сам; общий слой (звук/сохранения/скины) общий.
// Задачи/награды в комнатах — следующий этап.

// Числа геймплея — на ощупь, крутить можно.
const MOVE_SPEED = 235;
const FIRE_COOLDOWN = 0.14, SHOT_SPEED = 560, SHOT_LIFE = 1.1, SHOT_R = 5, SHOT_DMG = 1, MUZZLE_TIME = 0.05;
const ENEMY_SPEED = 95, ENEMY_HP = 3, ENEMY_R = 15, HIT_FLASH = 0.08;
const BOSS_R = 30, BOSS_SPEED = 60;
const PLAYER_HP = 6, CONTACT_DMG = 1, CONTACT_CD = 0.8;
const CAM_SMOOTH = 8, PORTAL_R = 30;

export function createDungeonSession({ input, audio, save, canvas }) {
  const player = {
    x: 0, y: 0, width: PLAYER_WIDTH, height: PLAYER_HEIGHT,
    prevX: 0, prevY: 0, aim: { x: 1, y: 0 }, facing: 1, hp: PLAYER_HP, hurtCd: 0
  };
  let skin = save?.equipped ?? DEFAULT_SKIN;
  const pointer = { x: VIEW_WIDTH * 0.7, y: VIEW_HEIGHT / 2 };
  const cam = { x: 0, y: 0, prevX: 0, prevY: 0 };
  let firing = false, fireCd = 0, muzzle = 0;
  const shots = [];

  let floor, current;
  newFloor(1);

  function newFloor(n) {
    floor = generateFloor(n);
    current = floor.start;
    current.visited = true;
    player.x = current.cx - player.width / 2;
    player.y = current.cy - player.height / 2;
    player.prevX = player.x; player.prevY = player.y;
    shots.length = 0;
    cam.x = current.cx - VIEW_WIDTH / 2; cam.y = current.cy - VIEW_HEIGHT / 2;
    cam.prevX = cam.x; cam.prevY = cam.y;
  }

  const center = () => ({ x: player.x + player.width / 2, y: player.y + player.height / 2 });

  // Тач-джойстики (телефон). Мышь их не касается — обрабатываем ниже отдельно.
  const touch = createDungeonTouch({ canvas });

  // --- мышь (ПК): прицел + стрельба. Касания игнорируем — ими рулят джойстики. ---
  const onMove = (e) => {
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    if (r.width < 1) return;
    pointer.x = ((e.clientX - r.left) / r.width) * VIEW_WIDTH;
    pointer.y = ((e.clientY - r.top) / r.height) * VIEW_HEIGHT;
  };
  const onDown = (e) => { if (e.pointerType !== 'touch') firing = true; };
  const onUp = () => { firing = false; };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);

  function update(dt) {
    player.prevX = player.x; player.prevY = player.y;
    cam.prevX = cam.x; cam.prevY = cam.y;
    if (fireCd > 0) fireCd -= dt;
    if (muzzle > 0) muzzle -= dt;
    if (player.hurtCd > 0) player.hurtCd -= dt;

    move(dt);
    trackRoom();
    aimAndFire();
    updateShots(dt);
    if (current.spawned && !current.cleared) updateCombat(dt);

    // камера держит текущую комнату (комната уже уже вьюпорта — просто центрируем её)
    const tx = current.cx - VIEW_WIDTH / 2, ty = current.cy - VIEW_HEIGHT / 2;
    cam.x += (tx - cam.x) * Math.min(1, CAM_SMOOTH * dt);
    cam.y += (ty - cam.y) * Math.min(1, CAM_SMOOTH * dt);

    // портал за боссом
    if (current.portal) {
      const c = center();
      if (Math.hypot(c.x - current.portal.x, c.y - current.portal.y) < PORTAL_R) newFloor(floor.floorNumber + 1);
    }
  }

  function move(dt) {
    let mx = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    let my = (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0);
    if (touch.state.move.x || touch.state.move.y) { mx = touch.state.move.x; my = touch.state.move.y; }
    const mag = Math.hypot(mx, my);
    if (mag < 0.001) return;
    const nx = mx / mag, ny = my / mag;
    const speed = MOVE_SPEED * Math.min(1, mag); // наклон стика = скорость (аналог)
    const walls = allWalls(floor);
    player.x += nx * speed * dt; resolve(walls, nx, 'x');
    player.y += ny * speed * dt; resolve(walls, ny, 'y');
  }

  function resolve(walls, dir, axis) {
    for (const r of walls) {
      if (player.x < r.x + r.w && player.x + player.width > r.x &&
          player.y < r.y + r.h && player.y + player.height > r.y) {
        if (axis === 'x') player.x = dir > 0 ? r.x - player.width : r.x + r.w;
        else player.y = dir > 0 ? r.y - player.height : r.y + r.h;
      }
    }
  }

  function trackRoom() {
    const c = center();
    if (roomContains(current, c.x, c.y)) return;
    for (const room of floor.rooms) {
      if (room !== current && roomContains(room, c.x, c.y)) {
        current = room;
        room.visited = true;
        if ((room.kind === 'combat' || room.kind === 'boss') && !room.spawned && !room.cleared) activate(room);
        return;
      }
    }
  }

  function activate(room) {
    room.spawned = true;
    room.doorsClosed = true;
    const it = roomInterior(room);
    if (room.kind === 'boss') {
      room.enemies.push(makeEnemy(room.cx, room.cy - 60, BOSS_R, ENEMY_HP * 6 + floor.floorNumber * 4, BOSS_SPEED, true));
    } else {
      const n = 4 + floor.floorNumber;
      for (let i = 0; i < n; i++) {
        const x = rand(it.x0 + 30, it.x1 - 30), y = rand(it.y0 + 30, it.y1 - 30);
        room.enemies.push(makeEnemy(x, y, ENEMY_R, ENEMY_HP, ENEMY_SPEED, false));
      }
    }
  }

  function makeEnemy(x, y, r, hp, speed, boss) {
    return { x, y, r, hp, maxHp: hp, speed, boss, hitFlash: 0 };
  }

  function aimAndFire() {
    const c = center();
    if (touch.state.aiming) {
      const a = touch.state.aim, al = Math.hypot(a.x, a.y);
      if (al > 0.2) { player.aim.x = a.x / al; player.aim.y = a.y / al; } // мёртвая зона — держим прошлый
    } else {
      const ax = pointer.x + cam.x - c.x, ay = pointer.y + cam.y - c.y, al = Math.hypot(ax, ay);
      if (al > 0.001) { player.aim.x = ax / al; player.aim.y = ay / al; }
    }
    player.facing = player.aim.x >= 0 ? 1 : -1;

    if ((firing || touch.state.firing) && fireCd <= 0) {
      shots.push({ x: c.x + player.aim.x * 20, y: c.y + player.aim.y * 20,
        vx: player.aim.x * SHOT_SPEED, vy: player.aim.y * SHOT_SPEED, life: SHOT_LIFE });
      fireCd = FIRE_COOLDOWN; muzzle = MUZZLE_TIME;
    }
  }

  function updateShots(dt) {
    const walls = allWalls(floor);
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      let dead = s.life <= 0 || walls.some((r) => s.x > r.x && s.x < r.x + r.w && s.y > r.y && s.y < r.y + r.h);
      if (!dead) {
        for (const e of current.enemies) {
          if (e.hp > 0 && Math.hypot(s.x - e.x, s.y - e.y) < e.r + SHOT_R) {
            e.hp -= SHOT_DMG; e.hitFlash = HIT_FLASH; dead = true; break;
          }
        }
      }
      if (dead) shots.splice(i, 1);
    }
  }

  function updateCombat(dt) {
    const c = center();
    for (let i = current.enemies.length - 1; i >= 0; i--) {
      const e = current.enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.hp <= 0) { current.enemies.splice(i, 1); continue; }
      const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
      if (d < e.r + player.width / 2 && player.hurtCd <= 0) {
        player.hp = Math.max(0, player.hp - CONTACT_DMG);
        player.hurtCd = CONTACT_CD;
        if (player.hp <= 0) { newFloor(1); player.hp = PLAYER_HP; return; }
      }
    }
    if (current.enemies.length === 0) {
      current.cleared = true;
      current.doorsClosed = false; // двери открылись
      if (current.kind === 'boss') current.portal = { x: current.cx, y: current.cy - ROOM_H / 2 + WALL + 46 };
    }
  }

  function render(ctx, alpha) {
    ctx.fillStyle = '#0c1226';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const camX = lerp(cam.prevX, cam.x, alpha), camY = lerp(cam.prevY, cam.y, alpha);
    ctx.save();
    ctx.translate(-camX, -camY);

    drawRooms(ctx, floor);

    for (const e of current.enemies) {
      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : (e.boss ? '#b0343f' : PALETTE.coral);
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = PALETTE.chalk;
    for (const s of shots) { ctx.beginPath(); ctx.arc(s.x, s.y, SHOT_R, 0, Math.PI * 2); ctx.fill(); }

    const px = lerp(player.prevX, player.x, alpha), py = lerp(player.prevY, player.y, alpha);
    drawCharacter(ctx, px, py, player.width, player.height, skin, player.facing);
    const cx = px + player.width / 2, cy = py + player.height / 2;
    ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + player.aim.x * 26, cy + player.aim.y * 26); ctx.stroke();
    if (muzzle > 0) {
      ctx.fillStyle = '#fff4c0';
      ctx.beginPath(); ctx.arc(cx + player.aim.x * 28, cy + player.aim.y * 28, 7, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
    drawMinimap(ctx);
    drawHp(ctx);
    touch.draw(ctx); // джойстики поверх (только когда есть касания)
  }

  const MINI_KIND = { start: '#5ac888', combat: '#96a0be', boss: '#e05a67', treasure: '#f6d24d', shop: '#9e73ee' };
  function drawMinimap(ctx) {
    const step = 16, pad = 8;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const r of floor.rooms) {
      minX = Math.min(minX, r.cell.x); maxX = Math.max(maxX, r.cell.x);
      minY = Math.min(minY, r.cell.y); maxY = Math.max(maxY, r.cell.y);
    }
    const w = (maxX - minX + 1) * step + pad * 2, h = (maxY - minY + 1) * step + pad * 2;
    const ox = VIEW_WIDTH - w - 14, oy = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(ox, oy, w, h);
    for (const r of floor.rooms) {
      const x = ox + pad + (r.cell.x - minX) * step, y = oy + pad + (r.cell.y - minY) * step;
      ctx.globalAlpha = r.visited ? 1 : 0.32;
      ctx.fillStyle = MINI_KIND[r.kind] ?? MINI_KIND.combat;
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.globalAlpha = 1;
      if (r === current) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x - 7, y - 7, 14, 14); }
    }
  }

  function drawHp(ctx) {
    const x = 18, y = 18, w = 220, h = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PALETTE.coral; ctx.fillRect(x + 3, y + 3, (w - 6) * Math.max(0, player.hp / PLAYER_HP), h - 6);
  }

  return {
    update, render,
    setSkin(next) { skin = next; },
    destroy() {
      touch.destroy();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    }
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
