/* Snake Retro - v3.0 | 10 niveles, dificultad progresiva */
(() => {
  // ---------------- Constantes ----------------
  const BLOCK = 20;
  const W = 960, H = 960;

  // 10 niveles: { tema, velocidad, comidas para subir, segundos para subir }
  const LEVELS = [
    { theme: "CLASICO", speed: 6,  foods: 8, secs: 45 }, // 1
    { theme: "CLASICO", speed: 7,  foods: 8, secs: 45 }, // 2
    { theme: "CLASICO", speed: 8,  foods: 8, secs: 45 }, // 3
    { theme: "NEON",    speed: 9,  foods: 8, secs: 45 }, // 4
    { theme: "NEON",    speed: 10, foods: 8, secs: 45 }, // 5
    { theme: "NEON",    speed: 12, foods: 8, secs: 45 }, // 6
    { theme: "AMBAR",   speed: 13, foods: 8, secs: 45 }, // 7
    { theme: "AMBAR",   speed: 15, foods: 8, secs: 45 }, // 8
    { theme: "AMBAR",   speed: 17, foods: 8, secs: 45 }, // 9
    { theme: "AMBAR",   speed: 20, foods: 8, secs: 45 }, // 10 (infinito)
  ];

  const THEMES = {
    CLASICO: { snake: "#00FF00", food: "#FF3333", frame: "#00FF00", grid: "#1a2e1a", title: "#00FF00", obstacle: "#00FF00" },
    NEON:    { snake: "#00FFFF", food: "#FF00FF", frame: "#00FFFF", grid: "#0d1f1f", title: "#00FFFF", obstacle: "#00FFFF" },
    AMBAR:   { snake: "#FFB400", food: "#FF5000", frame: "#FFB400", grid: "#2a1e08", title: "#FFD240", obstacle: "#FFB400" },
  };

  // ---------------- Power-ups ----------------
  const POWERUPS = {
    SLOW:   { icon: "🐢", label: "Lento",    color: "#00FFFF", duration: 5000 },
    DOUBLE: { icon: "⭐", label: "x2 Pts",   color: "#FFE000", duration: 8000 },
    SHIELD: { icon: "🛡️", label: "Escudo",   color: "#FF44FF", duration: null }, // uso único
  };
  const PU_TYPES = Object.keys(POWERUPS);
  const PU_SPAWN_EVERY = 20000; // cada 20 seg
  const PU_LIFETIME   = 8000;  // desaparece a los 8 seg si no se recoge

  // ---------------- DOM ----------------
  const canvas   = document.getElementById("stage");
  const ctx      = canvas.getContext("2d");
  const overlay  = document.getElementById("overlay");
  const nameEl   = document.getElementById("name");
  const volEl    = document.getElementById("volume");
  const volFxEl  = document.getElementById("volumeFx");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const bgm      = document.getElementById("bgm");
  const pad      = document.getElementById("pad");
  // Progress sidebar
  const progressBar   = document.getElementById("progressBar");
  const progressFoods = document.getElementById("progressFoods");
  const progressTime  = document.getElementById("progressTime");
  const levelBadge    = document.getElementById("levelBadge");
  const themePill     = document.getElementById("themePill");
  const activePUCard  = document.getElementById("activePUCard");
  // Última partida
  const lastScore    = document.getElementById("lastScore");
  const lastLevel    = document.getElementById("lastLevel");
  const lastDur      = document.getElementById("lastDur");
  const lastGameDate = document.getElementById("lastGameDate");
  const bestScore    = document.getElementById("bestScore");
  const bestDur      = document.getElementById("bestDur");
  // Modal audio
  const audioBtn    = document.getElementById("audioBtn");
  const audioModal  = document.getElementById("audioModal");
  const audioClose  = document.getElementById("audioClose");
  const muteAll     = document.getElementById("muteAll");
  const volMusicVal = document.getElementById("volMusicVal");
  const volFxVal    = document.getElementById("volFxVal");

  // ---------------- Audio (Web Audio API) ----------------
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function getVolume()   { return parseFloat(volFxEl?.value  ?? "0.5");  }
  function getMusicVol() { return parseFloat(volEl?.value    ?? "0.35"); }

  // Tono sintético genérico
  function playTone({ freq = 440, freq2, type = "square", duration = 0.08, vol = 0.18, delay = 0 }) {
    try {
      const ac = getAudioCtx();
      const t = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (freq2 !== undefined) osc.frequency.linearRampToValueAtTime(freq2, t + duration);
      gain.gain.setValueAtTime(vol * getVolume() * 2.5, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(t); osc.stop(t + duration + 0.01);
    } catch {}
  }

  const SFX = {
    eat() {
      // Pip ascendente
      playTone({ freq: 520, freq2: 880, type: "square", duration: 0.07, vol: 0.15 });
    },
    levelUp() {
      // Fanfarria corta: 3 notas
      [0, 0.1, 0.2].forEach((delay, i) => {
        const notes = [523, 659, 784];
        playTone({ freq: notes[i], type: "square", duration: 0.12, vol: 0.18, delay });
      });
    },
    die() {
      // Descenso dramático
      playTone({ freq: 400, freq2: 80, type: "sawtooth", duration: 0.45, vol: 0.25 });
      playTone({ freq: 200, freq2: 40, type: "sawtooth", duration: 0.45, vol: 0.15, delay: 0.1 });
    },
    move() {
      // Tick sutil (opcional, muy bajo volumen)
      playTone({ freq: 120, type: "sine", duration: 0.02, vol: 0.03 });
    },
    powerup() {
      // Acorde mágico ascendente
      playTone({ freq: 660, freq2: 1320, type: "sine", duration: 0.18, vol: 0.18 });
      playTone({ freq: 880, freq2: 1760, type: "sine", duration: 0.18, vol: 0.12, delay: 0.06 });
    },
    shieldHit() {
      // Golpe absorbido — clonk metálico
      playTone({ freq: 300, freq2: 150, type: "square", duration: 0.15, vol: 0.2 });
    },
  };

  // ---------------- Estado ----------------
  let state = null;
  let tickTimer = null;

  // ---------------- HiDPI ----------------
  function fitHiDPI() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = "100%";
    canvas.style.maxWidth = W + "px";
    canvas.style.height = "auto";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", fitHiDPI);

  // ---------------- Scores (localStorage) ----------------
  const LS_DUR = "snakeScoresDurations_v3";
  const LS_PTS = "snakeScoresPoints_v3";
  const LS_LAST = "snakeLastGame_v3";

  function loadScores() {
    return {
      durations: JSON.parse(localStorage.getItem(LS_DUR)  || "[]"),
      points:    JSON.parse(localStorage.getItem(LS_PTS)  || "[]"),
    };
  }
  function saveScores({ durations, points }) {
    localStorage.setItem(LS_DUR, JSON.stringify(durations.slice(0, 10)));
    localStorage.setItem(LS_PTS, JSON.stringify(points.slice(0, 10)));
  }
  function pushScore(jugador, dur, pts, level) {
    const sc = loadScores();
    sc.durations.push({ jugador, valor: dur });
    sc.durations.sort((a, b) => b.valor - a.valor);
    sc.points.push({ jugador, valor: pts | 0 });
    sc.points.sort((a, b) => b.valor - a.valor);
    saveScores(sc);
    // Guardar última partida
    const last = { jugador, dur: +dur.toFixed(1), pts: pts | 0, level: level + 1, ts: Date.now() };
    localStorage.setItem(LS_LAST, JSON.stringify(last));
    updateLastGameCard(last, sc);
  }

  function updateLastGameCard(last, sc) {
    if (!last) {
      last = JSON.parse(localStorage.getItem(LS_LAST) || "null");
      sc   = sc || loadScores();
    }
    if (!last) return;
    if (lastScore)    lastScore.textContent    = last.pts;
    if (lastLevel)    lastLevel.textContent    = `Nv ${last.level}`;
    if (lastDur)      lastDur.textContent      = `${last.dur}s`;
    if (lastGameDate) {
      const d = new Date(last.ts);
      lastGameDate.textContent = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    }
    if (!sc) sc = loadScores();
    if (bestScore && sc.points.length)    bestScore.textContent = `${sc.points[0].valor} pts`;
    if (bestDur   && sc.durations.length) bestDur.textContent   = `${(+sc.durations[0].valor).toFixed(1)}s`;
  }

  // ---------------- Grid ----------------
  function gridCols() { return (W / BLOCK) | 0; }
  function gridRows() { return (H / BLOCK) | 0; }

  // ---------------- Obstáculos por nivel ----------------
  function buildObstacles(levelIndex) {
    const obs = new Set();
    const cols = gridCols(), rows = gridRows();
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    const add = (x, y) => obs.add(`${x},${y}`);

    // Nivel 10: rotación aleatoria entre 3 patrones
    const lvl = levelIndex + 1;

    if (lvl === 1) {
      // Sin obstáculos

    } else if (lvl === 2) {
      // Barra horizontal central
      for (let x = 8; x < cols - 8; x++) add(x, cy);

    } else if (lvl === 3) {
      // Dos barras verticales
      for (let y = 8; y < rows - 8; y++) {
        add(Math.floor(cols / 3), y);
        add(Math.floor(cols * 2 / 3), y);
      }

    } else if (lvl === 4) {
      // Marco cuadrado central
      const s = 7;
      for (let x = cx - s; x <= cx + s; x++) {
        add(x, cy - s); add(x, cy + s);
      }
      for (let y = cy - s + 1; y < cy + s; y++) {
        add(cx - s, y); add(cx + s, y);
      }

    } else if (lvl === 5) {
      // Cruz central
      for (let x = cx - 8; x <= cx + 8; x++) add(x, cy);
      for (let y = cy - 8; y <= cy + 8; y++) add(cx, y);

    } else if (lvl === 6) {
      // Cruz + 4 bloques en esquinas
      for (let x = cx - 6; x <= cx + 6; x++) add(x, cy);
      for (let y = cy - 6; y <= cy + 6; y++) add(cx, y);
      // Bloques 3x3 en esquinas
      const corners = [[5,5],[cols-8,5],[5,rows-8],[cols-8,rows-8]];
      corners.forEach(([bx, by]) => {
        for (let dx = 0; dx < 3; dx++)
          for (let dy = 0; dy < 3; dy++)
            add(bx + dx, by + dy);
      });

    } else if (lvl === 7) {
      // Forma de H (laberinto simple)
      for (let y = 5; y < rows - 5; y++) {
        add(Math.floor(cols / 4), y);
        add(Math.floor(cols * 3 / 4), y);
      }
      for (let x = Math.floor(cols / 4); x <= Math.floor(cols * 3 / 4); x++) {
        add(x, cy);
      }

    } else if (lvl === 8) {
      // Doble marco concéntrico — pasillo angosto
      const s1 = 10, s2 = 6;
      for (let x = cx - s1; x <= cx + s1; x++) {
        add(x, cy - s1); add(x, cy + s1);
      }
      for (let y = cy - s1 + 1; y < cy + s1; y++) {
        add(cx - s1, y); add(cx + s1, y);
      }
      for (let x = cx - s2; x <= cx + s2; x++) {
        add(x, cy - s2); add(x, cy + s2);
      }
      for (let y = cy - s2 + 1; y < cy + s2; y++) {
        add(cx - s2, y); add(cx + s2, y);
      }

    } else if (lvl === 9) {
      // Espiral incompleta (laberinto en espiral)
      // Brazo superior izquierdo
      for (let x = 4; x <= cx + 2; x++) add(x, 5);
      // Brazo derecho
      for (let y = 5; y <= cy + 2; y++) add(cols - 5, y);
      // Brazo inferior derecho
      for (let x = cx - 2; x <= cols - 5; x++) add(x, rows - 5);
      // Brazo izquierdo interior
      for (let y = cy - 2; y <= rows - 5; y++) add(5, y);
      // Brazo superior interior
      for (let x = 5; x <= cx + 5; x++) add(x, cy - 3);

    } else if (lvl === 10) {
      // Nivel infinito: patrón cambia cada vez que se llama (aleatorio entre 3)
      const r = (state && state.lvl10Pattern !== undefined) ? state.lvl10Pattern : Math.floor(Math.random() * 3);
      if (r === 0) {
        // Cruz + marco
        for (let x = cx - 5; x <= cx + 5; x++) add(x, cy);
        for (let y = cy - 5; y <= cy + 5; y++) add(cx, y);
        const s = 9;
        for (let x = cx - s; x <= cx + s; x++) { add(x, cy - s); add(x, cy + s); }
        for (let y = cy - s + 1; y < cy + s; y++) { add(cx - s, y); add(cx + s, y); }
      } else if (r === 1) {
        // Doble H
        const offsets = [Math.floor(cols/5), Math.floor(cols*4/5)];
        offsets.forEach(bx => {
          for (let y = 5; y < rows - 5; y++) add(bx, y);
        });
        for (let x = offsets[0]; x <= offsets[1]; x++) { add(x, Math.floor(rows/3)); add(x, Math.floor(rows*2/3)); }
      } else {
        // Espiral + bloques
        for (let x = 4; x <= cx; x++) add(x, 5);
        for (let y = 5; y <= cy; y++) add(cols - 5, y);
        for (let x = cx; x <= cols - 5; x++) add(x, rows - 5);
        for (let y = cy; y <= rows - 5; y++) add(5, y);
        [[cx-3,cy-3],[cx+3,cy-3],[cx-3,cy+3],[cx+3,cy+3]].forEach(([bx,by]) => {
          for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) add(bx+dx,by+dy);
        });
      }
    }

    return obs;
  }

  // Nivel 10: rotar patrón cada 20 segundos
  let lvl10RotateTimer = null;
  function startLvl10Rotation() {
    stopLvl10Rotation();
    if (!state || state.levelIndex !== 9) return;
    lvl10RotateTimer = setInterval(() => {
      if (!state || state.paused || !state.running) return;
      state.lvl10Pattern = Math.floor(Math.random() * 3);
      state.obstacles = buildObstacles(9);
      // Asegurar que la comida siga siendo alcanzable
      state.food = spawnFoodReachable(state.snake, state.obstacles);
    }, 20000);
  }
  function stopLvl10Rotation() {
    if (lvl10RotateTimer) clearInterval(lvl10RotateTimer);
    lvl10RotateTimer = null;
  }

  // ---------------- Dibujo ----------------
  function clear() { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }

  function drawFrame(theme) {
    ctx.strokeStyle = theme.frame; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += BLOCK) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += BLOCK) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  function drawSnake(theme, snake) {
    // Degradado: cabeza más brillante, cola más oscura
    snake.forEach((p, i) => {
      const t = snake.length > 1 ? i / (snake.length - 1) : 1;
      ctx.globalAlpha = 0.35 + t * 0.65;
      ctx.fillStyle = theme.snake;
      ctx.fillRect(p.x * BLOCK + 1, p.y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
    });
    ctx.globalAlpha = 1;
    // Cabeza con borde
    const head = snake[snake.length - 1];
    ctx.fillStyle = "#fff";
    ctx.fillRect(head.x * BLOCK + 1, head.y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
    ctx.fillStyle = theme.snake;
    ctx.fillRect(head.x * BLOCK + 3, head.y * BLOCK + 3, BLOCK - 6, BLOCK - 6);
  }

  function drawFood(theme, food) {
    if (!food) return;
    // Comida pulsante (simple)
    const t = (performance.now() % 600) / 600;
    const margin = 2 + Math.sin(t * Math.PI * 2) * 1.5;
    ctx.fillStyle = theme.food;
    ctx.fillRect(
      food.x * BLOCK + margin,
      food.y * BLOCK + margin,
      BLOCK - margin * 2,
      BLOCK - margin * 2
    );
  }

  function drawObstacles(theme, obstacles) {
    ctx.fillStyle = theme.obstacle + "33"; // sutil relleno
    ctx.strokeStyle = theme.obstacle;
    ctx.lineWidth = 2;
    obstacles.forEach(key => {
      const [x, y] = key.split(",").map(Number);
      ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
      ctx.strokeRect(x * BLOCK + 2, y * BLOCK + 2, BLOCK - 4, BLOCK - 4);
    });
  }

  function drawHUD(state) {
    const theme = state.theme;
    ctx.font = "bold 15px monospace";
    ctx.fillStyle = theme.title;
    ctx.globalAlpha = 0.85;
    const elapsed = ((performance.now() - state.startedAt) / 1000).toFixed(0);
    const lvlNext = state.levelIndex < 9 ? `Siguiente: ${state.foodsInLevel}/${LEVELS[state.levelIndex].foods} 🍎` : "Nivel MAX";
    ctx.fillText(`Nv ${state.levelIndex + 1}  |  ${state.score} pts  |  ${elapsed}s  |  ${lvlNext}`, 10, H - 8);
    ctx.globalAlpha = 1;
  }

  // ---------------- Partículas ----------------
  let particles = [];

  function spawnParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3;
      particles.push({
        x: x * BLOCK + BLOCK / 2,
        y: y * BLOCK + BLOCK / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.04 + Math.random() * 0.04,
        size: 2 + Math.random() * 3,
        color,
      });
    }
  }

  function spawnDeathParticles(snake, color) {
    snake.forEach((p, i) => {
      setTimeout(() => spawnParticles(p.x, p.y, color, 6), i * 18);
    });
  }

  function updateParticles() {
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.12; // gravedad leve
      p.life -= p.decay;
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  function showCenterText(html) {
    overlay.innerHTML = `<div class="box">${html}</div>`;
  }
  function hideOverlay() { overlay.innerHTML = ""; }

  // ---------------- Spawn ----------------
  function isReachable(from, to, obstacles, snakeSet, cols, rows) {
    if (from.x === to.x && from.y === to.y) return true;
    const q = [from];
    const seen = new Set([`${from.x},${from.y}`]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (q.length) {
      const p = q.shift();
      for (const [dx, dy] of dirs) {
        const nx = p.x + dx, ny = p.y + dy;
        const k = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (obstacles.has(k) || snakeSet.has(k) || seen.has(k)) continue;
        if (nx === to.x && ny === to.y) return true;
        seen.add(k); q.push({ x: nx, y: ny });
      }
    }
    return false;
  }

  function spawnFoodReachable(snake, obstacles) {
    const cols = gridCols(), rows = gridRows();
    const snakeSet = new Set(snake.map(p => `${p.x},${p.y}`));
    const free = [];
    for (let x = 0; x < cols; x++)
      for (let y = 0; y < rows; y++) {
        const k = `${x},${y}`;
        if (!snakeSet.has(k) && !obstacles.has(k)) free.push({ x, y });
      }
    if (!free.length) return null;
    for (let i = free.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [free[i], free[j]] = [free[j], free[i]];
    }
    const head = snake[snake.length - 1];
    for (const cand of free.slice(0, 300)) {
      if (isReachable(head, cand, obstacles, snakeSet, cols, rows)) return cand;
    }
    return free[0];
  }

  // ---------------- Juego ----------------
  function startGameFromUI() {
    stopLvl10Rotation();
    const jugador = (nameEl.value || "Jugador").trim().slice(0, 18);
    const cols = gridCols(), rows = gridRows();
    const head = { x: (cols / 2) | 0, y: (rows / 2) | 0 };
    const levelIndex = 0;
    const levelDef = LEVELS[levelIndex];
    const obstacles = buildObstacles(levelIndex);
    const snake = [head];
    const food = spawnFoodReachable(snake, obstacles);

    state = {
      jugador, levelIndex,
      theme: THEMES[levelDef.theme],
      themeKey: levelDef.theme,
      cols, rows, snake,
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      obstacles, food,
      score: 0,
      foodsInLevel: 0,
      levelStartTime: performance.now(),
      speed: levelDef.speed,
      startedAt: performance.now(),
      running: true, paused: false, ready: true,
      lvl10Pattern: 0,
      // power-ups
      powerup: null,          // { type, x, y, spawnedAt }
      activePU: null,         // { type, endsAt } — efecto activo
      lastPUSpawn: performance.now(),
      shield: false,
    };

    const volume = getMusicVol();
    try { bgm.volume = volume; bgm.currentTime = 0; bgm.play().catch(() => {}); } catch {}

    drawScene();
    showCenterText("Presiona <kbd>Espacio</kbd> para comenzar");
  }

  function tryLevelUp() {
    if (!state || state.levelIndex >= 9) return;
    const def = LEVELS[state.levelIndex];
    const elapsed = (performance.now() - state.levelStartTime) / 1000;
    if (state.foodsInLevel >= def.foods || elapsed >= def.secs) {
      state.levelIndex++;
      const newDef = LEVELS[state.levelIndex];
      state.theme = THEMES[newDef.theme];
      state.themeKey = newDef.theme;
      state.speed = newDef.speed;
      state.foodsInLevel = 0;
      state.levelStartTime = performance.now();
      if (state.levelIndex === 9) state.lvl10Pattern = Math.floor(Math.random() * 3);
      state.obstacles = buildObstacles(state.levelIndex);
      // Verificar que la comida siga siendo válida
      if (state.food && state.obstacles.has(`${state.food.x},${state.food.y}`)) {
        state.food = spawnFoodReachable(state.snake, state.obstacles);
      }
      retime();
      if (state.levelIndex === 9) startLvl10Rotation();
      SFX.levelUp();
      // Flash de nivel
      showCenterText(`⬆ NIVEL ${state.levelIndex + 1}`);
      setTimeout(() => { if (state && state.running && !state.paused) hideOverlay(); }, 1200);
    }
  }

  // ---------------- Power-up helpers ----------------
  function spawnPowerup() {
    if (!state || state.levelIndex === 0 || state.powerup) return; // no en nivel 1
    const type = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
    const cols = gridCols(), rows = gridRows();
    const snakeSet = new Set(state.snake.map(p => `${p.x},${p.y}`));
    const free = [];
    for (let x = 0; x < cols; x++)
      for (let y = 0; y < rows; y++) {
        const k = `${x},${y}`;
        if (!snakeSet.has(k) && !state.obstacles.has(k) &&
            !(state.food && state.food.x === x && state.food.y === y))
          free.push({ x, y });
      }
    if (!free.length) return;
    const pos = free[Math.floor(Math.random() * free.length)];
    state.powerup = { type, x: pos.x, y: pos.y, spawnedAt: performance.now() };
  }

  function tickPowerups() {
    if (!state) return;
    const now = performance.now();

    // Expirar power-up en tablero
    if (state.powerup && now - state.powerup.spawnedAt > PU_LIFETIME) {
      state.powerup = null;
    }

    // Spawn periódico (solo nivel >= 2)
    if (!state.powerup && state.levelIndex > 0 && now - state.lastPUSpawn > PU_SPAWN_EVERY) {
      state.lastPUSpawn = now;
      spawnPowerup();
    }

    // Expirar efecto activo (excepto shield que es por uso)
    if (state.activePU && state.activePU.endsAt && now > state.activePU.endsAt) {
      deactivatePU();
    }
  }

  function collectPowerup() {
    if (!state.powerup) return;
    const { type } = state.powerup;
    const def = POWERUPS[type];
    state.powerup = null;
    state.lastPUSpawn = performance.now(); // reinicia contador de spawn
    SFX.powerup();
    spawnParticles(
      state.snake[state.snake.length - 1].x,
      state.snake[state.snake.length - 1].y,
      def.color, 16
    );

    // Desactivar efecto anterior si lo había
    if (state.activePU) deactivatePU(true);

    if (type === "SLOW") {
      state.activePU = { type, endsAt: performance.now() + def.duration };
      state._baseSpeed = state.speed;
      state.speed = Math.max(3, Math.floor(state.speed / 2));
      retime();
    } else if (type === "DOUBLE") {
      state.activePU = { type, endsAt: performance.now() + def.duration };
    } else if (type === "SHIELD") {
      state.activePU = { type, endsAt: null };
      state.shield = true;
    }
  }

  function deactivatePU(silent = false) {
    if (!state.activePU) return;
    const { type } = state.activePU;
    if (type === "SLOW" && state._baseSpeed) {
      state.speed = state._baseSpeed;
      delete state._baseSpeed;
      retime();
    } else if (type === "SHIELD") {
      state.shield = false;
    }
    state.activePU = null;
  }

  function drawPowerup() {
    if (!state.powerup) return;
    const { x, y, type, spawnedAt } = state.powerup;
    const def = POWERUPS[type];
    const age = performance.now() - spawnedAt;
    const remaining = 1 - age / PU_LIFETIME;

    // Parpadeo cuando queda poco tiempo
    if (remaining < 0.3 && Math.floor(performance.now() / 200) % 2 === 0) return;

    // Fondo pulsante
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
    ctx.globalAlpha = 0.25 + pulse * 0.2;
    ctx.fillStyle = def.color;
    ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
    ctx.globalAlpha = 1;

    // Borde
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);

    // Ícono centrado
    ctx.font = `${BLOCK - 4}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.icon, x * BLOCK + BLOCK / 2, y * BLOCK + BLOCK / 2 + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  function drawActivePU() {
    if (!state.activePU) return;
    const { type, endsAt } = state.activePU;
    const def = POWERUPS[type];
    const remaining = endsAt ? Math.max(0, (endsAt - performance.now()) / 1000) : null;
    const label = remaining !== null ? `${def.icon} ${def.label} ${remaining.toFixed(1)}s` : `${def.icon} ${def.label}`;

    // Píldora en esquina superior derecha del canvas
    ctx.font = "bold 14px monospace";
    const tw = ctx.measureText(label).width;
    const px = W - tw - 18, py = 10;
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#000";
    ctx.fillRect(px - 6, py, tw + 12, 20);
    ctx.globalAlpha = 1;
    ctx.fillStyle = def.color;
    ctx.fillText(label, px, py + 14);
  }

  function startLoop() { stopLoop(); tickTimer = setInterval(tick, 1000 / (state.speed || 10)); }
  function stopLoop()  { if (tickTimer) clearInterval(tickTimer); tickTimer = null; }
  function retime()    { if (!state) return; stopLoop(); tickTimer = setInterval(tick, 1000 / Math.min(25, state.speed)); }

  function tick() {
    if (!state || !state.running || state.paused || state.ready) return;

    tryLevelUp();
    tickPowerups();

    state.dir = { ...state.nextDir };
    const head = state.snake[state.snake.length - 1];
    const nx = head.x + state.dir.x, ny = head.y + state.dir.y;

    // Colisiones — el escudo absorbe una muerte
    const hitWall = nx < 0 || ny < 0 || nx >= state.cols || ny >= state.rows;
    const hitSelf = state.snake.some(p => p.x === nx && p.y === ny);
    const hitObs  = state.obstacles.has(`${nx},${ny}`);

    if (hitWall || hitSelf || hitObs) {
      if (state.shield) {
        // Escudo absorbe el golpe
        state.shield = false;
        state.activePU = null;
        SFX.shieldHit();
        spawnParticles(head.x, head.y, POWERUPS.SHIELD.color, 20);
        return; // sobrevive, no avanza
      }
      return gameOver();
    }

    const newHead = { x: nx, y: ny };
    state.snake.push(newHead);

    // ¿Recogió power-up?
    if (state.powerup && newHead.x === state.powerup.x && newHead.y === state.powerup.y) {
      collectPowerup();
    }

    if (state.food && newHead.x === state.food.x && newHead.y === state.food.y) {
      const pts = (10 + state.levelIndex * 5) * (state.activePU?.type === "DOUBLE" ? 2 : 1);
      state.score += pts;
      state.foodsInLevel++;
      SFX.eat();
      spawnParticles(newHead.x, newHead.y, state.theme.food, 12);
      tryLevelUp();
      state.food = spawnFoodReachable(state.snake, state.obstacles);
    } else {
      state.snake.shift();
    }

    drawScene();
  }

  function drawScene() {
    if (!state) return;
    clear();
    drawFrame(state.theme);
    drawObstacles(state.theme, state.obstacles);
    drawSnake(state.theme, state.snake);
    drawFood(state.theme, state.food);
    drawPowerup();
    updateParticles();
    drawParticles();
    if (state.running && !state.ready) {
      drawHUD(state);
      drawActivePU();
    }
  }

  // ---------------- Sidebar progress ----------------
  const THEME_NAMES  = { CLASICO: "Clásico 🟩", NEON: "Neon 🟦", AMBAR: "Ámbar 🟧" };
  const THEME_COLORS = { CLASICO: "#00FF00",     NEON: "#00FFFF", AMBAR: "#FFB400"  };

  function updateSidebarProgress() {
    if (!progressBar) return;
    if (!state || !state.running) {
      progressBar.style.width = "0%";
      if (levelBadge)    levelBadge.textContent    = "Nv —";
      if (themePill)     themePill.textContent      = "—";
      if (progressFoods) progressFoods.textContent  = "";
      if (progressTime)  progressTime.textContent   = "";
      if (activePUCard)  activePUCard.style.display = "none";
      return;
    }
    const def     = LEVELS[state.levelIndex];
    const elapsed = (performance.now() - state.levelStartTime) / 1000;
    const isMax   = state.levelIndex >= 9;
    const color   = THEME_COLORS[state.themeKey];
    const foodPct = isMax ? 1 : Math.min(1, state.foodsInLevel / def.foods);
    const timePct = isMax ? 1 : Math.min(1, elapsed / def.secs);
    const pct     = isMax ? 1 : Math.max(foodPct, timePct);

    progressBar.style.width      = (pct * 100).toFixed(1) + "%";
    progressBar.style.background = color;
    progressBar.style.boxShadow  = `0 0 8px ${color}88`;

    if (levelBadge) levelBadge.textContent = `Nv ${state.levelIndex + 1}${isMax ? " 🔥" : ""}`;
    if (themePill)  {
      themePill.textContent  = THEME_NAMES[state.themeKey];
      themePill.style.color  = color;
      themePill.style.borderColor = color + "66";
    }
    if (progressFoods) progressFoods.textContent = isMax ? "∞" : `${state.foodsInLevel}/${def.foods} 🍎`;
    if (progressTime)  progressTime.textContent  = isMax ? "" : `${elapsed.toFixed(0)}/${def.secs}s ⏱`;

    if (activePUCard) {
      if (state.activePU) {
        const pu  = POWERUPS[state.activePU.type];
        const rem = state.activePU.endsAt
          ? ` ${Math.max(0, (state.activePU.endsAt - performance.now()) / 1000).toFixed(1)}s`
          : "";
        activePUCard.style.display     = "block";
        activePUCard.style.borderColor = pu.color;
        activePUCard.style.color       = pu.color;
        activePUCard.textContent       = `${pu.icon} ${pu.label}${rem}`;
      } else {
        activePUCard.style.display = "none";
      }
    }
  }

  // Animación de comida pulsante (fuera del tick)
  let animFrame = null;
  function animLoop() {
    if (state && state.running && !state.paused && !state.ready) drawScene();
    updateSidebarProgress();
    animFrame = requestAnimationFrame(animLoop);
  }

  function gameOver() {
    state.running = false;
    stopLoop();
    stopLvl10Rotation();
    SFX.die();
    spawnDeathParticles([...state.snake], state.theme.snake);
    try { bgm.pause(); } catch {}
    const dur = (performance.now() - state.startedAt) / 1000;
    pushScore(state.jugador, dur, state.score, state.levelIndex);
    showCenterText(
      `🟥 GAME OVER<br>` +
      `<span style="font-size:14px">` +
      `${escapeHtml(state.jugador)} │ Nivel ${state.levelIndex + 1}<br>` +
      `${dur.toFixed(1)}s │ ${state.score} pts` +
      `</span><br><br>` +
      `<span style="font-size:13px;opacity:.7">Espacio: jugar de nuevo · Esc: reiniciar</span>`
    );
  }

  // ---------------- Controles UI ----------------
  startBtn.addEventListener("click", () => {
    if (!nameEl.value) nameEl.value = "Jugador";
    if (animFrame) cancelAnimationFrame(animFrame);
    startGameFromUI();
    animFrame = requestAnimationFrame(animLoop);
  });

  resetBtn.addEventListener("click", () => {
    stopLoop(); stopLvl10Rotation();
    try { bgm.pause(); bgm.currentTime = 0; } catch {}
    state = null;
    particles = [];
    clear(); drawFrame(THEMES.CLASICO);
    showCenterText("Configura y pulsa ▶ Start");
  });

  pauseBtn.addEventListener("click", togglePause);

  function togglePause() {
    if (!state || !state.running) return;
    state.paused = !state.paused;
    try { state.paused ? bgm.pause() : bgm.play().catch(() => {}); } catch {}
    if (state.paused) showCenterText("PAUSA<br><span style='font-size:13px;opacity:.7'>P para continuar</span>");
    else { hideOverlay(); if (!tickTimer) retime(); }
  }

  // ---------------- Teclado ----------------
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();

    if (e.key === "Escape") {
      stopLoop(); stopLvl10Rotation();
      try { bgm.pause(); bgm.currentTime = 0; } catch {}
      state = null; clear(); drawFrame(THEMES.CLASICO);
      showCenterText("Configura y pulsa ▶ Start");
      return;
    }
    if (!state) return;
    if (e.key === " ") {
      if (state.ready) { state.ready = false; hideOverlay(); startLoop(); }
      else if (!state.running) startBtn.click();
      return;
    }
    if (e.key.toLowerCase() === "p") { togglePause(); return; }
    if (!state.running || state.paused || state.ready) return;

    const nd = { ...state.nextDir };
    if (e.key === "ArrowLeft"  && state.dir.x !== 1)  { nd.x = -1; nd.y = 0; }
    if (e.key === "ArrowRight" && state.dir.x !== -1) { nd.x =  1; nd.y = 0; }
    if (e.key === "ArrowUp"    && state.dir.y !== 1)  { nd.x = 0; nd.y = -1; }
    if (e.key === "ArrowDown"  && state.dir.y !== -1) { nd.x = 0; nd.y =  1; }
    state.nextDir = nd;
  });

  // ---------------- Swipe táctil ----------------
  let touchStart = null;
  function setNextDirFrom(dx, dy) {
    if (!state || !state.running || state.paused || state.ready) return;
    const nd = { ...state.nextDir };
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && state.dir.x !== 1)  { nd.x = -1; nd.y = 0; }
      if (dx > 0 && state.dir.x !== -1) { nd.x =  1; nd.y = 0; }
    } else {
      if (dy < 0 && state.dir.y !== 1)  { nd.x = 0; nd.y = -1; }
      if (dy > 0 && state.dir.y !== -1) { nd.x = 0; nd.y =  1; }
    }
    state.nextDir = nd;
  }
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches?.[0]) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    if (Math.abs(dx) > 24 || Math.abs(dy) > 24) setNextDirFrom(dx, dy);
    else if (state?.ready) { state.ready = false; hideOverlay(); startLoop(); }
    touchStart = null;
  }, { passive: false });

  // ---------------- D‑pad ----------------
  if (pad) {
    pad.addEventListener("click", (e) => {
      const btn = e.target.closest(".pad-btn");
      if (!btn) return;
      if (btn.id === "pad-pause") { togglePause(); return; }
      if (state?.ready) { state.ready = false; hideOverlay(); startLoop(); return; }
      if (!state?.running || state.paused) return;
      const dir = btn.dataset.dir;
      const nd = { ...state.nextDir };
      if (dir === "left"  && state.dir.x !== 1)  { nd.x = -1; nd.y = 0; }
      if (dir === "right" && state.dir.x !== -1) { nd.x =  1; nd.y = 0; }
      if (dir === "up"    && state.dir.y !== 1)  { nd.x = 0; nd.y = -1; }
      if (dir === "down"  && state.dir.y !== -1) { nd.x = 0; nd.y =  1; }
      state.nextDir = nd;
    });
  }

  // ---------------- Audio modal ----------------
  function pct(v) { return Math.round(parseFloat(v) * 100) + "%"; }

  volEl.addEventListener("input", () => {
    try { bgm.volume = getMusicVol(); } catch {}
    if (volMusicVal) volMusicVal.textContent = pct(volEl.value);
  });
  if (volFxEl) volFxEl.addEventListener("input", () => {
    if (volFxVal) volFxVal.textContent = pct(volFxEl.value);
  });

  audioBtn?.addEventListener("click", () => {
    if (volMusicVal) volMusicVal.textContent = pct(volEl.value);
    if (volFxVal && volFxEl) volFxVal.textContent = pct(volFxEl.value);
    audioModal.style.display = "grid";
  });
  audioClose?.addEventListener("click", () => { audioModal.style.display = "none"; });
  audioModal?.addEventListener("click", (e) => {
    if (e.target === audioModal) audioModal.style.display = "none";
  });

  let _muted = false;
  let _prevMusic = "0.35", _prevFx = "0.5";
  muteAll?.addEventListener("click", () => {
    _muted = !_muted;
    if (_muted) {
      _prevMusic = volEl.value; _prevFx = volFxEl?.value ?? "0.5";
      volEl.value = "0"; if (volFxEl) volFxEl.value = "0";
      try { bgm.volume = 0; } catch {}
      muteAll.textContent = "🔊 Reanudar audio";
    } else {
      volEl.value = _prevMusic; if (volFxEl) volFxEl.value = _prevFx;
      try { bgm.volume = getMusicVol(); } catch {}
      muteAll.textContent = "🔇 Silenciar todo";
    }
    if (volMusicVal) volMusicVal.textContent = pct(volEl.value);
    if (volFxVal && volFxEl) volFxVal.textContent = pct(volFxEl.value);
  });

  // ---------------- Util ----------------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  // ---------------- Init ----------------
  (function init() {
    fitHiDPI();
    clear(); drawFrame(THEMES.CLASICO);
    overlay.innerHTML = '<div class="box">Configura y pulsa ▶ Start</div>';
    updateLastGameCard(null, null);
    animFrame = requestAnimationFrame(animLoop);
  })();
})();
