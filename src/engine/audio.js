// Звук целиком синтезируется на WebAudio: ни одного файла ассетов. Так игра
// остаётся статикой на пару десятков килобайт, а «короткие ogg/wav суммарно
// меньше 300 КБ» из ТЗ превращается в ноль килобайт.
//
// Браузер не даст запустить звук до первого действия пользователя — поэтому
// контекст создаётся не при загрузке, а по первому нажатию или касанию.

const MASTER_VOLUME = 0.4;
const MUSIC_VOLUME = 0.05;

// Ноты в герцах: до-мажорная гамма звучит дружелюбно и не режет ухо.
const NOTE = { c4: 262, e4: 330, g4: 392, c5: 523, e5: 659, g5: 784, c6: 1047 };

export function createAudio(settings = { sound: true, music: true }) {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let musicNodes = [];
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

    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);

    if (enabled.music) startMusic();
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
    complete: () => {
      [NOTE.c5, NOTE.e5, NOTE.g5, NOTE.c6].forEach((note, index) =>
        tone({ from: note, duration: 0.4, gain: 0.16, delay: index * 0.12 })
      );
    }
  };

  // Музыка — тихий фон из двух расстроенных нот, без ритма и мелодии: она не
  // должна соревноваться с задачей за внимание ребёнка.
  function startMusic() {
    if (!ctx || musicNodes.length > 0) return;

    for (const [frequency, detune] of [[NOTE.c4, -6], [NOTE.g4, 5]]) {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      oscillator.connect(musicGain);
      oscillator.start();
      musicNodes.push(oscillator);
    }

    // Медленное дыхание громкости, чтобы фон не был мёртвой стеной звука.
    const breath = ctx.createOscillator();
    const depth = ctx.createGain();
    breath.frequency.value = 0.07;
    depth.gain.value = MUSIC_VOLUME * 0.5;
    breath.connect(depth);
    depth.connect(musicGain.gain);
    breath.start();
    musicNodes.push(breath);

    musicGain.gain.setValueAtTime(0, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(MUSIC_VOLUME, ctx.currentTime + 4);
  }

  function stopMusic() {
    if (!ctx) return;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    for (const node of musicNodes) node.stop(ctx.currentTime + 0.8);
    musicNodes = [];
  }

  return {
    unlock,

    play(name) {
      voices[name]?.();
    },

    setSetting(name, value) {
      enabled[name] = value;
      if (name !== 'music') return;
      if (value) startMusic();
      else stopMusic();
    },

    get started() {
      return ctx !== null;
    }
  };
}
