// Звук целиком синтезируется на WebAudio: ни одного файла ассетов. Так игра
// остаётся статикой на пару десятков килобайт, а «короткие ogg/wav суммарно
// меньше 300 КБ» из ТЗ превращается в ноль килобайт.
//
// Браузер не даст запустить звук до первого действия пользователя — поэтому
// контекст создаётся не при загрузке, а по первому нажатию или касанию.

const MASTER_VOLUME = 0.4;

// Ноты в герцах: до-мажорная гамма звучит дружелюбно и не режет ухо.
const NOTE = { c4: 262, e4: 330, g4: 392, c5: 523, e5: 659, g5: 784, c6: 1047 };

export function createAudio(settings = { sound: true }) {
  let ctx = null;
  let master = null;
  let enabled = { ...settings };

  // Первый жест пользователя — единственный момент, когда можно завести звук.
  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }

    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;

    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(ctx.destination);
  }

  function tone({ from, to = from, type = 'triangle', duration = 0.12, gain = 0.3, delay = 0 }) {
    if (!ctx || !enabled.sound) return;

    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);

    // Резкая атака и мягкий спад: без спада каждый звук щёлкает на обрыве.
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  const voices = {
    jump: () => tone({ from: 300, to: 620, duration: 0.11, gain: 0.22 }),
    // Батут: длинное «бо-о-инг» вверх — выше и дольше обычного прыжка, чтобы ухо
    // сразу отличало отскок от него.
    spring: () => tone({ from: 200, to: 860, type: 'triangle', duration: 0.22, gain: 0.24 }),
    land: () => tone({ from: 180, to: 120, duration: 0.07, gain: 0.12 }),
    coin: () => {
      tone({ from: NOTE.e5, duration: 0.07, gain: 0.2, type: 'square' });
      tone({ from: NOTE.g5, duration: 0.09, gain: 0.18, type: 'square', delay: 0.06 });
    },
    key: () => {
      [NOTE.c5, NOTE.e5, NOTE.g5, NOTE.c6].forEach((note, index) =>
        tone({ from: note, duration: 0.16, gain: 0.16, delay: index * 0.07 })
      );
    },
    checkpoint: () => {
      tone({ from: NOTE.g4, duration: 0.12, gain: 0.16 });
      tone({ from: NOTE.c5, duration: 0.16, gain: 0.16, delay: 0.09 });
    },
    correct: () => {
      [NOTE.c5, NOTE.e5, NOTE.g5].forEach((note, index) =>
        tone({ from: note, duration: 0.22, gain: 0.18, delay: index * 0.09 })
      );
    },
    // Ошибка звучит мягко и низко. Ошибка — часть работы, пугать ею незачем.
    wrong: () => tone({ from: 220, to: 165, type: 'sine', duration: 0.24, gain: 0.16 }),
    door: () => {
      tone({ from: 140, to: 90, type: 'sawtooth', duration: 0.34, gain: 0.12 });
      tone({ from: NOTE.c5, duration: 0.3, gain: 0.14, delay: 0.12 });
      tone({ from: NOTE.g5, duration: 0.36, gain: 0.12, delay: 0.24 });
    },
    hurt: () => tone({ from: 260, to: 90, type: 'sawtooth', duration: 0.28, gain: 0.18 }),
    // Бой в данже. Выстрел частый — держим тихим и коротким, чтобы не утомлял.
    shoot: () => tone({ from: 660, to: 500, type: 'square', duration: 0.05, gain: 0.05 }),
    enemyHit: () => tone({ from: 320, to: 230, type: 'triangle', duration: 0.06, gain: 0.1 }),
    enemyDie: () => tone({ from: 300, to: 80, type: 'sawtooth', duration: 0.18, gain: 0.16 }),
    // Залп босса — ниже и весомее выстрела игрока, чтобы на слух отличать чужую атаку.
    bossShot: () => tone({ from: 300, to: 140, type: 'square', duration: 0.14, gain: 0.11 }),
    // Выезд шипов: короткий металлический «шшк» — слышно предупреждение, даже не глядя.
    trap: () => tone({ from: 700, to: 260, type: 'sawtooth', duration: 0.08, gain: 0.07 }),
    complete: () => {
      [NOTE.c5, NOTE.e5, NOTE.g5, NOTE.c6].forEach((note, index) =>
        tone({ from: note, duration: 0.4, gain: 0.16, delay: index * 0.12 })
      );
    }
  };

  return {
    unlock,

    play(name) {
      voices[name]?.();
    },

    setSetting(name, value) {
      enabled[name] = value;
    },

    get started() {
      return ctx !== null;
    }
  };
}
