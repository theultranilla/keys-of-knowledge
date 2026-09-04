import { VIEW_WIDTH, VIEW_HEIGHT } from '../engine/constants.js';
import { roundedRect } from '../engine/shapes.js';

// Экранное управление для данжа: два плавающих джойстика (touch-only). Левый —
// движение, правый — прицел и автогонь (пока держишь). Появляются под пальцем,
// каждый следит за своим касанием, поэтому работают одновременно. Мышь сюда не
// попадает (её обрабатывает сессия), поэтому на ПК джойстики не мешают.

const RADIUS = 78; // логических пикселей — «вылет» стика от центра
// Кнопки «Рывок»/«Нова» — в правом нижнем углу столбиком, у большого пальца
// прицела; проверяются раньше стиков, поэтому тап по ним не заводит джойстик.
// Левый палец при этом остаётся на стике движения, и рывок летит по бегу.
// Рывок ниже (к углу — он нужен чаще), Нова над ним.
const DASH_BTN = { x: VIEW_WIDTH - 52, y: VIEW_HEIGHT - 52, r: 30 };
const NOVA_BTN = { x: VIEW_WIDTH - 52, y: VIEW_HEIGHT - 122, r: 30 };
const SHIELD_BTN = { x: VIEW_WIDTH - 52, y: VIEW_HEIGHT - 192, r: 30 };
const inBtn = (p, b) => Math.hypot(p.x - b.x, p.y - b.y) <= b.r;
// Контекстная кнопка «действие» — пилюля снизу по центру, видна и жмётся только
// когда рядом есть с чем взаимодействовать (иначе не мешает).
const ACT_BTN = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT - 56, w: 240, h: 46 };
const inRect = (p, b) => Math.abs(p.x - b.x) <= b.w / 2 && Math.abs(p.y - b.y) <= b.h / 2;

