import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { createRenderer } from './engine/renderer.js';
import { createCamera } from './engine/camera.js';
import { createPlayer, updatePlayer } from './game/player.js';
import { createCheckpoints } from './game/checkpoints.js';
import { testMap } from './game/testMap.js';

// Бутстрап Этапа 2: цикл, ввод, рендер, камера и одна хардкод-карта.
// Сцены (меню → уровень → пауза) появятся в game/state.js на Этапе 5.

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const input = createInput();

const map = testMap;
const player = createPlayer(map.spawn);
const checkpoints = createCheckpoints(map);
const camera = createCamera(map);
camera.snapTo(player);

const scene = { map, player, camera, checkpoints: checkpoints.list };

function update(dt) {
  const fellOut = updatePlayer(player, input, map, dt);
  checkpoints.update(player);

  if (fellOut) {
    // После респауна камера должна уже стоять на месте, а не лететь через
    // полкарты, показывая игроку дорогу, которую он только что не прошёл.
    camera.snapTo(player);
    return;
  }

  camera.update(player, dt);
}

const loop = createLoop({
  update,
  render: (alpha) => renderer.draw(scene, alpha)
});

// ResizeObserver, а не window.resize: он ловит любую смену размеров canvas —
// поворот телефона, изменение окна и, главное, момент, когда скрытый canvas
// наконец показали. По window.resize такое событие не приходит, и буфер остался
// бы нулевым навсегда.
new ResizeObserver(renderer.resize).observe(canvas);
// А это уже про перетаскивание окна на монитор с другим devicePixelRatio:
// CSS-размеры не меняются, ResizeObserver молчит, а плотность пикселей другая.
window.addEventListener('resize', renderer.resize);

// Вкладку свернули с зажатой клавишей — keyup не придёт, и игрок вернётся
// бегущим в стену. Гасим всё нажатое.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) input.releaseAll();
});

renderer.resize();
loop.start();
