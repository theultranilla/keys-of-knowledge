import { createBackground } from './background.js';
import { TILE, VIEW_WIDTH, VIEW_HEIGHT, PALETTE } from './constants.js';

// Ночная обсерватория: тёмное небо с созвездиями, платформы — меловые линии
// на грифельной доске. Спрайтов пока нет, всё рисуется фигурами Canvas.

// Выше 2 нет смысла: на телефонах с dpr 3 это втрое больше пикселей ради разницы,
// которую не видно, зато честно видно по частоте кадров.
const MAX_PIXEL_RATIO = 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const background = createBackground();

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const cssWidth = canvas.clientWidth;

    // Пока canvas скрыт (display:none, фоновая вкладка, панель ещё не показана),
    // его размеры нулевые. Трогать буфер в этот момент нельзя: он схлопнется в
    // 1×1 и таким и останется — ResizeObserver позовёт нас снова, когда покажут.
    if (cssWidth < 1) return;

    // Высота буфера считается из ширины, а не из фактической высоты элемента:
    // так буфер всегда ровно 16:9. Иначе собственные пропорции canvas зависели бы
    // от буфера, а буфер — от пропорций, и картинка уползала бы с каждым ресайзом.
    const width = Math.round(cssWidth * ratio);
    const height = Math.round((width * VIEW_HEIGHT) / VIEW_WIDTH);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Дальше весь код рисует в логических координатах 960×540 и про реальный
    // размер окна не знает. Смена размера буфера сбрасывает состояние контекста,
    // поэтому трансформ и сглаживание выставляем заново каждый раз.
    const scale = width / VIEW_WIDTH;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function draw(scene, alpha) {
    const { map, player, camera, checkpoints } = scene;

    // Камеру интерполируем так же, как игрока: иначе мир дёргался бы ровно на те
    // доли шага, которые мы только что сгладили самому игроку.
    const cameraX = lerp(camera.previousX, camera.x, alpha);
    const cameraY = lerp(camera.previousY, camera.y, alpha);

    background.draw(ctx, { x: cameraX, y: cameraY });

    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    drawMap(map, cameraX, cameraY);
    drawCheckpoints(checkpoints);
    drawPlayer(player, alpha);
    ctx.restore();
  }

  function drawMap(map, cameraX, cameraY) {
    // Рисуем только то, что попадает в кадр. На карте в тысячи тайлов перебор
    // всей сетки каждый кадр — самый простой способ потерять 60 FPS на ровном месте.
    const columnFrom = Math.max(0, Math.floor(cameraX / TILE));
    const columnTo = Math.min(map.columns - 1, Math.floor((cameraX + VIEW_WIDTH) / TILE));
    const lineFrom = Math.max(0, Math.floor(cameraY / TILE));
    const lineTo = Math.min(map.lines - 1, Math.floor((cameraY + VIEW_HEIGHT) / TILE));

    for (let line = lineFrom; line <= lineTo; line++) {
      for (let column = columnFrom; column <= columnTo; column++) {
        const kind = map.tileAt(column, line);
        if (kind === 'ground' || kind === 'platform') {
          drawTile(kind, column * TILE, line * TILE);
        }
      }
    }
  }

  function drawTile(kind, x, y) {
    const isGround = kind === 'ground';

    ctx.fillStyle = isGround ? 'rgba(232, 236, 244, 0.10)' : 'rgba(232, 236, 244, 0.16)';
    roundedRect(x + 1, y + 1, TILE - 2, TILE - 2, 4);
    ctx.fill();

    ctx.strokeStyle = PALETTE.chalk;
    ctx.globalAlpha = isGround ? 0.35 : 0.6;
    ctx.lineWidth = 2;
    roundedRect(x + 1, y + 1, TILE - 2, TILE - 2, 4);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Тонкая линия по верху: подчёркивает, куда именно можно приземлиться.
    ctx.globalAlpha = isGround ? 0.5 : 0.85;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 2.5);
    ctx.lineTo(x + TILE - 4, y + 2.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawCheckpoints(checkpoints) {
    for (const checkpoint of checkpoints) {
      const poleX = checkpoint.x + 2;
      const top = checkpoint.y;

      ctx.strokeStyle = checkpoint.active ? PALETTE.teal : PALETTE.chalk;
      ctx.globalAlpha = checkpoint.active ? 1 : 0.45;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(poleX, top);
      ctx.lineTo(poleX, top + checkpoint.height);
      ctx.stroke();

      // Пройденный флажок разворачивается и заливается: разница видна боковым
      // зрением, без всякой надписи.
      ctx.beginPath();
      ctx.moveTo(poleX, top + 2);
      ctx.lineTo(poleX + (checkpoint.active ? 13 : 8), top + 7);
      ctx.lineTo(poleX, top + 12);
      ctx.closePath();
      if (checkpoint.active) {
        ctx.fillStyle = PALETTE.teal;
        ctx.fill();
      } else {
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawPlayer(player, alpha) {
    // Интерполяция между прошлым и текущим шагом симуляции: без неё на мониторе
    // со 144 Гц движение выглядело бы рублеными ступеньками.
    const x = lerp(player.previousX, player.x, alpha);
    const y = lerp(player.previousY, player.y, alpha);

    ctx.fillStyle = PALETTE.chalk;
    roundedRect(x, y, player.width, player.height, 6);
    ctx.fill();

    // Янтарный фонарик смотрит туда же, куда бежит игрок.
    ctx.fillStyle = PALETTE.amber;
    const lampX = player.facing > 0 ? x + player.width - 8 : x + 2;
    roundedRect(lampX, y + 7, 6, 6, 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.skyDeep;
    const eyeX = player.facing > 0 ? x + 12 : x + 6;
    ctx.fillRect(eyeX, y + 8, 3, 4);
    ctx.fillRect(eyeX - 5, y + 8, 3, 4);
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.rect(x, y, width, height); // старые Safari: просто углы поострее
    }
  }

  return { resize, draw };
}

function lerp(from, to, t) {
  return from + (to - from) * t;
}
