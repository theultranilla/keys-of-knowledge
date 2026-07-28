// Крошечный помощник для сборки DOM. Нужен, чтобы экраны меню собирались
// деревом, а не склейкой строк в innerHTML: так в разметку физически не может
// попасть текст, который туда не звали.

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'hidden') node.hidden = Boolean(value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  }

  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }

  return node;
}

export function button(className, label, onClick) {
  return el('button', { class: className, type: 'button', text: label, onClick });
}
