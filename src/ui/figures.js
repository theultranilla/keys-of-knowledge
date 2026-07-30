import { t } from './i18n.js';

// Чертежи к геометрическим задачам: inline-SVG, собранный по параметрам самой
// задачи. Никаких картинок — фигура должна совпадать с числами в условии, иначе
// она обманывает, а обманывать нельзя.

const NS = 'http://www.w3.org/2000/svg';
const WIDTH = 280;
const HEIGHT = 180;
const PAD = 34;

export function createFigure(figure) {
  if (!figure) return null;

  const svg = element('svg', {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    class: 'figure',
    role: 'img',
    'aria-label': t('task.figure.alt')
  });

  const builder = builders[figure.kind];
  if (!builder) return null;

  builder(svg, figure);
  return svg;
}

const builders = {
  rectangle(svg, { width, height, labelWidth, labelHeight }) {
    // Слева и снизу резервируем место под подписи сторон. Без левого гуттера
    // подпись высоты у широкого прямоугольника уезжала за край SVG, и от «11 см»
    // оставалось видно только «см».
    const GUTTER_LEFT = 58;
    const GUTTER_BOTTOM = 40;
    const scale = Math.min((WIDTH - GUTTER_LEFT - PAD) / width, (HEIGHT - PAD - GUTTER_BOTTOM) / height);
    const w = width * scale;
    const h = height * scale;
    const x = GUTTER_LEFT + (WIDTH - GUTTER_LEFT - PAD - w) / 2;
    const y = PAD + (HEIGHT - PAD - GUTTER_BOTTOM - h) / 2;

    svg.append(
      element('rect', { x, y, width: w, height: h, class: 'figure__shape' }),
      label(x + w / 2, y + h + 22, labelWidth),
      label(x - 14, y + h / 2, labelHeight, 'end')
    );
  },

  triangle(svg, { base, height, labelBase, labelHeight }) {
    const scale = fit(base, height);
    const b = base * scale;
    const h = height * scale;
    const left = (WIDTH - b) / 2;
    const bottom = (HEIGHT + h) / 2 - 12;
    // Вершина смещена от середины — иначе треугольник выглядит только
    // равнобедренным, и высота перестаёт читаться как отдельная величина.
    const apexX = left + b * 0.34;

    svg.append(
      element('polygon', {
        points: `${left},${bottom} ${left + b},${bottom} ${apexX},${bottom - h}`,
        class: 'figure__shape'
      }),
      element('line', {
        x1: apexX, y1: bottom - h, x2: apexX, y2: bottom, class: 'figure__dash'
      }),
      // Прямой угол в основании высоты.
      element('polyline', {
        points: `${apexX + 9},${bottom} ${apexX + 9},${bottom - 9} ${apexX},${bottom - 9}`,
        class: 'figure__mark'
      }),
      label(left + b / 2, bottom + 22, labelBase),
      label(apexX - 10, bottom - h / 2, labelHeight, 'end')
    );
  },

  triangleAngles(svg, { first, second }) {
    const left = PAD + 16;
    const right = WIDTH - PAD - 16;
    const bottom = HEIGHT - PAD - 6;
    const apexX = left + (right - left) * 0.42;
    const apexY = PAD;

    svg.append(
      element('polygon', {
        points: `${left},${bottom} ${right},${bottom} ${apexX},${apexY}`,
        class: 'figure__shape'
      }),
      element('path', { d: arc(left, bottom, 26, right, bottom, apexX, apexY), class: 'figure__mark' }),
      element('path', { d: arc(right, bottom, 26, apexX, apexY, left, bottom), class: 'figure__mark' }),
      label(left + 34, bottom - 12, `${first}°`),
      label(right - 34, bottom - 12, `${second}°`),
      label(apexX, apexY + 30, '?', 'middle', 'figure__label figure__label--ask')
    );
  },

  circle(svg, { radius, label: caption }) {
    const r = Math.min(62, 16 + radius * 4.5);
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2 - 8;

    svg.append(
      element('circle', { cx, cy, r, class: 'figure__shape' }),
      element('line', { x1: cx, y1: cy, x2: cx + r, y2: cy, class: 'figure__dash' }),
      element('circle', { cx, cy, r: 2.5, class: 'figure__dot' }),
      label(cx + r / 2, cy - 10, caption)
    );
  },

  box(svg, { a, b, c }) {
    const scale = fit(Math.max(a, b) + c * 0.5, Math.max(b, c) + c * 0.5) * 0.9;
    const w = a * scale;
    const h = b * scale;
    const depth = c * scale * 0.55;
    const x = (WIDTH - w - depth) / 2;
    const y = (HEIGHT - h - depth) / 2 + depth / 2;

    svg.append(
      element('rect', { x, y, width: w, height: h, class: 'figure__shape' }),
      element('polygon', {
        points: `${x},${y} ${x + depth},${y - depth} ${x + w + depth},${y - depth} ${x + w},${y}`,
        class: 'figure__shape figure__shape--faint'
      }),
      element('polygon', {
        points: `${x + w},${y} ${x + w + depth},${y - depth} ${x + w + depth},${y + h - depth} ${x + w},${y + h}`,
        class: 'figure__shape figure__shape--faint'
      }),
      label(x + w / 2, y + h + 22, `${a} см`),
      label(x - 12, y + h / 2, `${b} см`, 'end'),
      label(x + w + depth / 2 + 16, y - depth / 2, `${c} см`, 'start')
    );
  }
};

function fit(width, height) {
  return Math.min((WIDTH - PAD * 2) / width, (HEIGHT - PAD * 2) / height);
}

// Дуга у вершины угла: от одной стороны к другой, чтобы подпись «45°» стояла
// не просто рядом с точкой, а внутри отмеченного угла.
function arc(cx, cy, radius, x1, y1, x2, y2) {
  const start = point(cx, cy, x1, y1, radius);
  const end = point(cx, cy, x2, y2, radius);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

function point(cx, cy, towardX, towardY, radius) {
  const dx = towardX - cx;
  const dy = towardY - cy;
  const length = Math.hypot(dx, dy) || 1;
  return { x: cx + (dx / length) * radius, y: cy + (dy / length) * radius };
}

function label(x, y, text, anchor = 'middle', className = 'figure__label') {
  return element('text', { x, y, 'text-anchor': anchor, 'dominant-baseline': 'middle', class: className }, text);
}

function element(name, attributes, text) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  if (text != null) node.textContent = text;
  return node;
}
