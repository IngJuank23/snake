/* Snake Retro - Versión Completa Optimizada */
(() => {
  // CONSTANTES
  const BLOCK = 20;
  const W = 960, H = 960;
  const GRID_COLOR = { CLASICO: "#232323", NEON: "#191919", AMBAR: "#2d2412" };
  const THEMES = {
    CLASICO: { snake: "#00FF00", food: "#FF0000", frame: "#00FF00", grid: GRID_COLOR.CLASICO },
    NEON: { snake: "#00FFFF", food: "#FF00FF", frame: "#00FFFF", grid: GRID_COLOR.NEON },
    AMBAR: { snake: "#FFB400", food: "#FF5000", frame: "#FFB400", grid: GRID_COLOR.AMBAR }
  };

  // DOM
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const startBtn = document.getElementById("startBtn");
  const nameEl = document.getElementById("name");
  const overlay = document.getElementById("overlay");
  const boardEl = document.getElementById("leaderboard");

  // ESTADO
  let state = null;
  let animationFrameId = null;
  let lastRenderTime = 0;
  const KEY_PRESS_DELAY = 50; // 50ms entre movimientos

  // FUNCIONES DE RENDERIZADO
  function clear() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
  }

  function drawGrid(theme) {
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    // Líneas verticales
    for (let x = 0; x <= W; x += BLOCK) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    // Líneas horizontales
    for (let y = 0; y <= H; y += BLOCK) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  function drawSnake() {
    ctx.fillStyle = state.theme.snake;
    state.snake.forEach(segment => {
      ctx.fillRect(segment.x * BLOCK, segment.y * BLOCK, BLOCK, BLOCK);
    });
  }

  function drawFood() {
    if (!state.food) return;
    ctx.fillStyle = state.theme.food;
    ctx.fillRect(state.food.x * BLOCK, state.food.y * BLOCK, BLOCK, BLOCK);
  }

  function drawObstacles() {
    ctx.strokeStyle = state.theme.frame;
    ctx.lineWidth = 2;
    state.obstacles.forEach(obs => {
      const [x, y] = obs.split(',').map(Number);
      ctx.strokeRect(x * BLOCK + 2, y * BLOCK + 2, BLOCK - 4, BLOCK - 4);
    });
  }

  function render() {
    clear();
    drawGrid(state.theme);
    drawObstacles();
    drawSnake();
    drawFood();
  }

  // FUNCIONES DE JUEGO
  function spawnFood() {
    const cols = Math.floor(W / BLOCK);
    const rows = Math.floor(H / BLOCK);
    const freeSpots = [];
    
    // Encuentra todas las posiciones libres
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const key = `${x},${y}`;
        if (!state.obstacles.has(key) && 
            !state.snake.some(s => s.x === x && s.y === y)) {
          freeSpots.push({x, y});
        }
      }
    }
    
    if (freeSpots.length === 0) return null;
    
    // Selecciona una posición aleatoria
    return freeSpots[Math.floor(Math.random() * freeSpots.length)];
  }

  function buildObstacles(level) {
    const obstacles = new Set();
    const cols = Math.floor(W / BLOCK);
    const rows = Math.floor(H / BLOCK);
    
    // Patrones de obstáculos según el nivel
    if (level >= 3 && level <= 6) {
      // Patrón de barras verticales
      for (let y = 5; y < rows - 5; y++) {
        obstacles.add(`${Math.floor(cols/3)},${y}`);
        obstacles.add(`${Math.floor(cols*2/3)},${y}`);
      }
    } else if (level >= 7 && level <= 10) {
      // Patrón de marco con cruces
      for (let x = 3; x < cols - 3; x++) {
        obstacles.add(`${x},3`);
        obstacles.add(`${x},${rows-4}`);
      }
      for (let y = 3; y < rows - 3; y++) {
        obstacles.add(`3,${y}`);
        obstacles.add(`${cols-4},${y}`);
      }
    } else if (level >= 11) {
      // Patrón de laberinto
      for (let y = 4; y < rows - 4; y += 4) {
        for (let x = 2; x < cols - 2; x++) {
          if (Math.floor(x/6) % 2 === 0) {
            obstacles.add(`${x},${y}`);
          }
        }
      }
    }
    
    return obstacles;
  }

  function isCollision(position) {
    return (
      position.x < 0 || 
      position.y < 0 || 
      position.x >= Math.floor(W / BLOCK) || 
      position.y >= Math.floor(H / BLOCK) ||
      state.snake.some(s => s.x === position.x && s.y === position.y) ||
      state.obstacles.has(`${position.x},${position.y}`)
    );
  }

  function gameOver() {
    state.running = false;
    cancelAnimationFrame(animationFrameId);
    overlay.innerHTML = `<div class="box">GAME OVER<br>Puntuación: ${state.score}</div>`;
  }

  // FUNCIONES DE CONTROL
  function handleSpace() {
    if (!state) {
      startGame();
    } else if (state.ready) {
      state.ready = false;
      startLoop();
    } else if (!state.running) {
      startGame();
    } else {
      state.paused = !state.paused;
      if (!state.paused) {
        startLoop();
      }
    }
  }

  function resetGame() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    state = null;
    clear();
    overlay.innerHTML = '<div class="box">Presiona ESPACIO para comenzar</div>';
  }

  function startGame() {
    const playerName = nameEl.value || "Jugador";
    state = {
      snake: [{x: Math.floor((W/BLOCK)/2), y: Math.floor((H/BLOCK)/2)}],
      dir: {x: 1, y: 0},
      food: null,
      score: 0,
      foods: 0,
      nivel: 1,
      speed: 4,
      theme: THEMES.CLASICO,
      obstacles: new Set(),
      running: true,
      paused: false,
      ready: true
    };
    
    state.obstacles = buildObstacles(state.nivel);
    state.food = spawnFood();
    render();
    overlay.innerHTML = '<div class="box">Presiona ESPACIO para comenzar</div>';
  }

  function startLoop() {
    lastRenderTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  // BUCLE PRINCIPAL
  function gameLoop(currentTime) {
    if (!state || !state.running || state.paused || state.ready) {
      animationFrameId = requestAnimationFrame(gameLoop);
      return;
    }

    const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
    if (secondsSinceLastRender < 1 / state.speed) {
      animationFrameId = requestAnimationFrame(gameLoop);
      return;
    }

    lastRenderTime = currentTime;
    update();
    render();
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  // EVENTOS
  startBtn.addEventListener("click", startGame);
  window.addEventListener("keydown", handleKeyDown);

  function handleKeyDown(e) {
    const now = performance.now();
    if (now - lastRenderTime < KEY_PRESS_DELAY) return;

    switch(e.key) {
      case "ArrowLeft": if (state?.dir.x !== 1) state.dir = {x:-1,y:0}; break;
      case "ArrowRight": if (state?.dir.x !== -1) state.dir = {x:1,y:0}; break;
      case "ArrowUp": if (state?.dir.y !== 1) state.dir = {x:0,y:-1}; break;
      case "ArrowDown": if (state?.dir.y !== -1) state.dir = {x:0,y:1}; break;
      case " ": handleSpace(); break;
      case "Escape": resetGame(); break;
    }
    
    lastRenderTime = now;
  }

  // INICIALIZACIÓN
  function init() {
    fitHiDPI();
    resetGame();
  }

  init();
})();
