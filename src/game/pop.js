import {
  PALETTE,
  POP_SHARD_COUNT,
  POP_SHARD_SPEED,
  POP_SHARD_GRAVITY,
  POP_SHARD_LIFETIME
} from '../engine/constants.js';

// Игрок лопается и разлетается меловыми осколками. Чисто косметика: на логику
// не влияет, живёт своей жизнью и гаснет сама.

// Кольцо ударной волны живёт меньше осколков — оно только обозначает момент.
const RING_LIFETIME = 0.3;
const RING_RADIUS = 46;

export function createPop() {
  const shards = [];
  let ring = null;

  function burst(x, y) {
    ring = { x, y, life: RING_LIFETIME };

    for (let index = 0; index < POP_SHARD_COUNT; index++) {
      // Разлёт по кругу с разбросом: ровное колесо выглядит механически.
      const angle = (index / POP_SHARD_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = POP_SHARD_SPEED * (0.55 + Math.random() * 0.7);
      const lifetime = POP_SHARD_LIFETIME * (0.6 + Math.random() * 0.5);

      shards.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        // Подбрасываем вверх, иначе нижние осколки просто стекают вниз и хлопок
        // читается как «рассыпался», а не «лопнул».
        velocityY: Math.sin(angle) * speed - 70,
        size: 3 + Math.random() * 4,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 16,
        life: lifetime,
        maxLife: lifetime,
        // Пара янтарных осколков — это разлетелся фонарик игрока.
        color: index % 7 === 0 ? PALETTE.amber : PALETTE.chalk
      });
    }
  }

  function update(dt) {
    if (ring) {
      ring.life -= dt;
      if (ring.life <= 0) ring = null;
    }

    // Идём с конца: так удаление не сдвигает ещё не обработанные осколки.
    for (let index = shards.length - 1; index >= 0; index--) {
      const shard = shards[index];
      shard.life -= dt;
      if (shard.life <= 0) {
        shards.splice(index, 1);
        continue;
      }
      shard.velocityY += POP_SHARD_GRAVITY * dt;
      shard.x += shard.velocityX * dt;
      shard.y += shard.velocityY * dt;
      shard.angle += shard.spin * dt;
    }
  }

  return {
    burst,
    update,
    shards,
    get ring() {
      return ring;
    },
    get ringLifetime() {
      return RING_LIFETIME;
    },
    get ringRadius() {
      return RING_RADIUS;
    }
  };
}
