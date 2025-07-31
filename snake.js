/* Snake Retro - 21 Niveles Exactos */
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
    overlay.innerHTML = `<div class="box">GAME OVER<br>Puntuación: ${state.score}<br>Nivel alcanzado: ${state.nivel}</div>`;
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

  function update() {
    const head = state.snake[state.snake.length-1];
    const newHead = {
      x: head.x + state.dir.x,
      y: head.y + state.dir.y
    };

    // Detección de colisiones
    if (isCollision(newHead)) return gameOver();

    state.snake.push(newHead);
    
    if (state.food && newHead.x === state.food.x && newHead.y === state.food.y) {
      handleFoodEaten();
    } else {
      state.snake.shift();
    }
  }

  function handleFoodEaten() {
    state.score += 10;
    state.foods += 1;
    
    // Cambio de nivel exacto cada 15 alimentos
    const newLevel = Math.min(21, Math.floor(state.foods / 15) + 1);
    if (newLevel !== state.nivel) {
      state.nivel = newLevel;
      
      // Reinicio de tamaño en niveles 8 y 15
      if (newLevel === 8 || newLevel === 15) {
        const head = state.snake[state.snake.length-1];
        state.snake = [head];
      }
      
      // Actualizar configuración del nivel
      state.speed = newLevel <= 7 ? 4 : newLevel <= 14 ? 6 : 8;
      state.theme = THEMES[newLevel <= 7 ? "CLASICO" : newLevel <= 14 ? "NEON" : "AMBAR"];
      state.obstacles = buildObstacles(newLevel);
    }
    
    state.food = spawnFood();
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
    // Ajuste para pantallas HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = '100%';
    canvas.style.maxWidth = `${W}px`;
    canvas.style.height = 'auto';
    ctx.scale(dpr, dpr);
    
    resetGame();
  }

  init();
})();