export function createDungeonTouch({ canvas, input }) {
  let bombs = 0;             // заряды способности — счётчик на кнопке
  let power = { name: 'Нова', rgb: '158,115,238' }; // текущая способность слота F
  let dashReady = true;      // рывок не на кулдауне — для яркости кнопки
  let shieldReady = true;    // Щит не на кулдауне
  let interactLabel = null;  // подпись контекстного действия или null
  let novaId = -1, dashId = -1, shieldId = -1, actId = -1;
  const state = {
    move: { x: 0, y: 0 },
    aim: { x: 0, y: 0 },
    aiming: false,
    firing: false,
    moveStick: null, // {baseX,baseY,knobX,knobY} в логических координатах — для отрисовки
    aimStick: null
  };
  let moveId = -1, aimId = -1;

  const toLogical = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VIEW_WIDTH, y: ((e.clientY - r.top) / r.height) * VIEW_HEIGHT };
  };

  const onDown = (e) => {
    if (e.pointerType !== 'touch') return;
    const p = toLogical(e);
    // Кнопки имеют приоритет над стиками — иначе тап по ним завёл бы джойстик.
    if (interactLabel && inRect(p, ACT_BTN) && actId < 0) { actId = e.pointerId; input?.setAction('interact', true); return; }
    if (inBtn(p, DASH_BTN) && dashId < 0) { dashId = e.pointerId; input?.setAction('dash', true); return; }
    if (inBtn(p, NOVA_BTN) && novaId < 0) { novaId = e.pointerId; input?.setAction('nova', true); return; }
    if (inBtn(p, SHIELD_BTN) && shieldId < 0) { shieldId = e.pointerId; input?.setAction('shield', true); return; }
    if (p.x < VIEW_WIDTH / 2 && moveId < 0) {
      moveId = e.pointerId;
      state.moveStick = { baseX: p.x, baseY: p.y, knobX: p.x, knobY: p.y };
    } else if (p.x >= VIEW_WIDTH / 2 && aimId < 0) {
      aimId = e.pointerId;
      state.aiming = true;
      state.firing = true;
      state.aimStick = { baseX: p.x, baseY: p.y, knobX: p.x, knobY: p.y };
    }
  };

  const onMove = (e) => {
    if (e.pointerType !== 'touch') return;
    const p = toLogical(e);
    if (e.pointerId === moveId) drag(state.moveStick, state.move, p);
    else if (e.pointerId === aimId) drag(state.aimStick, state.aim, p);
  };

  const onUp = (e) => {
    if (e.pointerId === actId) { actId = -1; input?.setAction('interact', false); }
    else if (e.pointerId === dashId) { dashId = -1; input?.setAction('dash', false); }
    else if (e.pointerId === novaId) { novaId = -1; input?.setAction('nova', false); }
    else if (e.pointerId === shieldId) { shieldId = -1; input?.setAction('shield', false); }
    else if (e.pointerId === moveId) { moveId = -1; state.move.x = state.move.y = 0; state.moveStick = null; }
    else if (e.pointerId === aimId) { aimId = -1; state.aiming = state.firing = false; state.aim.x = state.aim.y = 0; state.aimStick = null; }
  };

  function drag(stick, vec, p) {
    if (!stick) return;
    const dx = p.x - stick.baseX, dy = p.y - stick.baseY, d = Math.hypot(dx, dy);
    const clamped = Math.min(d, RADIUS);
    if (d > 0.001) {
      stick.knobX = stick.baseX + (dx / d) * clamped;
      stick.knobY = stick.baseY + (dy / d) * clamped;
      vec.x = (dx / d) * (clamped / RADIUS);
      vec.y = (dy / d) * (clamped / RADIUS);
    } else {
      stick.knobX = stick.baseX; stick.knobY = stick.baseY; vec.x = vec.y = 0;
    }
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  return {
    state,
    setBombs(n) { bombs = n; },
    setPower(p) { power = p; },
    setDashReady(ready) { dashReady = ready; },
    setShieldReady(ready) { shieldReady = ready; },
    setInteract(label) { interactLabel = label; },
    // Нарисовать джойстики и кнопки поверх сцены (экранные координаты).
    draw(ctx) {
      drawStick(ctx, state.moveStick, 'rgba(120,180,255,');
      drawStick(ctx, state.aimStick, 'rgba(255,180,90,');
      drawButton(ctx, DASH_BTN, 'Рывок', dashReady, '120,180,255');
      drawButton(ctx, NOVA_BTN, power.name + ' ' + bombs, bombs > 0, power.rgb);
      drawButton(ctx, SHIELD_BTN, 'Щит', shieldReady, '140,215,255');
      if (interactLabel) drawActButton(ctx, interactLabel);
    },
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }
  };
}

// Кнопка действия: всегда видна (индикатор к клавише на ПК, тап-кнопка на тач),
// тускнеет, когда действие недоступно (кулдаун рывка / нет заряда новы).
function drawButton(ctx, btn, label, on, rgb) {
  const { x, y, r } = btn;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = on ? `rgba(${rgb},0.32)` : 'rgba(120,120,140,0.16)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = on ? `rgba(${rgb},0.85)` : 'rgba(150,150,170,0.4)';
  ctx.stroke();
  ctx.fillStyle = on ? '#f2f0ff' : 'rgba(200,200,210,0.5)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(label, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Контекстная кнопка-пилюля «действие» с подписью (взять/открыть/купить/вниз).
function drawActButton(ctx, label) {
  const { x, y, w, h } = ACT_BTN;
  roundedRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = 'rgba(90,200,136,0.92)';
  ctx.fill();
  ctx.fillStyle = '#0c1226';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawStick(ctx, stick, rgb) {
  if (!stick) return;
  ctx.beginPath(); ctx.arc(stick.baseX, stick.baseY, RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = rgb + '0.14)'; ctx.fill();
  ctx.beginPath(); ctx.arc(stick.knobX, stick.knobY, 34, 0, Math.PI * 2);
  ctx.fillStyle = rgb + '0.34)'; ctx.fill();
}
