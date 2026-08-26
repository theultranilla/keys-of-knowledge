import { VIEW_WIDTH, VIEW_HEIGHT } from '../engine/constants.js';

// Экранное управление для данжа: два плавающих джойстика (touch-only). Левый —
// движение, правый — прицел и автогонь (пока держишь). Появляются под пальцем,
// каждый следит за своим касанием, поэтому работают одновременно. Мышь сюда не
// попадает (её обрабатывает сессия), поэтому на ПК джойстики не мешают.

const RADIUS = 78; // логических пикселей — «вылет» стика от центра
// Кнопка «Нова» снизу по центру: не пересекается с зонами стиков (проверяется
// первой), заодно показывает число зарядов.
const NOVA_BTN = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT - 48, r: 30 };

export function createDungeonTouch({ canvas, input }) {
  let bombs = 0; // сколько «Нов» у игрока — для отрисовки счётчика на кнопке
  let novaId = -1;
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
    // Кнопка «Нова» имеет приоритет над стиками — иначе тап по ней завёл бы стик.
    if (Math.hypot(p.x - NOVA_BTN.x, p.y - NOVA_BTN.y) <= NOVA_BTN.r && novaId < 0) {
      novaId = e.pointerId;
      input?.setAction('nova', true); // сессия сама решит, есть ли заряд
      return;
    }
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
    if (e.pointerId === novaId) { novaId = -1; input?.setAction('nova', false); }
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
    // Нарисовать джойстики и кнопку «Нова» поверх сцены (в экранных координатах).
    draw(ctx) {
      drawStick(ctx, state.moveStick, 'rgba(120,180,255,');
      drawStick(ctx, state.aimStick, 'rgba(255,180,90,');
      drawNovaButton(ctx, bombs);
    },
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }
  };
}

// Кнопка «Нова»: всегда видна (заодно счётчик зарядов), тускнеет без заряда.
// На ПК это индикатор к клавише F, на телефоне — тап-кнопка.
function drawNovaButton(ctx, bombs) {
  const { x, y, r } = NOVA_BTN, on = bombs > 0;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = on ? 'rgba(158,115,238,0.32)' : 'rgba(120,120,140,0.16)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = on ? 'rgba(200,170,255,0.8)' : 'rgba(150,150,170,0.4)';
  ctx.stroke();
  ctx.fillStyle = on ? '#efeaff' : 'rgba(200,200,210,0.5)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Нова ' + bombs, x, y);
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
