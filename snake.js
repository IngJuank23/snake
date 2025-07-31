/* Snake Retro - Web (canvas) con configuración clara, móvil y TOP en localStorage */
(() => {
  // ---------------- Constantes ----------------
  const BLOCK = 20;
  const W = 960, H = 960;
  const GRID_COLOR = { CLASICO: "#232323", NEON: "#191919", AMBAR: "#2d2412" };
  const DIFF = { LENTO: 8, NORMAL: 10, RAPIDO: 14 };
  const SPEED_MAX = 25;
  const INC_EVERY_FOOD = 5;

  const THEMES = {
    CLASICO: { snake: "#00FF00", food: "#FF0000", frame: "#00FF00", grid: GRID_COLOR.CLASICO, title: "#00FF00" },
    NEON:    { snake: "#00FFFF", food: "#FF00FF", frame: "#00FFFF", grid: GRID_COLOR.NEON,    title: "#00FFFF" },
    AMBAR:   { snake: "#FFB400", food: "#FF5000", frame: "#FFB400", grid: GRID_COLOR.AMBAR,   title: "#FFD240" },
  };

  // ---------------- DOM ----------------
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

  // D‑pad opcional (solo existe si el HTML lo incluye)
  const pad = document.getElementById('pad');
  const getRadio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;

  // ---------------- Estado ----------------
  let state = null;
  let tickTimer = null;
  let currentTab = "DUR";

  // ---------------- HiDPI / Responsive ----------------
  function fitHiDPI() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = '100%';     // el CSS limita el ancho máximo
    canvas.style.maxWidth = W + 'px';
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', fitHiDPI);

  // ---------------- TOP (localStorage) ----------------
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
      const val = currentTab === "DUR" ? `${(+s.valor).toFixed(1)}s` : (s.valor|0);
      li.innerHTML = `<span>${String(i+1).padStart(2," ")}. ${escapeHtml(String(s.jugador||"Jugador")).slice(0,18)}</span><span>${val}</span>`;
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

  // ---------------- Rejilla ----------------
  function gridCols() { return (W / BLOCK) | 0; }
  function gridRows() { return (H / BLOCK) | 0; }

  // ---------------- Obstáculos (niveles) ----------------
  function buildObstacles(level) {
    const cols = gridCols(), rows = gridRows();
    const obs = new Set();
    const add = (x,y)=>obs.add(`${x},${y}`);

    if (level === "LIBRE") return obs;

    if (level === "BARRAS") {
      // Barras con puertas para garantizar conectividad
      const x1 = Math.floor(cols/3), x2 = Math.floor(2*cols/3);
      const y1 = Math.floor(rows/3), y2 = Math.floor(2*rows/3);
      const doorW = 3;
      const midY = Math.floor(rows/2);

      for (let y=5; y<rows-5; y++) {
        if (y < midY-doorW || y > midY+doorW) add(x1,y);
        if (y < midY-doorW || y > midY+doorW) add(x2,y);
      }

      const door1 = Math.floor(cols/5);
      const door2 = Math.floor(4*cols/5);
      for (let x=5; x<cols-5; x++) {
        if (x < door1-doorW || x > door1+doorW) add(x,y1);
        if (x < door2-doorW || x > door2+doorW) add(x,y2);
      }
      return obs;
    }

    if (level === "MARCO_CRUCES") {
      // Marco
      for (let x=3; x<cols-3; x++) { add(x,3); add(x,rows-4); }
      for (let y=3; y<rows-3; y++) { add(3,y); add(cols-4,y); }

      // Cruz con hueco central 3x3
      const cx = Math.floor(cols/2), cy = Math.floor(rows/2);
      for (let dx=-8; dx<=8; dx++) add(cx+dx, cy);
      for (let dy=-8; dy<=8; dy++) add(cx, cy+dy);
      for (let dx=-1; dx<=1; dx++) obs.delete(`${cx+dx},${cy}`);
      for (let dy=-1; dy<=1; dy++) obs.delete(`${cx},${cy+dy}`);
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
      // Anillos concéntricos con una puerta por anillo
      const margin=6, layers=4, door=4;
      for (let i=0; i<layers; i++) {
        const left = margin+i*4;
        const right= cols-1-(margin+i*4);
        const top  = margin+i*4;
        const bottom=rows-1-(margin+i*4);
        const cx = Math.floor((left+right)/2);
        const cy = Math.floor((top+bottom)/2);

        if (i%2===0) {
          for (let y=top; y<=bottom; y++) {
            if (!(y>=cy-Math.floor(door/2) && y<=cy+Math.floor(door/2))) add(left,y);
          }
          for (let y=top; y<=bottom; y++) add(right,y);
          for (let x=left; x<=right; x++) { add(x,top); add(x,bottom); }
        } else {
          for (let x=left; x<=right; x++) {
            if (!(x>=cx-Math.floor(door/2) && x<=cx+Math.floor(door/2))) add(x,top);
          }
          for (let x=left; x<=right; x++) add(x,bottom);
          for (let y=top; y<=bottom; y++) { add(left,y); add(right,y); }
        }
      }
      return obs;
    }

    return obs;
  }

  
  // ---------------- NIVELES AUTOMÁTICOS ----------------
  function getNivelActual(foods) {
    return Math.min(21, Math.floor(foods / 15) + 1);
  }

  function getVelocidadPorNivel(nivel) {
    if (nivel <= 7) return DIFF.LENTO;
    if (nivel <= 14) return DIFF.NORMAL;
    return DIFF.RAPIDO;
  }

  function getTemaPorNivel(nivel) {
    if (nivel <= 7) return "CLASICO";
    if (nivel <= 14) return "NEON";
    return "AMBAR";
  }

  function buildObstaclesByNivel(nivel) {
    const niveles = [
      "LIBRE", "LIBRE", "ZIGZAG", "BARRAS", "LIBRE", "MARCO_CRUCES", "ZIGZAG",
      "LABERINTO", "MARCO_CRUCES", "ANILLOS", "ZIGZAG", "BARRAS", "LIBRE",
      "LABERINTO", "ANILLOS", "MARCO_CRUCES", "BARRAS", "ZIGZAG", "LABERINTO", "ANILLOS", "ZIGZAG"
    ];
    return buildObstacles(niveles[nivel - 1] || "LIBRE");
  }

  // ---------------- Dibujo ----------------
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

  // ---------------- Spawns (alcanzables) ----------------
  function isReachable(from, to, obstacles, snakeSet, cols, rows) {
    if (from.x === to.x && from.y === to.y) return true;
    const q = [from];
    const seen = new Set([`${from.x},${from.y}`]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (q.length) {
      const p = q.shift();
      for (const [dx,dy] of dirs) {
        const nx = p.x + dx, ny = p.y + dy;
        const k = `${nx},${ny}`;
        if (nx<0 || ny<0 || nx>=cols || ny>=rows) continue;
        if (obstacles.has(k) || snakeSet.has(k) || seen.has(k)) continue;
        if (nx===to.x && ny===to.y) return true;
        seen.add(k); q.push({x:nx,y:ny});
      }
    }
    return false;
  }

  function spawnFoodReachable(snake, obstacles) {
    const cols = gridCols(), rows = gridRows();
    const snakeSet = new Set(snake.map(p=>`${p.x},${p.y}`));
    const free = [];
    for (let x=0;x<cols;x++)
      for (let y=0;y<rows;y++) {
        const k = `${x},${y}`;
        if (!snakeSet.has(k) && !obstacles.has(k)) free.push({x,y});
      }
    if (!free.length) return null;

    // barajar
    for (let i=free.length-1;i>0;i--) {
      const j = (Math.random()*(i+1))|0;
      [free[i],free[j]] = [free[j],free[i]];
    }
    const head = snake[snake.length-1];
    for (const cand of free.slice(0,300)) {
      if (isReachable(head, cand, obstacles, snakeSet, cols, rows)) return cand;
    }
    return free[0];
  }

  // ---------------- Juego ----------------
  function startGameFromUI() {
    const jugador = (nameEl.value || "Jugador").trim().slice(0,18);
    const cols = gridCols(), rows = gridRows();
    const head = { x: cols/2|0, y: rows/2|0 };
    const snake = [head];
    const dir = { x: 1, y: 0 };
    const nextDir = { x: 1, y: 0 };
    const foods = 0;
    const nivel = getNivelActual(foods);
    const themeKey = getTemaPorNivel(nivel);
    const theme = THEMES[themeKey];
    const obstacles = buildObstaclesByNivel(nivel);
    const food = spawnFoodReachable(snake, obstacles);
    const startedAt = performance.now();
    const speed = getVelocidadPorNivel(nivel);
    const volume = parseFloat(volEl.value||"0.35");

    state = { jugador, nivel, themeKey, theme,
      cols, rows, snake, dir, nextDir, obstacles, food,
      score: 0, foods, speed,
      startedAt, running: true, paused: false, ready: true };

    try { bgm.volume = volume; bgm.currentTime = 0; bgm.play().catch(()=>{}); } catch {}

    clear(); drawFrame(state.theme); drawObstacles(state.theme, state.obstacles);
    drawSnake(state.theme, state.snake); drawFood(state.theme, state.food);
    showCenterText("Presiona ESPACIO para comenzar");
    updateLeaderboard();
  }
    updateLeaderboard();
  }
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
      state.score += 10; state.foods += 1;
      state.food = spawnFoodReachable(state.snake, state.obstacles);
      if (state.foods % INC_EVERY_FOOD === 0) { state.speed = Math.min(SPEED_MAX, state.speed+1); retime(); }
    } else {
      state.snake.shift();
    }

    clear(); drawFrame(state.theme); drawObstacles(state.theme, state.obstacles);
    drawSnake(state.theme, state.snake); drawFood(state.theme, state.food);
  }

  function gameOver() {
    state.running = false; stopLoop(); try { bgm.pause(); } catch {}
    const dur = (performance.now() - state.startedAt) / 1000;
    pushScore(state.jugador, dur, state.score); updateLeaderboard();
    showCenterText(`🟥 GAME OVER<br>Jugador: ${escapeHtml(state.jugador)}<br>Duración: ${dur.toFixed(1)} s | Puntos: ${state.score}<br><br>ESPACIO: jugar de nuevo · ESC: reiniciar`);
  }

  // ---------------- Controles UI ----------------
  startBtn.addEventListener("click", () => {
    if (!nameEl.value) nameEl.value = "Jugador";
    startGameFromUI();
  });

  resetBtn.addEventListener("click", () => {
    stopLoop(); try{bgm.pause(); bgm.currentTime=0;}catch{};
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

  // ---------------- Teclado ----------------
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

  // ---------------- Controles táctiles (swipe) ----------------
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
      if (state && state.ready) { state.ready=false; hideOverlay(); startLoop(); }
    }
    touchStart = null;
  }, {passive:false});

  // ---------------- D‑pad en pantalla ----------------
  if (pad) {
    pad.addEventListener('click', (e)=>{
      const btn = e.target.closest('.pad-btn');
      if (!btn) return;
      const dir = btn.dataset.dir;
      if (dir === undefined && btn.id === 'pad-pause') {
        if (!state || !state.running) return;
        state.paused = !state.paused;
        try{ state.paused?bgm.pause():bgm.play().catch(()=>{});}catch{}
        if (state.paused) showCenterText("PAUSA (P para continuar)");
        else { hideOverlay(); if (!tickTimer) retime(); }
        return;
      }
      if (!state || state.ready) {
        if (state) { state.ready=false; hideOverlay(); startLoop(); }
      }
      if (!state || !state.running || state.paused) return;
      const nd = { ...state.nextDir };
      if (dir === 'left'  && state.dir.x !== 1)  { nd.x=-1; nd.y=0; }
      if (dir === 'right' && state.dir.x !== -1) { nd.x= 1; nd.y=0; }
      if (dir === 'up'    && state.dir.y !== 1)  { nd.x=0; nd.y=-1; }
      if (dir === 'down'  && state.dir.y !== -1) { nd.x=0; nd.y= 1; }
      state.nextDir = nd;
    });
  }

  // ---------------- Util ----------------
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  // ---------------- Init ----------------
  (function init(){
    fitHiDPI();
    clear(); drawFrame(THEMES.CLASICO);
    overlay.innerHTML = '<div class="box">Configura y pulsa ▶ Start</div>';
    updateLeaderboard();
  })();
})();
