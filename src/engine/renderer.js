import { createBackground } from './background.js';
import { drawTiles } from './tiles.js';
import { drawProps } from './props.js';
import { drawCharacter } from './character.js';
import { prefersReducedMotion } from './motion.js';
import { VIEW_WIDTH, VIEW_HEIGHT, PALETTE } from './constants.js';
import { DEFAULT_SKIN } from '../game/skins.js';

// Композитор кадра: небо, тайлы, сущности, игрок, осколки, HUD. Сам рисует
// только игрока и осколки — всё остальное умеют профильные модули.

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
    const { map, player, camera, entities, pop, hud, hudState, time, springPulses, skin } = scene;

    // Камеру интерполируем так же, как игрока: иначе мир дёргался бы ровно на те
    // доли шага, которые мы только что сгладили самому игроку.
    const cameraX = lerp(camera.previousX, camera.x, alpha);
    const cameraY = lerp(camera.previousY, camera.y, alpha);

    background.draw(ctx, { x: cameraX, y: cameraY });

    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    drawTiles(ctx, map, cameraX, cameraY, time, springPulses);
    drawProps(ctx, entities, time);
    // Лопнувшего игрока не рисуем — вместо него на экране осколки.
    if (player.popTimer <= 0) {
      if (player.invincibleTimer > 0) drawInvincibleAura(player, alpha, time);
      drawPlayer(player, alpha, skin);
    }
    drawPop(pop);
    ctx.restore();

    hud.draw(ctx, hudState);
  }

  function drawPop(pop) {
    if (!pop) return;

    const ring = pop.ring;
    if (ring) {
      // Кольцо расширяется и гаснет — обозначает точку хлопка.
      const progress = 1 - ring.life / pop.ringLifetime;
      ctx.strokeStyle = PALETTE.chalk;
      ctx.globalAlpha = (1 - progress) * 0.7;
      ctx.lineWidth = 3 * (1 - progress) + 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, pop.ringRadius * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const shard of pop.shards) {
      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.angle);
      ctx.globalAlpha = Math.min(1, shard.life / shard.maxLife);
      ctx.fillStyle = shard.color;
      ctx.fillRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Под звездой герой в радужном пульсирующем ореоле (в спокойном режиме —
  // ровное золотое кольцо без мельтешения цветов).
  function drawInvincibleAura(player, alpha, time) {
    const x = lerp(player.previousX, player.x, alpha) + player.width / 2;
    const y = lerp(player.previousY, player.y, alpha) + player.height / 2;
    const calm = prefersReducedMotion();
    const r = Math.max(player.width, player.height) * 0.75 + (calm ? 0 : Math.sin(time * 12) * 3);
    ctx.strokeStyle = calm ? PALETTE.amber : `hsl(${Math.floor(time * 300) % 360}, 85%, 65%)`;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawPlayer(player, alpha, skin) {
    // Интерполяция между прошлым и текущим шагом симуляции: без неё на мониторе
    // со 144 Гц движение выглядело бы рублеными ступеньками.
    const x = lerp(player.previousX, player.x, alpha);
    const y = lerp(player.previousY, player.y, alpha);

    drawCharacter(ctx, x, y, player.width, player.height, skin ?? DEFAULT_SKIN, player.facing);
  }

  // ctx отдаём наружу: режим «Данж» рисует свою сцену сам, в тех же логических
  // координатах 960×540 (трансформ уже выставлен в resize).
  return { resize, draw, ctx };
}

function lerp(from, to, t) {
  return from + (to - from) * t;
}
