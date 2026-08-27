import { PALETTE } from '../engine/constants.js';

// Каталог косметики. Ноль ассетов: каждый предмет — это цвет и/или стиль, по
// которым engine/character.js рисует фигуры поверх игрока. Покупается за монеты
// (собранные на уровнях), надевается в гардеробе. Данные локальные, ничего
// никуда не отправляется.
//
// Названия предметов — контент, как title уровня, поэтому живут здесь строкой, а
// не в i18n. Обёртка интерфейса (кнопки, заголовки категорий) — в i18n.

// Категории и порядок их показа в гардеробе.
export const CATEGORIES = ['body', 'shirt', 'pants', 'outfit', 'hat', 'beard'];

// price: 0 — базовый предмет, доступен всегда и надет по умолчанию.
export const COSMETICS = [
  // Цвет кожи/тела
  { id: 'body.chalk', category: 'body', name: 'Меловой', price: 0, color: PALETTE.chalk },
  { id: 'body.peach', category: 'body', name: 'Персиковый', price: 15, color: '#F0C9A0' },
  { id: 'body.tan', category: 'body', name: 'Смуглый', price: 15, color: '#C58B5B' },
  { id: 'body.brown', category: 'body', name: 'Тёмный', price: 15, color: '#8A5A3B' },
  { id: 'body.mint', category: 'body', name: 'Пришелец', price: 45, color: '#7BD8B0' },
  { id: 'body.sky', category: 'body', name: 'Небесный', price: 45, color: '#7FA8E0' },

  // Футболка (none — видно цвет тела)
  { id: 'shirt.none', category: 'shirt', name: 'Без футболки', price: 0, color: null },
  { id: 'shirt.teal', category: 'shirt', name: 'Бирюзовая', price: 10, color: PALETTE.teal },
  { id: 'shirt.coral', category: 'shirt', name: 'Коралловая', price: 10, color: PALETTE.coral },
  { id: 'shirt.amber', category: 'shirt', name: 'Янтарная', price: 10, color: PALETTE.amber },
  { id: 'shirt.violet', category: 'shirt', name: 'Фиолетовая', price: 25, color: '#9B7BD8' },

  // Штаны
  { id: 'pants.none', category: 'pants', name: 'Без штанов', price: 0, color: null },
  { id: 'pants.navy', category: 'pants', name: 'Синие', price: 10, color: '#2E3A63' },
  { id: 'pants.forest', category: 'pants', name: 'Зелёные', price: 10, color: '#3E7D5A' },
  { id: 'pants.brick', category: 'pants', name: 'Красные', price: 15, color: '#B34A48' },

  // Наряд — крупная одежда во весь силуэт (мантия/плащ/платье), из неё собираются
  // образы. none — виден базовый герой с рубашкой/штанами.
  { id: 'outfit.none', category: 'outfit', name: 'Без наряда', price: 0, style: null },
  { id: 'outfit.robe', category: 'outfit', name: 'Мантия мага', price: 50, style: 'robe', color: '#6A4BBD' },
  { id: 'outfit.cloak', category: 'outfit', name: 'Плащ ассасина', price: 50, style: 'cloak', color: '#2B2F3A' },
  { id: 'outfit.dress', category: 'outfit', name: 'Платье принцессы', price: 60, style: 'dress', color: '#EF8FC0' },
  { id: 'outfit.knight', category: 'outfit', name: 'Латы рыцаря', price: 70, style: 'knight', color: '#9AA6B8' },

  // Шапка
  { id: 'hat.none', category: 'hat', name: 'Без шапки', price: 0, style: null },
  { id: 'hat.cap', category: 'hat', name: 'Кепка', price: 20, style: 'cap', color: PALETTE.coral },
  { id: 'hat.beanie', category: 'hat', name: 'Шапочка', price: 20, style: 'beanie', color: PALETTE.teal },
  { id: 'hat.bow', category: 'hat', name: 'Бантик', price: 30, style: 'bow', color: '#EF8FC0' },
  { id: 'hat.hood', category: 'hat', name: 'Капюшон', price: 40, style: 'hood', color: '#2B2F3A' },
  { id: 'hat.wizard', category: 'hat', name: 'Колпак мага', price: 55, style: 'wizard', color: '#9B7BD8' },
  { id: 'hat.tiara', category: 'hat', name: 'Тиара', price: 70, style: 'tiara', color: PALETTE.amber },
  { id: 'hat.crown', category: 'hat', name: 'Корона', price: 90, style: 'crown', color: PALETTE.amber },

  // Борода
  { id: 'beard.none', category: 'beard', name: 'Без бороды', price: 0, style: null },
  { id: 'beard.short', category: 'beard', name: 'Щетина', price: 15, style: 'short', color: '#6B5140' },
  { id: 'beard.long', category: 'beard', name: 'Длинная', price: 30, style: 'long', color: '#7A7A7A' },
  { id: 'beard.wizard', category: 'beard', name: 'Борода мудреца', price: 45, style: 'long', color: PALETTE.chalk }
];

export const COSMETICS_BY_ID = new Map(COSMETICS.map((item) => [item.id, item]));

// Что надето по умолчанию: базовый бесплатный предмет каждой категории.
export const DEFAULT_SKIN = {
  body: 'body.chalk',
  shirt: 'shirt.none',
  pants: 'pants.none',
  outfit: 'outfit.none',
  hat: 'hat.none',
  beard: 'beard.none'
};

// Предметы, доступные с самого начала (цена 0) — их «покупать» не нужно.
export const FREE_ITEMS = COSMETICS.filter((item) => item.price === 0).map((item) => item.id);

export function itemsByCategory(category) {
  return COSMETICS.filter((item) => item.category === category);
}
