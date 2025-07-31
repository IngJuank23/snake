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

  // ---------------- Obstáculos (21 niveles exactos) ----------------
  function buildObstacles(level) {
    const obstacles = new Set();
    const cols = gridCols();
    const rows = gridRows();
    const centerX = Math.floor(cols / 2);
    const centerY = Math.floor(rows / 2);

    // Función auxiliar para añadir obstáculos
    const addObstacle = (x, y) => obstacles.add(`${x},${y}`);

    // Patrones específicos para cada nivel
    switch(level) {
      case 1: // Libre
        break;

      case 2: // Dos barras horizontales
        for (let x = 5; x < cols-5; x++) {
          addObstacle(x, Math.floor(rows/3));
          addObstacle(x, Math.floor(rows*2/3));
        }
        break;

      case 3: // Tres barras horizontales
        for (let x = 5; x < cols-5; x++) {
          addObstacle(x, Math.floor(rows/4));
          addObstacle(x, Math.floor(rows/2));
          addObstacle(x, Math.floor(rows*3/4));
        }
        break;

      case 4: // Una barra vertical
        for (let y = 5; y < rows-5; y++) {
          addObstacle(Math.floor(cols/2), y);
        }
        break;

      case 5: // Dos barras verticales
        for (let y = 5; y < rows-5; y++) {
          addObstacle(Math.floor(cols/3), y);
          addObstacle(Math.floor(cols*2/3), y);
        }
        break;

      case 6: // Tres barras verticales
        for (let y = 5; y < rows-5; y++) {
          addObstacle(Math.floor(cols/4), y);
          addObstacle(Math.floor(cols/2), y);
          addObstacle(Math.floor(cols*3/4), y);
        }
        break;

      case 7: // Triángulo mediano al centro
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j <= i; j++) {
            addObstacle(centerX - i + j*2, centerY - 2 + i);
          }
        }
        break;

      case 8: // Círculo mediano al centro
        const radius = 4;
        for (let x = centerX - radius; x <= centerX + radius; x++) {
          for (let y = centerY - radius; y <= centerY + radius; y++) {
            const dx = x - centerX;
            const dy = y - centerY;
            if (dx*dx + dy*dy <= radius*radius) {
              addObstacle(x, y);
            }
          }
        }
        break;

      case 9: // Cuadrado mediano al centro
        const squareSize = 5;
        for (let x = centerX - squareSize; x <= centerX + squareSize; x++) {
          for (let y = centerY - squareSize; y <= centerY + squareSize; y++) {
            if (x === centerX - squareSize || x === centerX + squareSize || 
                y === centerY - squareSize || y === centerY + squareSize) {
              addObstacle(x, y);
            }
          }
        }
        break;

      case 10: // Cuatro cuadrados chicos
        const smallSquare = 2;
        // Cuadrados en las esquinas
        for (let i = 0; i < 4; i++) {
          const cornerX = i < 2 ? 3 : cols - 4;
          const cornerY = i % 2 === 0 ? 3 : rows - 4;
          for (let x = cornerX; x < cornerX + smallSquare; x++) {
            for (let y = cornerY; y < cornerY + smallSquare; y++) {
              addObstacle(x, y);
            }
          }
        }
        break;

      case 11: // 3 triángulos chicos al centro
        for (let t = 0; t < 3; t++) {
          const offsetX = t === 0 ? -5 : t === 1 ? 0 : 5;
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j <= i; j++) {
              addObstacle(centerX + offsetX - i + j*2, centerY - 4 + i);
            }
          }
        }
        break;

      case 12: // 3 círculos chicos al centro
        const smallRadius = 2;
        for (let c = 0; c < 3; c++) {
          const offsetX = c === 0 ? -6 : c === 1 ? 0 : 6;
          for (let x = centerX + offsetX - smallRadius; x <= centerX + offsetX + smallRadius; x++) {
            for (let y = centerY - smallRadius; y <= centerY + smallRadius; y++) {
              const dx = x - (centerX + offsetX);
              const dy = y - centerY;
              if (dx*dx + dy*dy <= smallRadius*smallRadius) {
                addObstacle(x, y);
              }
            }
          }
        }
        break;

      case 13: // Barra horizontal + 4 esquineros mirando hacia dentro
        // Barra horizontal
        for (let x = 5; x < cols-5; x++) {
          addObstacle(x, centerY);
        }
        // Esquineros (triángulos pequeños)
        const cornerSize = 3;
        // Esquina superior izquierda
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= i; j++) {
            addObstacle(5 + j, 5 + i);
          }
        }
        // Esquina superior derecha
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= i; j++) {
            addObstacle(cols-6 - j, 5 + i);
          }
        }
        // Esquina inferior izquierda
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= i; j++) {
            addObstacle(5 + j, rows-6 - i);
          }
        }
        // Esquina inferior derecha
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= i; j++) {
            addObstacle(cols-6 - j, rows-6 - i);
          }
        }
        break;

      case 14: // Barra vertical + 4 esquineros mirando hacia fuera
        // Barra vertical
        for (let y = 5; y < rows-5; y++) {
          addObstacle(centerX, y);
        }
        // Esquineros (triángulos pequeños)
        // Esquina superior izquierda (mirando hacia fuera)
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= cornerSize-1 - i; j++) {
            addObstacle(5 + j, 5 + i);
          }
        }
        // Esquina superior derecha
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= cornerSize-1 - i; j++) {
            addObstacle(cols-6 - j, 5 + i);
          }
        }
        // Esquina inferior izquierda
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= cornerSize-1 - i; j++) {
            addObstacle(5 + j, rows-6 - i);
          }
        }
        // Esquina inferior derecha
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= cornerSize-1 - i; j++) {
            addObstacle(cols-6 - j, rows-6 - i);
          }
        }
        break;

      case 15: // 1 barra horizontal
        for (let x = 5; x < cols-5; x++) {
          addObstacle(x, centerY);
        }
        break;

      case 16: // Cuadrado chico + barras alrededor
        // Cuadrado central pequeño (3x3)
        for (let x = centerX-1; x <= centerX+1; x++) {
          for (let y = centerY-1; y <= centerY+1; y++) {
            if (x === centerX-1 || x === centerX+1 || y === centerY-1 || y === centerY+1) {
              addObstacle(x, y);
            }
          }
        }
        // Barras horizontales arriba y abajo
        for (let x = centerX-5; x <= centerX+5; x++) {
          addObstacle(x, centerY-3);
          addObstacle(x, centerY+3);
        }
        // Barras verticales izquierda y derecha
        for (let y = centerY-5; y <= centerY+5; y++) {
          addObstacle(centerX-3, y);
          addObstacle(centerX+3, y);
        }
        break;

      case 17: // Marco con barras centrado
        // Barras horizontales
        for (let x = centerX-7; x <= centerX+7; x++) {
          addObstacle(x, centerY-5);
          addObstacle(x, centerY+5);
        }
        // Barras verticales
        for (let y = centerY-5; y <= centerY+5; y++) {
          addObstacle(centerX-5, y);
          addObstacle(centerX+5, y);
        }
        break;

      case 18: // Círculo chico + 4 esquineros hacia dentro
        // Círculo pequeño central
        const tinyRadius = 2;
        for (let x = centerX - tinyRadius; x <= centerX + tinyRadius; x++) {
          for (let y = centerY - tinyRadius; y <= centerY + tinyRadius; y++) {
            const dx = x - centerX;
            const dy = y - centerY;
            if (dx*dx + dy*dy <= tinyRadius*tinyRadius) {
              addObstacle(x, y);
            }
          }
        }
        // Esquineros (como en nivel 13)
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= i; j++) {
            // Superior izquierdo
            addObstacle(5 + j, 5 + i);
            // Superior derecho
            addObstacle(cols-6 - j, 5 + i);
            // Inferior izquierdo
            addObstacle(5 + j, rows-6 - i);
            // Inferior derecho
            addObstacle(cols-6 - j, rows-6 - i);
          }
        }
        break;

      case 19: // 4 esquineros hacia fuera centrados
        // Como nivel 14 pero más centrados
        const cornerDist = 4;
        // Superior izquierdo
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= cornerSize-1 - i; j++) {
            addObstacle(centerX-cornerDist + j, centerY-cornerDist + i);
          }
        }
        // Superior derecho
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= cornerSize-1 - i; j++) {
            addObstacle(centerX+cornerDist - j, centerY-cornerDist + i);
          }
        }
        // Inferior izquierdo
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= cornerSize-1 - i; j++) {
            addObstacle(centerX-cornerDist + j, centerY+cornerDist - i);
          }
        }
        // Inferior derecho
        for (let i = 0; i < cornerSize; i++) {
          for (let j = 0; j <= cornerSize-1 - i; j++) {
            addObstacle(centerX+cornerDist - j, centerY+cornerDist - i);
          }
        }
        break;

      case 20: // Cruz en el centro
        // Barra horizontal
        for (let x = centerX-5; x <= centerX+5; x++) {
          addObstacle(x, centerY);
        }
        // Barra vertical
        for (let y = centerY-5; y <= centerY+5; y++) {
          addObstacle(centerX, y);
        }
        break;

      case 21: // 9 barras chicas al centro
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            const startX = centerX - 4 + i*4;
            const startY = centerY - 4 + j*4;
            for (let k = 0; k < 3; k++) {
              addObstacle(startX + k, startY);
            }
          }
        }
        break;

      default:
        break;
    }

    return obstacles;
  }

  function getNivelActual(foods) {
    return Math.min(21, Math.floor(foods / 15) + 1);
  }

  function getVelocidadPorNivel(nivel) {
    if (nivel <= 7) return 4;
    if (nivel <= 14) return 6;
    return 8;
  }

  function getTemaPorNivel(nivel) {
    if (nivel <= 7) return "CLASICO";
    if (nivel <= 14) return "NEON";
    return "AMBAR";
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
    const obstacles = buildObstacles(nivel);
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
    updateLeaderboard();
    state.ready = true;
    showCenterText("Presiona ESPACIO para comenzar");
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
      state.score += 10;
      state.foods += 1;

      const nuevoNivel = getNivelActual(state.foods);
      if (nuevoNivel !== state.nivel) {
        state.nivel = nuevoNivel;
        state.themeKey = getTemaPorNivel(nuevoNivel);
        state.theme = THEMES[state.themeKey];
        state.speed = getVelocidadPorNivel(nuevoNivel);
        
        // Reiniciar tamaño de la serpiente en niveles 8 y 15
        if (nuevoNivel === 8 || nuevoNivel === 15) {
          const head = state.snake[state.snake.length-1];
          state.snake = [head];
        }
        
        state.obstacles = buildObstacles(nuevoNivel);
        retime();
      }

      state.food = spawnFoodReachable(state.snake, state.obstacles);
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
    showCenterText(`🟥 GAME OVER<br>Jugador: ${escapeHtml(state.jugador)}<br>Nivel: ${state.nivel}<br>Duración: ${dur.toFixed(1)} s | Puntos: ${state.score}<br><br>ESPACIO: jugar de nuevo · ESC: reiniciar`);
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
