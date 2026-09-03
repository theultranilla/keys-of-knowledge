import { VIEW_WIDTH, VIEW_HEIGHT, PALETTE, PLAYER_WIDTH, PLAYER_HEIGHT } from '../engine/constants.js';
import { drawHeroPixel } from './dungeonSprites.js';
import { DEFAULT_SKIN } from './skins.js';
import {
  generateFloor, roomInterior, roomContains, allWalls, drawRooms, spawnChests, spawnShop, bossReward,
  spawnTraps, drawTraps, trapsOut, TRAP_SIZE, spawnObstacles, spawnMini, spawnAltars, ROOM_H, WALL
} from './dungeonFloor.js';
import { createDungeonTouch } from './dungeonTouch.js';
import { createCombat, WEAPONS, WEAPON_DROPS } from './dungeonCombat.js';
import { upgradeBonuses } from './dungeonUpgrades.js';
import { drawMinimap, drawHp, drawEnemiesLeft, drawFloorBanner, drawBossBar } from './dungeonHud.js';
import { prefersReducedMotion } from '../engine/motion.js';
import { t } from '../ui/i18n.js';

// Режим «Данж» (рогалик в духе Soul Knight). Этаж — карта комнат с дверями, камера держит
// текущую комнату, боевые запираются до зачистки, за боссом портал. Сессия владеет игроком,
// камерой, экономикой и сборкой кадра; бой вынесен в dungeonCombat, общий слой (звук/скины/
// тач) — общий с платформером.

const MOVE_SPEED = 235, MUZZLE_TIME = 0.05; // темп стрельбы теперь у оружия (WEAPONS)
const PLAYER_HP = 6, CONTACT_CD = 0.8, CAM_SMOOTH = 8;
const BANNER_TIME = 1.6; // сколько держится баннер «Этаж N» при входе
const COINS_PER_FLOOR = 4; // монет в кошелёк за спуск с этажа (× номер этажа — глубже щедрее)
const NOVA_FX_TIME = 0.4, NOVA_RADIUS = 260; // ударная волна «Новы»: длительность и радиус
const DASH_SPEED = 620, DASH_TIME = 0.16, DASH_CD = 0.7; // рывок: скорость, длительность (=окно неуязвимости), кулдаун
const INTERACT_R = 42; // дальность контекстного взаимодействия (E / тач-кнопка)
const GAMBLE_BET = 8;  // ставка в комнате-казино

