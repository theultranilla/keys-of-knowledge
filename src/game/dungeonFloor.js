import { TILE, PALETTE } from '../engine/constants.js';

// Раскладка этажа-подземелья: комнаты на сетке, соединённые дверями (как в Soul
// Knight). Дерево комнат строится случайным обходом от старта. Геометрия комнаты —
// четыре стены с проёмами там, где есть сосед; combat/boss запирают проёмы до
// зачистки. Тут только данные и геометрия — поведение (бой, камера) живёт в сессии.

export const WALL = TILE;              // толщина стены
export const ROOM_W = 27 * TILE;       // ширина комнаты в мире
export const ROOM_H = 15 * TILE;       // высота комнаты
const DOOR_HALF = TILE * 1.4;          // половина ширины проёма

const DIRS = [
  { x: 0, y: -1, side: 'n', opp: 's' },
  { x: 0, y: 1, side: 's', opp: 'n' },
  { x: -1, y: 0, side: 'w', opp: 'e' },
  { x: 1, y: 0, side: 'e', opp: 'w' }
];

const FLOOR_TINT = {
  start: '#20305c',
  combat: '#23305A',
  treasure: '#3a3418',
  shop: '#2c2044',
  boss: '#3a1f2b'
};

const key = (x, y) => `${x},${y}`;

export function generateFloor(floorNumber, roomCount = 8) {
  const kindOf = new Map();
  const doorsOf = new Map();
  const order = [];

  const put = (x, y, kind) => {
    kindOf.set(key(x, y), kind);
    doorsOf.set(key(x, y), { n: false, s: false, e: false, w: false });
    order.push({ x, y });
  };
  put(0, 0, 'start');

  let guard = 0;
  while (order.length < roomCount && guard++ < 4000) {
    const from = order[(Math.random() * order.length) | 0];
    const d = DIRS[(Math.random() * DIRS.length) | 0];
    const nx = from.x + d.x, ny = from.y + d.y;
    if (kindOf.has(key(nx, ny))) continue;
    put(nx, ny, 'combat');
    doorsOf.get(key(from.x, from.y))[d.side] = true;
    doorsOf.get(key(nx, ny))[d.opp] = true;
  }

  // Босс — самая дальняя от старта клетка.
  let boss = order[0], far = -1;
  for (const c of order) {
    const dd = Math.abs(c.x) + Math.abs(c.y);
    if (dd > far) { far = dd; boss = c; }
  }
  if (boss.x !== 0 || boss.y !== 0) kindOf.set(key(boss.x, boss.y), 'boss');

  // Сокровищница + лавка среди остальных.
  const rest = order.filter((c) => !(c.x === 0 && c.y === 0) && !(c.x === boss.x && c.y === boss.y));
  shuffle(rest);
  if (rest[0]) kindOf.set(key(rest[0].x, rest[0].y), 'treasure');
  if (rest[1]) kindOf.set(key(rest[1].x, rest[1].y), 'shop');

  const rooms = order.map((c, i) => ({
    cell: c,
    index: i,
    kind: kindOf.get(key(c.x, c.y)),
    doors: doorsOf.get(key(c.x, c.y)),
    cx: c.x * ROOM_W,
    cy: c.y * ROOM_H,
    doorsClosed: false,
    enemies: [],
    spawned: false,
    cleared: false,
    visited: false,
    portal: null
  }));

  const roomByCell = new Map();
  for (const r of rooms) roomByCell.set(key(r.cell.x, r.cell.y), r);

  return { rooms, roomByCell, start: roomByCell.get('0,0'), floorNumber };
}

export function roomInterior(room) {
  const hw = ROOM_W / 2, hh = ROOM_H / 2;
  return { x0: room.cx - hw + WALL, y0: room.cy - hh + WALL, x1: room.cx + hw - WALL, y1: room.cy + hh - WALL };
}

export function roomContains(room, px, py) {
  const hw = ROOM_W / 2, hh = ROOM_H / 2;
  return px > room.cx - hw && px < room.cx + hw && py > room.cy - hh && py < room.cy + hh;
}

// Сплошные прямоугольники стен комнаты с учётом открытых/закрытых проёмов.
export function roomWalls(room) {
  const { cx, cy, doors, doorsClosed } = room;
  const hw = ROOM_W / 2, hh = ROOM_H / 2, T = WALL, dh = DOOR_HALF;
  const L = cx - hw, R = cx + hw, Tp = cy - hh, B = cy + hh;
  const open = (s) => doors[s] && !doorsClosed;
  const rects = [];
  hSeg(rects, L, R, Tp, T, open('n'), cx, dh);
  hSeg(rects, L, R, B - T, T, open('s'), cx, dh);
  vSeg(rects, Tp, B, L, T, open('w'), cy, dh);
  vSeg(rects, Tp, B, R - T, T, open('e'), cy, dh);
  return rects;
}

