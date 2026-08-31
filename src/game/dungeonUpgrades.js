// Постоянные улучшения данжа: покупаются за монеты из кошелька (те же, что в
// гардеробе) и действуют во всех будущих забегах. Названия/описания — контент,
// живут тут строкой, как имена скинов. Числа на ощупь.

export const UPGRADES = [
  { id: 'vitality', name: 'Живучесть',   desc: '+1 к макс. HP за уровень',        max: 5, base: 20 },
  { id: 'power',    name: 'Мощь',        desc: '+0.2 к урону за уровень',          max: 5, base: 25 },
  { id: 'nova',     name: 'Заряды Новы', desc: '+1 стартовая «Нова» за уровень',   max: 3, base: 30 },
  { id: 'swift',    name: 'Ловкость',    desc: '−0.08 с к перезарядке рывка',      max: 3, base: 30 },
  { id: 'fortune',  name: 'Удача',       desc: '+1 к ценности монет за уровень',   max: 3, base: 25 }
];

export const UPGRADE_BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));

// Цена следующего уровня растёт линейно: base, 2·base, 3·base…
export function upgradeCost(upgrade, currentLevel) {
  return upgrade.base * (currentLevel + 1);
}

// Из уровней улучшений — конкретные бонусы, которые применяет сессия при старте.
export function upgradeBonuses(levels = {}) {
  return {
    maxHp: levels.vitality ?? 0,
    dmgMul: (levels.power ?? 0) * 0.2,
    bombs: levels.nova ?? 0,
    dashCdReduce: (levels.swift ?? 0) * 0.08,
    coinBonus: levels.fortune ?? 0
  };
}
