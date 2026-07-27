import {
  TILE,
  VIEW_WIDTH,
  VIEW_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PALETTE
} from './constants.js';

// Ночная обсерватория: тёмное небо с созвездиями, платформы — меловые линии
// на грифельной доске. Спрайтов пока нет, всё рисуется фигурами Canvas.

const STAR_COUNT = 90;
// Выше 2 нет смысла: на телефонах с dpr 3 это втрое больше пикселей ради разницы,
// которую не видно, зато честно видно по частоте кадров.
const MAX_PIXEL_RATIO = 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const stars = createStars(STAR_COUNT);
  let sky = null;

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
      sky = null; // градиент привязан к размеру буфера, пересоздадим лениво
    }

    // Дальше весь код рисует в логических координатах 960×540 и про реальный
    // размер окна не знает. Смена размера буфера сбрасывает состояние контекста,
    // поэтому трансформ и сглаживание выставляем заново каждый раз.
    const scale = width / VIEW_WIDTH;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function draw(map, player, alpha) {
    drawSky();
    drawStars();
    drawMap(map);
    drawPlayer(player, alpha);
  }

  function drawSky() {
    if (!sky) {
      sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
      sky.addColorStop(0, PALETTE.skyDeep);
      sky.addColorStop(1, PALETTE.skyMid);
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  function drawStars() {
    ctx.fillStyle = PALETTE.chalk;
    for (const star of stars) {
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMap(map) {
    for (let line = 0; line < map.lines; line++) {
      for (let column = 0; column < map.columns; column++) {
        const kind = map.tileAt(column, line);
        if (kind === 'empty') continue;
        drawTile(kind, column * TILE, line * TILE);
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
    ctx.strokeStyle = PALETTE.chalk;
    ctx.globalAlpha = isGround ? 0.5 : 0.85;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 2.5);
    ctx.lineTo(x + TILE - 4, y + 2.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawPlayer(player, alpha) {
    // Интерполяция между прошлым и текущим шагом симуляции: без неё на мониторе
    // со 144 Гц движение выглядело бы рублеными ступеньками.
    const x = lerp(player.previousX, player.x, alpha);
    const y = lerp(player.previousY, player.y, alpha);

    ctx.fillStyle = PALETTE.chalk;
    roundedRect(x, y, PLAYER_WIDTH, PLAYER_HEIGHT, 6);
    ctx.fill();

    // Янтарный фонарик смотрит туда же, куда бежит игрок.
    ctx.fillStyle = PALETTE.amber;
    const lampX = player.facing > 0 ? x + PLAYER_WIDTH - 8 : x + 2;
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

// Свой крошечный ГПСЧ: созвездия должны быть одинаковыми между перезагрузками
// и не перерисовываться при каждом ресайзе. Настоящий сидируемый rng для
// генераторов задач появится на Этапе 4, здесь он был бы лишней связью.
function createStars(count) {
  let seed = 20260727;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const stars = [];
  for (let index = 0; index < count; index++) {
    stars.push({
      x: random() * VIEW_WIDTH,
      y: random() * VIEW_HEIGHT * 0.8,
      radius: 0.6 + random() * 1.4,
      alpha: 0.2 + random() * 0.5
    });
  }
  return stars;
}