function hSeg(rects, x0, x1, y, t, open, cx, dh) {
  if (!open) { rects.push({ x: x0, y, w: x1 - x0, h: t }); return; }
  rects.push({ x: x0, y, w: (cx - dh) - x0, h: t });
  rects.push({ x: cx + dh, y, w: x1 - (cx + dh), h: t });
}

function vSeg(rects, y0, y1, x, t, open, cy, dh) {
  if (!open) { rects.push({ x, y: y0, w: t, h: y1 - y0 }); return; }
  rects.push({ x, y: y0, w: t, h: (cy - dh) - y0 });
  rects.push({ x, y: cy + dh, w: t, h: y1 - (cy + dh) });
}

// Собрать стены всех комнат (комнат немного — дешевле пересчитать, чем кэшировать).
export function allWalls(floor) {
  const rects = [];
  for (const room of floor.rooms) for (const r of roomWalls(room)) rects.push(r);
  return rects;
}

export function drawRooms(ctx, floor) {
  // пол
  for (const room of floor.rooms) {
    const it = roomInterior(room);
    ctx.fillStyle = FLOOR_TINT[room.kind] ?? FLOOR_TINT.combat;
    ctx.fillRect(it.x0, it.y0, it.x1 - it.x0, it.y1 - it.y0);
  }
  // стены
  ctx.fillStyle = '#151b34';
  for (const room of floor.rooms) for (const r of roomWalls(room)) ctx.fillRect(r.x, r.y, r.w, r.h);
  // пикапы (монеты/лечение), выпавшие с боёв
  for (const room of floor.rooms) if (room.pickups) for (const p of room.pickups) {
    ctx.fillStyle = p.kind === 'coin' ? '#f6d24d' : '#e0645f';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // сундуки-выбор + прилавки лавки (с подписями)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const room of floor.rooms) {
    if (room.chests) for (const ch of room.chests) {
      if (ch.opened) continue;
      ctx.fillStyle = ch.color;
      ctx.fillRect(ch.x - 14, ch.y - 14, 28, 28);
      ctx.fillStyle = '#15151f';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(ch.label, ch.x, ch.y + 1);
    }
    if (room.stands) for (const st of room.stands) {
      if (st.bought) continue;
      ctx.fillStyle = st.color;
      ctx.fillRect(st.x - 16, st.y - 16, 32, 32);
      ctx.fillStyle = '#15151f';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(st.label, st.x, st.y - 4);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(String(st.cost), st.x, st.y + 9);
    }
  }
  ctx.textAlign = 'left';

  // портал (за боссом)
  for (const room of floor.rooms) if (room.portal) {
    ctx.fillStyle = PALETTE.amber;
    ctx.beginPath();
    ctx.arc(room.portal.x, room.portal.y, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- сундуки-выбор: предмет → тип награды ---
const SUBJECTS = [
  { subject: 'algebra', reward: 'damage', color: '#f2c14b', label: 'А' }, // урон
  { subject: 'geometry', reward: 'maxhp', color: '#5ea0ff', label: 'Г' }, // макс. HP
  { subject: 'physics', reward: 'heal', color: '#e0645f', label: 'Ф' }    // лечение
];

export function spawnChests(floor) {
  for (const room of floor.rooms) {
    if (room.kind !== 'treasure') continue;
    room.chests = SUBJECTS.map((s, i) => ({
      x: room.cx + (i - 1) * 92, y: room.cy - 24,
      subject: s.subject, reward: s.reward, color: s.color, label: s.label, opened: false
    }));
  }
}

export function bossReward(room) {
  const s = SUBJECTS[(Math.random() * SUBJECTS.length) | 0];
  return [{ x: room.cx, y: room.cy + 70, subject: s.subject, reward: s.reward, color: s.color, label: s.label, opened: false }];
}

// --- лавка: прилавки за монеты ---
const STANDS = [
  { reward: 'damage', cost: 8, color: '#f2c14b', label: 'Урон' },
  { reward: 'maxhp', cost: 8, color: '#5ea0ff', label: 'HP' },
  { reward: 'heal', cost: 5, color: '#e0645f', label: 'Лечь' }
];

export function spawnShop(floor) {
  for (const room of floor.rooms) {
    if (room.kind !== 'shop') continue;
    room.stands = STANDS.map((s, i) => ({
      x: room.cx + (i - 1) * 92, y: room.cy - 24,
      reward: s.reward, cost: s.cost, color: s.color, label: s.label, bought: false
    }));
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
