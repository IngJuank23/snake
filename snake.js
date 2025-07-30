/* Snake Retro - Web (canvas) con configuración clara, móvil y TOP en localStorage */
(() => {
  const BLOCK = 20;
  const W = 800, H = 800;
  const GRID_COLOR = { CLASICO: "#232323", NEON: "#191919", AMBAR: "#2d2412" };
  const DIFF = { LENTO: 8, NORMAL: 10, RAPIDO: 14 };
  const SPEED_MAX = 25;
  const INC_EVERY_FOOD = 5;

  const THEMES = {
    CLASICO: { snake: "#00FF00", food: "#FF0000", frame: "#00FF00", grid: GRID_COLOR.CLASICO, title: "#00FF00" },
    NEON:    { snake: "#00FFFF", food: "#FF00FF", frame: "#00FFFF", grid: GRID_COLOR.NEON,    title: "#00FFFF" },
    AMBAR:   { snake: "#FFB400", food: "#FF5000", frame: "#FFB400", grid: GRID_COLOR.AMBAR,   title: "#FFD240" },
  };

  // --- DOM
  const canvas   = document.getElementById("stage");
  const ctx      = canvas.getContext("2d");
  const overlay  = document.getElementById("overlay");
  const nameEl   = document.getElementById("name");
  const volEl    = document.getElementById("volume");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const tabDur   = document.getElementById("tabDur");
  const tabPts   = document.getElementById("tabPts");
  const boardEl  = document.getElementById("leaderboard");
  const bgm      = document.getElementById("bgm");

  // D‑pad (puede que no exista si no agregas el HTML; por eso lo tomamos condicional)
  const pad = document.getElementById('pad');
  const getRadio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;

  // --- Estado
  let state = null;
  let tickTimer = null;
  let currentTab = "DUR";

  // --- HiDPI / responsive: tamaño lógico 800x800, físico dpr*800 para nitidez
  function fitHiDPI() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = '100%';     // que el CSS lo adapte
    canvas.style.maxWidth = W + 'px'; // no crecer más de 800px en desktop
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', fitHiDPI);

  // --- Scores (localStorage)
  const LS_DUR = "snakeScoresDurations";
  const LS_PTS = "snakeScoresPoints";

  function loadScores() {
    const durations = JSON.parse(localStorage.getItem(LS_DUR) || "[]");
    const points    = JSON.parse(localStorage.getItem(LS_PTS) || "[]");
    return { durations, points };
  }
  function saveScores({ durations, points }) {
    localStorage.setItem(LS_DUR, JSON.stringify(durations.slice(0, 10)));
    localStorage.setItem(LS_PTS, JSON.stringify(points.slice(0, 10)));
  }
  function updateLeaderboard() {
    const { durations, points } = loadScores();
    const list = currentTab === "DUR" ? durations : points;
    boardEl.innerHTML = "";
    list.slice(0, 10).forEach((s, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${String(i+1).padStart(2," ")}. ${escapeHtml(s.jugador).slice(0,18)}</span>
                      <span>${currentTab === "DUR" ? `${(+s.valor).toFixed(1)}s` : (s.valor|0)}</span>`;
      boardEl.appendChild(li);
    });
  }
  function pushScore(jugador, dur, pts) {
    const sc = loadScores();
    sc.durations.push({ jugador, valor: dur });
    sc.durations.sort((a,b)=>b.valor-a.valor);
    sc.points.push({ jugador, valor: pts|0 });
    sc.points.sort((a,b)=>b.valor-a.valor);
    saveScores(sc);
  }

  // --- Utilidades de rejilla
  function gridCols() { return (W / BLOCK) | 0; }
  function gridRows() { return (H / BLOCK) | 0; }

  // --- Niveles / obstáculos
  function buildObstacles(level) {
    const cols = gridCols(), rows = gridRows();
    const obs = new Set();
    const add = (x,y)=>obs.add(`${x},${y}`);

    if (level === "LIBRE") return obs;
    if (level === "BARRAS") {
      for (let y=5; y<rows-5; y++) { add(cols/3|0, y); add(2*cols/3|0, y); }
      for (let x=5; x<cols-5; x++) { add(x, rows/3|0); add(x, 2*rows/3|0); }
      return obs;
    }
    if (level === "MARCO_CRUCES") {
      for (let x=3; x<cols-3; x++) { add(x,3); add(x, rows-4); }
      for (let y=3; y<rows-3; y++) { add(3,y); add(cols-4,y); }
      const cx = cols/2|0, cy = rows/2|0;
      for (let dx=-8; dx<=8; dx++) add(cx+dx, cy);
      for (let dy=-8; dy<=8; dy++) add(cx, cy+dy);
      return obs;
    }
    if (level === "LABERINTO") {
      for (let y=4; y<rows-4; y+=4)
        for (let x=2; x<cols-2; x++)
          if (((x/6)|0)%2===0) add(x,y);
      for (let x=4; x<cols-4; x+=6)
        for (let y=2; y<rows-2; y++)
          if (((y/6)|0)%2===1) add(x,y);
      return obs;
    }
    if (level === "ZIGZAG") {
      for (let y=6; y<rows-6; y+=4) {
        const off = ((y/2)|0)%2===0 ? 0 : 3;
        for (let x=6+off; x<cols-6; x+=6) { add(x,y); add(x+1,y); }
      }
      return obs;
    }
    if (level === "ANILLOS") {
      const margin=6, layers=4;
      for (let i=0;i<layers;i++) {
        const left = margin + i*4;
        const right= cols-1-(margin+i*4);
        const top  = margin + i*4;
        const bottom=rows-1-(margin+i*4);
        for (let x=left; x<=right; x++) { add(x,top); add(x,bottom); }
        for (let y=top; y<=bottom; y++) { add(left,y); add(right,y); }
      }
      return obs;
    }
    return obs;
  }

  // --- Dibujo
  function clear() { ctx.fillStyle = "#000"; ctx.fillRect(0,0,W,H); }
  function drawFrame(theme) {
    ctx.strokeStyle = theme.frame; ctx.lineWidth = 2;
    ctx.strokeRect(1,1,W-2,H-2);
    ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
    for (let x=0; x<=W; x+=BLOCK) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0; y<=H; y+=BLOCK) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }
  function drawSnake(theme, snake) {
    ctx.fillStyle = theme.snake;
    snake.forEach(p => ctx.fillRect(p.x*BLOCK, p.y*BLOCK, BLOCK, BLOCK));
  }
  function drawFood(theme, food) {
    if (!food) return;
    ctx.fillStyle = theme.food;
    ctx.fillRect(food.x*BLOCK, food.y*BLOCK, BLOCK, BLOCK);
  }
  function drawObstacles(theme, obstacles) {
    ctx.strokeStyle = theme.frame; ctx.lineWidth = 2;
    obstacles.forEach(key => {
      const [x,y] = key.split(",").map(Number);
      ctx.strokeRect(x*BLOCK+2, y*BLOCK+2, BLOCK-4, BLOCK-4);
    });
  }
  function showCenterText(text) {
    overlay.innerHTML = `<div class="box">${text}</div>`;
  }
  function hideOverlay() { overlay.innerHTML = ""; }

  // --- Spawns
  function spawnFood(snake, obstacles) {
    const cols = gridCols(), rows = gridRows();
    const occ = new Set([...snake.map(p=>`${p.x},${p.y}`), ...obstacles]);
    const libres = [];
    for (let x=0;x<cols;x++) for (let y=0;y<rows;y++) {
      const key = `${x},${y}`; if (!occ.has(key)) libres.push(key);
    }
    if (!libres.length) return null;
    const [x,y] = libres[Math.random()*libres.length|0].split(",").map(Number);
    return { x, y };
  }

  // --- Juego
  function startGameFromUI() {
    const jugador    = (nameEl.value || "Jugador").trim().slice(0,18);
    const dificultad = getRadio("difficulty");
    const themeKey   = getRadio("theme");
    const levelKey   = getRadio("level");
    const theme      = THEMES[themeKey];

    const cols = gridCols(), rows = gridRows();
    const head = { x: cols/2|0, y: rows/2|0 };
    const snake = [head];
    const dir = { x: 1, y: 0 };
    const nextDir = { x: 1, y: 0 };
    const obstacles = buildObstacles(levelKey);
    const food = spawnFood(snake, obstacles);
    const startedAt = performance.now();
    const speedBase = DIFF[dificultad];
    const volume = parseFloat(volEl.value||"0.35");

    state = { jugador, dificultad, themeKey, levelKey, theme,
      cols, rows, snake, dir, nextDir, obstacles, food,
      score: 0, foods: 0, speed: speedBase,
      startedAt, running: true, paused: false, ready: true };

    // Música tras interacción
    try { bgm.volume = volume; bgm.currentTime = 0; bgm.play().catch(()=>{}); } catch {}

    // DIBUJAR el estado inicial (antes de presionar ESPACIO)
    clear();
    drawFrame(state.theme);
    drawObstacles(state.theme, state.obstacles);
    drawSnake(state.theme, state.snake);
    drawFood(state.theme, state.food);

    showCenterText("Presiona ESPACIO para comenzar");
    updateLeaderboard();
  }

  function startLoop() { stopLoop(); tickTimer = setInterval(tick, 1000/(state.speed||10)); }
  function stopLoop()  { if (tickTimer) clearInterval(tickTimer); tickTimer = null; }
  function retime()    { if (!state) return; stopLoop(); tickTimer = setInterval(tick, 1000/Math.min(SPEED_MAX,state.speed)); }

  function tick() {
    if (!state || !state.running || state.paused || state.ready) return;
    state.dir = { ...state.nextDir };
    const head = state.snake[state.snake.length-1];
    const nx = head.x + state.dir.x, ny = head.y + state.dir.y;
    const newHead = { x:nx, y:ny };
    if (nx<0||ny<0||nx>=state.cols||ny>=state.rows) return gameOver();
    if (state.snake.some(p=>p.x===nx&&p.y===ny)) return gameOver();
    if (state.obstacles.has(`${nx},${ny}`))       return gameOver();
    state.snake.push(newHead);
    if (state.food && newHead.x===state.food.x && newHead.y===state.food.y) {
      state.score += 10; state.foods += 1; state.food = spawnFood(state.snake, state.obstacles);
      if (state.foods % INC_EVERY_FOOD === 0) { state.speed = Math.min(SPEED_MAX, state.speed+1); retime(); }
    } else {
      state.snake.shift();
    }
    clear(); drawFrame(state.theme); drawObstacles(state.theme, state.obstacles); drawSnake(state.theme, state.snake); drawFood(state.theme, state.food);
  }

  function gameOver() {
    state.running = false; stopLoop(); try { bgm.pause(); } catch {}
    const dur = (performance.now() - state.startedAt) / 1000;
    pushScore(state.jugador, dur, state.score); updateLeaderboard();
    showCenterText(`🟥 GAME OVER<br>Jugador: ${escapeHtml(state.jugador)}<br>Duración: ${dur.toFixed(1)} s | Puntos: ${state.score}<br><br>ESPACIO: jugar de nuevo · ESC: reiniciar`);
  }

  // --- Controles UI
  startBtn.addEventListener("click", () => {
    if (!nameEl.value) nameEl.value = "Jugador";
    startGameFromUI();
  });

  resetBtn.addEventListener("click", () => {
    stopLoop();
    try{ bgm.pause(); bgm.currentTime=0; }catch{}
    state=null; clear(); drawFrame(THEMES.CLASICO);
    showCenterText("Configura y pulsa ▶ Start");
  });

  pauseBtn.addEventListener("click", () => {
    if (!state || !state.running) return;
    state.paused = !state.paused;
    try { state.paused ? bgm.pause() : bgm.play().catch(()=>{});} catch {}
    if (state.paused) showCenterText("PAUSA (P para continuar)");
    else { hideOverlay(); if (!tickTimer) retime(); }
  });

  tabDur.addEventListener("click", ()=>{ currentTab="DUR"; tabDur.classList.add("active"); tabPts.classList.remove("active"); updateLeaderboard(); });
  tabPts.addEventListener("click", ()=>{ currentTab="PTS"; tabPts.classList.add("active"); tabDur.classList.remove("active"); updateLeaderboard(); });

  // --- Teclado
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    if (e.key === "Escape") {
      stopLoop(); try{bgm.pause();bgm.currentTime=0;}catch{};
      state=null; clear(); drawFrame(THEMES.CLASICO); showCenterText("Configura y pulsa ▶ Start");
      return;
    }
    if (!state) return;
    if (e.key === " ") {
      if (state.ready) { state.ready=false; hideOverlay(); startLoop(); }
      else if (!state.running) { startBtn.click(); }
      return;
    }
    if (e.key.toLowerCase() === "p") {
      if (!state.running) return;
      state.paused = !state.paused;
      try{ state.paused?bgm.pause():bgm.play().catch(()=>{});}catch{}
      if (state.paused) showCenterText("PAUSA (P para continuar)");
      else { hideOverlay(); if(!tickTimer) retime(); }
      return;
    }
    if (!state.running || state.paused || state.ready) return;
    const nd = { ...state.nextDir };
    if (e.key === "ArrowLeft"  && state.dir.x !== 1)  { nd.x=-1; nd.y=0; }
    if (e.key === "ArrowRight" && state.dir.x !== -1) { nd.x= 1; nd.y=0; }
    if (e.key === "ArrowUp"    && state.dir.y !== 1)  { nd.x=0; nd.y=-1; }
    if (e.key === "ArrowDown"  && state.dir.y !== -1) { nd.x=0; nd.y= 1; }
    state.nextDir = nd;
  });

  // --- Controles táctiles: swipe en el canvas
  let touchStart = null;
  function setNextDirFrom(dx, dy){
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
  canvas.addEventListener('touchstart', (e)=>{
    if (e.touches && e.touches[0]) {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, {passive:false});
  canvas.addEventListener('touchmove', (e)=>{ e.preventDefault(); }, {passive:false});
  canvas.addEventListener('touchend', (e)=>{
    if (!touchStart) return;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const threshold = 24; // px
    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      setNextDirFrom(dx, dy);
    } else {
      // toque corto: si está listo, iniciar
      if (state && state.ready) { state.ready=false; hideOverlay(); startLoop(); }
    }
    touchStart = null;
  }, {passive:false});

  // --- D‑pad (botones en pantalla)
  if (pad) {
    pad.addEventListener('click', (e)=>{
      const btn = e.target.closest('.pad-btn');
      if (!btn) return;
      const dir = btn.dataset.dir;
      if (dir === undefined && btn.id === 'pad-pause') {
        // toggle pausa
        if (!state || !state.running) return;
        state.paused = !state.paused;
        try{ state.paused?bgm.pause():bgm.play().catch(()=>{});}catch{}
        if (state.paused) showCenterText("PAUSA (P para continuar)");
        else { hideOverlay(); if (!tickTimer) retime(); }
        return;
      }
      if (!state || state.ready) { // si aún no empezó, arrancar y luego mover
        if (state) { state.ready=false; hideOverlay(); startLoop(); }
        return;
      }
      if (!state.running || state.paused) return;
      const nd = { ...state.nextDir };
      if (dir === 'left'  && state.dir.x !== 1)  { nd.x=-1; nd.y=0; }
      if (dir === 'right' && state.dir.x !== -1) { nd.x= 1; nd.y=0; }
      if (dir === 'up'    && state.dir.y !== 1)  { nd.x=0; nd.y=-1; }
      if (dir === 'down'  && state.dir.y !== -1) { nd.x=0; nd.y= 1; }
      state.nextDir = nd;
    });
  }

  function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  // --- Estado inicial
  (function init(){
    fitHiDPI(); // ← importante para nitidez y responsive
    clear(); drawFrame(THEMES.CLASICO);
    overlay.innerHTML = '<div class="box">Configura y pulsa ▶ Start</div>';
    updateLeaderboard();
  })();
})();