export function createDungeonSession({ input, audio, save, canvas, modal, tasks, onDeath, upgrades }) {
  // Постоянные улучшения из хаба — прибавка к стартовым характеристикам.
  const bonus = upgradeBonuses(upgrades ?? {});
  const startHp = PLAYER_HP + bonus.maxHp;
  const dashCdBase = Math.max(0.25, DASH_CD - bonus.dashCdReduce);
  const coinBonus = bonus.coinBonus;
  const player = {
    x: 0, y: 0, width: PLAYER_WIDTH, height: PLAYER_HEIGHT,
    prevX: 0, prevY: 0, aim: { x: 1, y: 0 }, facing: 1,
    hp: startHp, maxHp: startHp, hurtCd: 0, dmgMul: 1 + bonus.dmgMul, coins: 0, bombs: 1 + bonus.bombs, weapon: 'spark'
  };
  let busy = false; // пока открыта карточка задачи — мир стоит
  let dead = false; // игрок погиб — забег заморожен до перезапуска
  let skin = save?.equipped ?? DEFAULT_SKIN;
  const pointer = { x: VIEW_WIDTH * 0.7, y: VIEW_HEIGHT / 2 };
  const cam = { x: 0, y: 0, prevX: 0, prevY: 0 };
  let firing = false, fireCd = 0, muzzle = 0;
  let shake = 0, walkPhase = 0, moving = false;
  let bannerTime = 0; // таймер баннера «Этаж N»
  let time = 0; // часы забега — по ним пульсируют ловушки
  let trapsWereOut = false; // для звука выезда шипов — ловим фронт
  let bankedThisRun = 0; // сколько монет забег уже отправил в кошелёк
  let novaFx = 0; // таймер ударной волны «Новы»
  const novaCenter = { x: 0, y: 0 };
  let dashTime = 0, dashCd = 0; // рывок: остаток длительности и кулдаун
  const dashDir = { x: 1, y: 0 };
  let focus = null; // ближайшее взаимодействие: { type, target } или null
  const sparks = [];

  const combat = createCombat({
    audio,
    hitPlayer,
    onClear: onRoomClear,
    onEnemyHit: enemyDown
  });

  let floor, current;
  newFloor(1);
  audio?.startMusic?.(); // фоновый эмбиент — только в данже, гаснет при выходе

  function newFloor(n) {
    floor = generateFloor(n);
    spawnChests(floor); // сундуки-выбор в сокровищницах
    spawnShop(floor);   // прилавки в лавках
    spawnTraps(floor);  // шипы в части боевых комнат
    spawnObstacles(floor); // столбы-укрытия в боевых комнатах
    spawnMini(floor);      // логово мини-босса (с этажа 3)
    spawnAltars(floor);    // алтарь-жертвенник и костёр-отдых в особых комнатах
    current = floor.start;
    current.visited = true;
    player.x = current.cx - player.width / 2;
    player.y = current.cy - player.height / 2;
    player.prevX = player.x; player.prevY = player.y;
    combat.reset(); sparks.length = 0; shake = 0; bannerTime = BANNER_TIME;
    cam.x = current.cx - VIEW_WIDTH / 2; cam.y = current.cy - VIEW_HEIGHT / 2;
    cam.prevX = cam.x; cam.prevY = cam.y;
  }

  const center = () => ({ x: player.x + player.width / 2, y: player.y + player.height / 2 });
  // Тряску экрана в спокойном режиме не заводим вовсе (инвариант reduced-motion).
  const addShake = (v) => { if (!prefersReducedMotion()) shake = Math.max(shake, v); };

  // Тач-джойстики (телефон). Мышь их не касается — обрабатываем ниже отдельно.
  const touch = createDungeonTouch({ canvas, input });

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
    if (busy || dead) return; // карточка задачи открыта или забег окончен — мир стоит
    player.prevX = player.x; player.prevY = player.y;
    cam.prevX = cam.x; cam.prevY = cam.y;
    if (fireCd > 0) fireCd -= dt;
    if (muzzle > 0) muzzle -= dt;
    if (player.hurtCd > 0) player.hurtCd -= dt;
    if (shake > 0) shake = Math.max(0, shake - 40 * dt);
    if (bannerTime > 0) bannerTime -= dt;
    time += dt; // ход часов замирает вместе с миром (после guard) — ловушки честно стоят на паузе
    // Звук выезда шипов — на нарастающем фронте и только в комнате с ловушками.
    const out = trapsOut(time);
    if (out && !trapsWereOut && current.traps) audio?.play?.('trap');
    trapsWereOut = out;

    if (dashCd > 0) dashCd -= dt;
    if (input.consumePress('dash') && dashCd <= 0 && dashTime <= 0) startDash();

    move(dt);
    clampToRooms();  // страховка: никогда не оказаться за пределами всех комнат
    trackRoom();
    maybeActivate(); // двери запираем, только когда игрок уже внутри (не в проёме)
    collectPickups(); // монеты/лечение/заряды подбираются сами; оружие — через взаимодействие
    updateFocus();    // что рядом, с чем можно взаимодействовать
    if (input.consumePress('interact') && focus) doInteract(focus);
    if (damageTraps()) return; // урон о шипы мог обнулить забег → дальше не трогаем мёртвую сессию
    aimAndFire();
    // Нова: тратим заряд только если есть по кому бить (пустую комнату не жжём).
    if (input.consumePress('nova') && player.bombs > 0 && current.enemies.length > 0) {
      player.bombs--;
      const c = center();
      combat.nova(current, c.x, c.y);
      addShake(8);
      if (!prefersReducedMotion()) { novaFx = NOVA_FX_TIME; novaCenter.x = c.x; novaCenter.y = c.y; }
    }
    if (novaFx > 0) novaFx -= dt;
    combat.update(dt, floor, current, center(), player.dmgMul, player.width / 2);
    updateSparks(dt);

    const tx = current.cx - VIEW_WIDTH / 2, ty = current.cy - VIEW_HEIGHT / 2;
    cam.x += (tx - cam.x) * Math.min(1, CAM_SMOOTH * dt);
    cam.y += (ty - cam.y) * Math.min(1, CAM_SMOOTH * dt);
  }

  // Направление рывка — по движению, а стоя на месте — по прицелу.
  function startDash() {
    let dx = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    let dy = (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0);
    if (touch.state.move.x || touch.state.move.y) { dx = touch.state.move.x; dy = touch.state.move.y; }
    const m = Math.hypot(dx, dy);
    if (m > 0.1) { dashDir.x = dx / m; dashDir.y = dy / m; }
    else { dashDir.x = player.aim.x; dashDir.y = player.aim.y; }
    dashTime = DASH_TIME; dashCd = dashCdBase;
    audio?.play?.('dash');
  }

  function move(dt) {
    const walls = allWalls(floor);
    if (dashTime > 0) { // рывок перекрывает обычное управление
      dashTime -= dt;
      moving = false; // без покачивания в рывке
      player.x += dashDir.x * DASH_SPEED * dt; resolve(walls, dashDir.x, 'x');
      player.y += dashDir.y * DASH_SPEED * dt; resolve(walls, dashDir.y, 'y');
      return;
    }
    let mx = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    let my = (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0);
    if (touch.state.move.x || touch.state.move.y) { mx = touch.state.move.x; my = touch.state.move.y; }
    const mag = Math.hypot(mx, my);
    moving = mag > 0.15;
    if (mag < 0.001) return;
    if (moving) walkPhase += dt * 14; // фаза «шага» для покачивания
    const nx = mx / mag, ny = my / mag;
    const speed = MOVE_SPEED * Math.min(1, mag); // наклон стика = скорость (аналог)
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
      if (room !== current && roomContains(room, c.x, c.y)) { current = room; room.visited = true; return; }
    }
  }

  // Запираем боевую/босс, только когда игрок ушёл вглубь от проёма — иначе закрывающаяся
  // дверь вытолкнула бы его наружу.
  function maybeActivate() {
    if (current.spawned || current.cleared) return;
    if (current.kind !== 'combat' && current.kind !== 'boss') return;
    const it = roomInterior(current), c = center();
    if (c.x > it.x0 + 24 && c.x < it.x1 - 24 && c.y > it.y0 + 24 && c.y < it.y1 - 24) {
      current.spawned = true;
      current.doorsClosed = true;
      combat.spawnEnemies(current, floor.floorNumber);
    }
  }

  function clampToRooms() {
    const c = center();
    for (const room of floor.rooms) if (roomContains(room, c.x, c.y)) return;
    const it = roomInterior(current); // выпал из всех комнат — вернуть в текущую
    player.x = Math.max(it.x0, Math.min(it.x1 - player.width, player.x));
    player.y = Math.max(it.y0, Math.min(it.y1 - player.height, player.y));
  }

  function aimAndFire() {
    const c = center();
    if (touch.state.aiming) {
      const a = touch.state.aim, al = Math.hypot(a.x, a.y);
      if (al > 0.2) { player.aim.x = a.x / al; player.aim.y = a.y / al; }
    } else {
      const ax = pointer.x + cam.x - c.x, ay = pointer.y + cam.y - c.y, al = Math.hypot(ax, ay);
      if (al > 0.001) { player.aim.x = ax / al; player.aim.y = ay / al; }
    }
    player.facing = player.aim.x >= 0 ? 1 : -1;

    if ((firing || touch.state.firing) && fireCd <= 0) {
      combat.fire(c.x, c.y, player.aim, player.weapon);
      fireCd = (WEAPONS[player.weapon] || WEAPONS.spark).fireCd; // темп зависит от оружия
      muzzle = MUZZLE_TIME;
    }
  }

  // Урон игроку (зовёт бой). true — если погиб (забег сброшен).
  function hitPlayer(dmg) {
    if (player.hurtCd > 0 || dead || dashTime > 0) return false; // рывок даёт кадры неуязвимости
    player.hp = Math.max(0, player.hp - dmg);
    player.hurtCd = CONTACT_CD;
    addShake(7);
    audio?.play?.('hurt');
    if (player.hp <= 0) {
      dead = true;
      audio?.play?.('wrong'); // мягкий низкий сигнал: забег окончен
      onDeath?.({ floor: floor.floorNumber, coins: player.coins, banked: bankedThisRun });
      return true; // бой прекращает обработку этого кадра
    }
    return false;
  }

  function onRoomClear(room) {
    if (room.kind === 'boss') {
      room.portal = { x: room.cx, y: room.cy - ROOM_H / 2 + WALL + 46 };
      room.chests = bossReward(room);
      addShake(12);
    } else {
      // concat, а не присваивание: монеты, выпавшие с элиток по ходу боя, не теряем
      room.pickups = (room.pickups || []).concat(dropCoins(room));
      if (room.mini) { // за логово — гарантированный дроп: оружие + заряд «Новы»
        const opts = WEAPON_DROPS.filter((w) => w !== player.weapon);
        room.pickups.push({ x: room.cx - 24, y: room.cy, kind: 'weapon', weaponId: opts[(Math.random() * opts.length) | 0] });
        room.pickups.push({ x: room.cx + 24, y: room.cy, kind: 'bomb', value: 1 });
      }
    }
  }

  // Смерть/попадание по врагу: искры + монета за убитую элиту (риск/награда).
  function enemyDown(x, y, death, elite) {
    spawnSparks(x, y, death);
    if (death && elite) {
      current.pickups = current.pickups || [];
      current.pickups.push({ x, y, kind: 'coin', value: 4 + Math.floor(floor.floorNumber / 2) });
    }
  }

  // --- искры (полировка) ---
  function spawnSparks(x, y, death) {
    if (prefersReducedMotion()) return; // частицы отключены в спокойном режиме
    const n = death ? 14 : 5;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(40, death ? 220 : 130);
      sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.2, 0.45), maxLife: 0.45, size: rand(2, death ? 5 : 3) });
    }
    if (death) addShake(4);
  }
  function updateSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.9; s.vy *= 0.9; s.life -= dt;
      if (s.life <= 0) sparks.splice(i, 1);
    }
  }

  // --- контекстное взаимодействие ---
  // Ищем ближайший предмет/портал в радиусе — с ним и работает кнопка «действие».
  function updateFocus() {
    if (busy) { focus = null; return; }
    const c = center();
    let best = null, bestD = INTERACT_R;
    const near = (x, y) => { const d = Math.hypot(c.x - x, c.y - y); return d < bestD ? d : -1; };
    if (current.pickups) for (const p of current.pickups) if (p.kind === 'weapon') {
      const d = near(p.x, p.y); if (d >= 0) { best = { type: 'weapon', target: p }; bestD = d; }
    }
    if (current.chests) for (const ch of current.chests) if (!ch.opened) {
      const d = near(ch.x, ch.y); if (d >= 0) { best = { type: 'chest', target: ch }; bestD = d; }
    }
    if (current.stands) for (const st of current.stands) if (!st.bought) {
      const d = near(st.x, st.y); if (d >= 0) { best = { type: 'shop', target: st }; bestD = d; }
    }
    if (current.altar && !current.altar.used) { const d = near(current.altar.x, current.altar.y); if (d >= 0) { best = { type: 'altar', target: current.altar }; bestD = d; } }
    if (current.campfire && !current.campfire.used) { const d = near(current.campfire.x, current.campfire.y); if (d >= 0) { best = { type: 'heal', target: current.campfire }; bestD = d; } }
    if (current.gamble && !current.gamble.used) { const d = near(current.gamble.x, current.gamble.y); if (d >= 0) { best = { type: 'gamble', target: current.gamble }; bestD = d; } }
    if (current.portal) { const d = near(current.portal.x, current.portal.y); if (d >= 0) best = { type: 'portal', target: current.portal }; }
    focus = best;
  }

  function doInteract(f) {
    if (f.type === 'weapon') swapWeapon(f.target);
    else if (f.type === 'chest') openChest(f.target);
    else if (f.type === 'shop') buyStand(f.target);
    else if (f.type === 'altar') useAltar(f.target);
    else if (f.type === 'heal') useCampfire(f.target);
    else if (f.type === 'gamble') resolveGamble(f.target);
    else if (f.type === 'portal') descend();
  }

  // Казино: ставка GAMBLE_BET монет — 45% крупный выигрыш, 27% заряд «Новы», иначе пусто.
  function resolveGamble(g) {
    if (g.used || player.coins < GAMBLE_BET) return;
    g.used = true;
    player.coins -= GAMBLE_BET;
    const r = Math.random();
    if (r < 0.45) { player.coins += GAMBLE_BET * 3; audio?.play?.('key'); addShake(4); }
    else if (r < 0.72) { player.bombs += 1; audio?.play?.('key'); }
    else { audio?.play?.('wrong'); }
  }

  // Алтарь: раз за забег — минус 1 к макс. HP за +0.4 к урону (не ниже 2 HP).
  function useAltar(a) {
    if (a.used || player.maxHp <= 2) return;
    a.used = true;
    player.maxHp -= 1;
    player.hp = Math.min(player.hp, player.maxHp);
    player.dmgMul += 0.4;
    audio?.play?.('key');
    addShake(6);
  }

  // Костёр: раз за забег — подлечиться (+4 HP, не выше макс.).
  function useCampfire(f) {
    if (f.used) return;
    f.used = true;
    player.hp = Math.min(player.maxHp, player.hp + 4);
    audio?.play?.('key');
  }

  // Смена оружия: старое роняем на месте — можно взять обратно (тот же пикап
  // переиспользуем под прежний ствол).
  function swapWeapon(p) {
    const c = center(), old = player.weapon;
    player.weapon = p.weaponId;
    p.weaponId = old; p.x = c.x; p.y = c.y;
    audio?.play?.('key');
  }

  function buyStand(st) {
    if (st.bought || player.coins < st.cost) return;
    player.coins -= st.cost;
    st.bought = true;
    applyReward(st.reward, false); // заплатил монетами — сильная версия
  }

  function descend() {
    // Спуск = этаж пройден. Награда в кошелёк тем больше, чем глубже, банкуется сразу.
    const reward = floor.floorNumber * COINS_PER_FLOOR;
    bankedThisRun += reward;
    save?.earnCoins?.(reward);
    newFloor(floor.floorNumber + 1);
  }

  async function openChest(ch) {
    if (busy) return;
    busy = true;
    input.releaseAll();
    const grade = Math.min(5, floor.floorNumber); // аудитория 1–5 классов: этаж = класс, с потолком 5
    const difficulty = Math.min(floor.floorNumber, 3);
    const task = tasks.createTask({ subject: ch.subject, grade, difficulty },
      `dungeon-f${floor.floorNumber}-r${current.index}-${ch.subject}`);
    const outcome = await modal.open(task, tasks);
    busy = false;
    if (!outcome.solved) return;
    applyReward(ch.reward, outcome.usedSolution);
    for (const other of current.chests) other.opened = true; // выбор: остальные исчезают
  }

  function applyReward(reward, usedSolution) {
    const strong = !usedSolution; // решил сам — награда сильнее
    if (reward === 'damage') player.dmgMul += strong ? 0.5 : 0.3;
    else if (reward === 'maxhp') { const add = strong ? 3 : 2; player.maxHp += add; player.hp += add; }
    else if (reward === 'heal') player.hp = Math.min(player.maxHp, player.hp + (strong ? 4 : 3));
    audio?.play?.('key');
  }

  function dropCoins(room) {
    const it = roomInterior(room), arr = [];
    const value = 2 + Math.floor(floor.floorNumber / 3); // монеты дороже с глубиной — под растущие цены
    const n = 3 + ((Math.random() * 3) | 0); // 3–5 монет
    for (let i = 0; i < n; i++) arr.push({ ...clearSpot(room, it), kind: 'coin', value });
    if (Math.random() < 0.4) arr.push({ ...clearSpot(room, it), kind: 'heal', value: 2 });
    if (Math.random() < 0.18) arr.push({ ...clearSpot(room, it), kind: 'bomb', value: 1 });
    if (Math.random() < 0.14) { // редкий дроп оружия (не совпадает с текущим)
      const opts = WEAPON_DROPS.filter((w) => w !== player.weapon);
      arr.push({ ...clearSpot(room, it), kind: 'weapon', weaponId: opts[(Math.random() * opts.length) | 0] });
    }
    return arr;
  }

  // Точка внутри комнаты, не попадающая в столбы-препятствия: иначе монета
  // спавнилась прямо в укрытии и её было не достать. Центр комнаты всегда свободен
  // (столбы стоят по углам) — на него и падаем, если за 20 попыток не нашли место.
  function clearSpot(room, it, margin = 14) {
    const obs = room.obstacles ?? [];
    for (let tries = 0; tries < 20; tries++) {
      const x = rand(it.x0 + 40, it.x1 - 40), y = rand(it.y0 + 40, it.y1 - 40);
      const inside = obs.some((o) =>
        x > o.x - margin && x < o.x + o.w + margin && y > o.y - margin && y < o.y + o.h + margin);
      if (!inside) return { x, y };
    }
    return { x: (it.x0 + it.x1) / 2, y: (it.y0 + it.y1) / 2 };
  }

  function collectPickups() {
    if (!current.pickups) return;
    const c = center();
    for (let i = current.pickups.length - 1; i >= 0; i--) {
      const p = current.pickups[i];
      if (p.kind === 'weapon') continue; // оружие подбирается только через взаимодействие (E), не само
      if (Math.hypot(c.x - p.x, c.y - p.y) > 28) continue;
      if (p.kind === 'coin') player.coins += p.value + coinBonus; // «Удача» добавляет к каждой монете
      else if (p.kind === 'bomb') player.bombs += 1;
      else player.hp = Math.min(player.maxHp, player.hp + p.value);
      audio?.play?.('coin');
      current.pickups.splice(i, 1);
    }
  }

  // Урон о выехавшие шипы. hitPlayer сам держит кулдаун — стоя на шипах, не
  // теряешь всё HP за кадр. Возвращает true, если удар оказался смертельным.
  function damageTraps() {
    if (!current.traps || !trapsOut(time)) return false;
    const h = TRAP_SIZE / 2;
    for (const tr of current.traps) {
      if (player.x < tr.x + h && player.x + player.width > tr.x - h &&
          player.y < tr.y + h && player.y + player.height > tr.y - h) {
        return hitPlayer(1);
      }
    }
    return false;
  }

  // Текст подсказки для текущего взаимодействия (и над героем, и на тач-кнопке).
  function focusLabel() {
    if (!focus) return null;
    if (focus.type === 'weapon') return t('dungeon.take', { name: (WEAPONS[focus.target.weaponId] || WEAPONS.spark).name });
    if (focus.type === 'chest') return t('dungeon.open');
    if (focus.type === 'shop') return t('dungeon.buy', { label: focus.target.label, cost: focus.target.cost });
    if (focus.type === 'altar') return t('dungeon.altar');
    if (focus.type === 'heal') return t('dungeon.rest');
    if (focus.type === 'gamble') return t('dungeon.gamble');
    if (focus.type === 'portal') return t('dungeon.descend');
    return null;
  }

  function render(ctx, alpha) {
    ctx.fillStyle = floor.biome?.bg ?? '#0c1226'; // фон по биому этажа
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    let camX = lerp(cam.prevX, cam.x, alpha), camY = lerp(cam.prevY, cam.y, alpha);
    if (shake > 0.2) { camX += (Math.random() - 0.5) * shake; camY += (Math.random() - 0.5) * shake; }
    ctx.save();
    ctx.translate(-camX, -camY);

    drawRooms(ctx, floor, time);
    drawTraps(ctx, current, time); // шипы под сущностями — по ним ходят
    combat.draw(ctx, current);
    drawSparks(ctx);
    if (novaFx > 0) { // расширяющееся кольцо ударной волны
      const p = 1 - novaFx / NOVA_FX_TIME;
      ctx.strokeStyle = `rgba(200,170,255,${(novaFx / NOVA_FX_TIME) * 0.85})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(novaCenter.x, novaCenter.y, p * NOVA_RADIUS, 0, Math.PI * 2); ctx.stroke();
    }

    const px = lerp(player.prevX, player.x, alpha);
    const bob = moving ? -Math.abs(Math.sin(walkPhase)) * 3 : 0;
    const py = lerp(player.prevY, player.y, alpha) + bob;
    // Шлейф рывка — пара бледных копий позади (в спокойном режиме не рисуем).
    if (dashTime > 0 && !prefersReducedMotion()) {
      ctx.globalAlpha = 0.22;
      for (let k = 1; k <= 2; k++) drawHeroPixel(ctx, px - dashDir.x * 11 * k, py - dashDir.y * 11 * k, player.width, player.height, skin, player.facing);
      ctx.globalAlpha = 1;
    }
    // Кадры неуязвимости после урона: мигаем. В спокойном режиме без вспышек —
    // просто держим героя тусклым (инвариант reduced-motion + светочувствительность).
    let heroAlpha = 1;
    if (player.hurtCd > 0) {
      heroAlpha = prefersReducedMotion() ? 0.5 : (Math.floor(player.hurtCd * 12) % 2 === 0 ? 0.3 : 1);
    }
    ctx.globalAlpha = heroAlpha;
    drawHeroPixel(ctx, px, py, player.width, player.height, skin, player.facing);
    ctx.globalAlpha = 1;
    const cx = px + player.width / 2, cy = py + player.height / 2;
    ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + player.aim.x * 26, cy + player.aim.y * 26); ctx.stroke();
    if (muzzle > 0) {
      ctx.fillStyle = '#fff4c0';
      ctx.beginPath(); ctx.arc(cx + player.aim.x * 28, cy + player.aim.y * 28, 7, 0, Math.PI * 2); ctx.fill();
    }

    // Подсказка взаимодействия над героем (клавиша E на ПК; на телефоне — тач-кнопка).
    if (focus) {
      const label = focusLabel() + '  (E)';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(label).width + 16, bx = px + player.width / 2, by = py - 20;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx - w / 2, by - 11, w, 22);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, bx, by);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    ctx.restore();
    drawMinimap(ctx, floor, current);
    drawHp(ctx, player, floor.floorNumber, (WEAPONS[player.weapon] || WEAPONS.spark).name);
    const activeCombat = current.spawned && !current.cleared;
    const boss = activeCombat ? current.enemies.find((e) => e.kind === 'boss') : null;
    if (boss) drawBossBar(ctx, boss); // в комнате босса — его полоска вместо счётчика
    else drawEnemiesLeft(ctx, activeCombat ? current.enemies.length : 0);
    drawFloorBanner(ctx, floor.floorNumber, bannerTime / 0.5); // альфа>1 держит баннер, <1 гасит
    touch.setBombs(player.bombs);
    touch.setDashReady(dashCd <= 0);
    touch.setInteract(focus ? focusLabel() : null); // контекстная кнопка — только когда есть с чем
    touch.draw(ctx); // джойстики + кнопки «Рывок»/«Нова»/«Действие» поверх
  }

  function drawSparks(ctx) {
    ctx.fillStyle = '#ffd58a';
    for (const s of sparks) {
      ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
      ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  return {
    update, render,
    setSkin(next) { skin = next; },
    destroy() {
      audio?.stopMusic?.();
      touch.destroy();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    }
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
