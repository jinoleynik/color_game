const version = "1.0.5";

function saveGameState() {
  const gameState = {
    grid: grid,
    score: score,
    cols: cols,
    rows: rows,
    removedTilesCount: removedTilesCount,
  };
  localStorage.setItem("gameState", JSON.stringify(gameState));
}

function loadGameState() {
  const savedState = localStorage.getItem("gameState");
  if (savedState) {
    const gameState = JSON.parse(savedState);
    grid = gameState.grid;
    score = gameState.score;
    cols = gameState.cols;
    rows = gameState.rows;
    removedTilesCount = gameState.removedTilesCount;

    scoreEl.innerText = score;
    canvas.width = cols * SQUARE_SIZE;
    canvas.height = rows * SQUARE_SIZE;
    canvas.style.marginTop = "50px";
    return true;
  }
  return false;
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highscoreEl = document.getElementById("highscore");
const maxRemovedEl = document.getElementById("max-removed");
const paletteSelect = document.getElementById("palette-select");
const gameOverPopup = document.getElementById("game-over-popup");
const finalScoreEl = document.getElementById("final-score");
const newGameButton = document.getElementById("new-game-button");
const newGameTopButton = document.getElementById("new-game-top-button");
const softerContrastingHexColors = [
  "#E57373", // Muted Red (e.g., Light Coral)
  "#81C784", // Muted Green (e.g., Light Green)
  "#64B5F6", // Muted Blue (e.g., Sky Blue)
  "#FFF176", // Muted Yellow (e.g., Pale Yellow)
  "#BA68C8", // Muted Magenta (e.g., Lavender)
  "#4DD0E1", // Muted Cyan (e.g., Aqua Blue)
  "#FFB74D", // Muted Orange (e.g., Peach)
  "#9575CD", // Muted Purple (e.g., Medium Purple)
  "#4DB6AC", // Muted Teal (e.g., Sage Green)
  "#F06292", // Softer Pink (e.g., Light Pink)
];

const SQUARE_SIZE = 50;
const PALETTES = {
  0: [
    "#EF5350",
    "#EC407A",
    "#AB47BC",
    "#7E57C2",
    "#26C6DA",
    "#9CCC65",
    "#D4E157",
    "#FFEE58",
    "#FFCA28",
    "#FF7043",
  ],
  1: [
    "#FFB6C1",
    "#98FB98",
    "#ADD8E6",
    "#FFFFE0",
    "#E6E6FA",
    "#AFEEEE",
    "#FFDAB9",
    "#DDA0DD",
    "#B2DFDB",
    "#FFC0CB",
  ],
  2: [
    "#001219",
    "#005F73",
    "#0A9396",
    "#94D2BD",
    "#E9D8A6",
    "#EE9B00",
    "#CA6702",
    "#BB3E03",
    "#AE2012",
    "#9B2226",
  ],
  3: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  4: [
    "#FFFFFF",
    "#E0E0E0",
    "#C2C2C2",
    "#A3A3A3",
    "#858585",
    "#666666",
    "#474747",
    "#292929",
    "#0A0A0A",
    "#000000",
  ],
  5: [
    "#FFFF00",
    "#D4E600",
    "#AACC00",
    "#85B300",
    "#5F9900",
    "#3A8000",
    "#146600",
    "#004D00",
    "#003300",
    "#001A00",
  ],
  6: [
    "#03071e",
    "#370617",
    "#6a040f",
    "#9d0208",
    "#d00000",
    "#dc2f02",
    "#e85d04",
    "#f48c06",
    "#faa307",
    "#ffba08",
  ],
  7: softerContrastingHexColors,
};
let COLORS = PALETTES["0"];
const savedPalette = localStorage.getItem("selectedPalette");
if (savedPalette) {
  paletteSelect.value = savedPalette;
  COLORS = PALETTES[savedPalette];
}

const savedVersion = localStorage.getItem("version");
if (savedVersion !== version) {
  localStorage.removeItem("highscore");
  localStorage.setItem("version", version);
}

let grid = [];
let cols, rows;
let score = 0;
let highscore = localStorage.getItem("highscore") || 0;
highscoreEl.innerText = highscore;
let maxRemoved = localStorage.getItem("maxRemoved") || 0;
maxRemovedEl.innerText = maxRemoved;
let hoveredSquare = null;
let mouseDown = false;
let hoveredNeighbors = [];
let isAnimatingDisappear = false;

let removedTilesCount = 0;

function getRandomColor(x, y) {
  const matchProbability = Math.max(
    0,
    0.5 - Math.floor(removedTilesCount / 100) * 0.01
  );
  const neighbors = [];
  // Check left neighbor
  if (x > 0 && grid[y][x - 1]) {
    neighbors.push(grid[y][x - 1].color);
  }
  // Check top neighbor
  if (y > 0 && grid[y - 1][x]) {
    neighbors.push(grid[y - 1][x].color);
  }

  if (neighbors.length > 0 && Math.random() < matchProbability) {
    return neighbors[Math.floor(Math.random() * neighbors.length)];
  }
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function initGrid() {
  cols = Math.floor(window.innerWidth / SQUARE_SIZE);
  rows = Math.floor((window.innerHeight - 50) / SQUARE_SIZE);
  canvas.width = cols * SQUARE_SIZE;
  canvas.height = rows * SQUARE_SIZE;
  canvas.style.marginTop = "50px";

  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      grid[y][x] = {
        color: getRandomColor(x, y),
        animation: 0,
        disappearing: false,
      };
    }
  }
  score = 0;
  scoreEl.innerText = score;
  removedTilesCount = 0;
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const isNumbersPalette = paletteSelect.value === "3";

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x]) {
        const square = grid[y][x];
        let size = SQUARE_SIZE + square.animation * 20;
        if (square.disappearing) {
          size = Math.max(0, size);
        }
        const offset = (SQUARE_SIZE - size) / 2;
        const squareX = x * SQUARE_SIZE + offset;
        const squareY = y * SQUARE_SIZE + offset;

        if (isNumbersPalette) {
          ctx.fillStyle = "#CCCCCC";
          ctx.fillRect(squareX, squareY, size, size);
          ctx.strokeStyle = "black";
          ctx.lineWidth = 1;
          ctx.strokeRect(squareX, squareY, size, size);

          ctx.fillStyle = "black";
          ctx.font = `${size * 0.6}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(square.color, squareX + size / 2, squareY + size / 2);
        } else {
          ctx.fillStyle = square.color;
          ctx.fillRect(squareX, squareY, size, size);
          ctx.strokeStyle = "black";
          ctx.lineWidth = 1;
          ctx.strokeRect(squareX, squareY, size, size);
        }
      }
    }
  }
}

function findNeighbors(x, y, color) {
  let neighbors = [{ x, y }];
  let checked = new Array(rows)
    .fill(false)
    .map(() => new Array(cols).fill(false));
  checked[y][x] = true;
  let queue = [{ x, y }];

  while (queue.length > 0) {
    const { x: currentX, y: currentY } = queue.shift();

    const directions = [
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
    ];

    for (const dir of directions) {
      const newX = currentX + dir.x;
      const newY = currentY + dir.y;

      if (
        newX >= 0 &&
        newX < cols &&
        newY >= 0 &&
        newY < rows &&
        !checked[newY][newX] &&
        grid[newY][newX] &&
        grid[newY][newX].color === color
      ) {
        checked[newY][newX] = true;
        neighbors.push({ x: newX, y: newY });
        queue.push({ x: newX, y: newY });
      }
    }
  }
  return neighbors;
}

function handleClick(event) {
  if (isAnimatingDisappear) return;
  const x = Math.floor(event.clientX / SQUARE_SIZE);
  const y = Math.floor((event.clientY - 50) / SQUARE_SIZE);

  if (y < 0) return; // Clicked on the top menu

  const color = grid[y][x].color;
  if (!color) return;

  const neighbors = findNeighbors(x, y, color);

  if (neighbors.length >= 2) {
    if (neighbors.length > maxRemoved) {
      maxRemoved = neighbors.length;
      maxRemovedEl.innerText = maxRemoved;
      localStorage.setItem("maxRemoved", maxRemoved);
    }
    removedTilesCount += neighbors.length;
    for (const n of neighbors) {
      grid[n.y][n.x].disappearing = true;
    }
    // score += Math.pow(2, neighbors.length);
    // score += 2 * (neighbors.length + 1);
    score +=  neighbors.length;
    scoreEl.innerText = score;
    if (score > highscore) {
      highscore = score;
      highscoreEl.innerText = highscore;
      localStorage.setItem("highscore", highscore);
    }
    animateDisappear();
  }
}

function handleMouseDown(event) {
  mouseDown = true;
  const x = Math.floor(event.clientX / SQUARE_SIZE);
  const y = Math.floor((event.clientY - 50) / SQUARE_SIZE);

  if (y < 0) return;

  const color = grid[y][x].color;
  if (!color) return;

  const neighbors = findNeighbors(x, y, color);
  if (neighbors.length >= 2) {
    hoveredNeighbors = neighbors.map((n) => grid[n.y][n.x]);
  } else {
    hoveredNeighbors = [];
  }
}

function handleMouseUp(event) {
  mouseDown = false;
  hoveredNeighbors = [];
}

function handleMouseMove(event) {
  const x = Math.floor(event.clientX / SQUARE_SIZE);
  const y = Math.floor((event.clientY - 50) / SQUARE_SIZE);

  if (y < 0) {
    if (hoveredSquare) {
      hoveredSquare = null;
    }
    return;
  }

  const newHoveredSquare = grid[y] ? grid[y][x] : null;

  if (newHoveredSquare !== hoveredSquare) {
    hoveredSquare = newHoveredSquare;
  }
}

function animate() {
  let changed = false;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const square = grid[y][x];
      if (square && !square.disappearing) {
        let targetAnimation = 0;
        if (mouseDown) {
          if (hoveredNeighbors.length > 0) {
            targetAnimation = hoveredNeighbors.includes(square) ? 1 : 0;
          } else {
            targetAnimation = square === hoveredSquare ? 1 : 0;
          }
        } else {
          targetAnimation = square === hoveredSquare ? 1 : 0;
        }
        if (square.animation !== targetAnimation) {
          square.animation += (targetAnimation - square.animation) * 0.2;
          if (Math.abs(square.animation - targetAnimation) < 0.01) {
            square.animation = targetAnimation;
          }
          changed = true;
        }
      }
    }
  }

  if (changed) {
    drawGrid();
  }

  requestAnimationFrame(animate);
}

function checkGameOver() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x]) {
        const neighbors = findNeighbors(x, y, grid[y][x].color);
        if (neighbors.length >= 2) {
          return; // Found a move
        }
      }
    }
  }
  console.log("Game Over");

  // No moves found
  finalScoreEl.innerText = score;
  gameOverPopup.classList.remove("hidden");
}

function animateDisappear() {
  isAnimatingDisappear = true;
  const disappearingSquares = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] && grid[y][x].disappearing) {
        disappearingSquares.push(grid[y][x]);
      }
    }
  }

  const duration = 300; // ms
  let startTime = null;

  function animateStep(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;
    const animationValue = progress / duration;

    for (const square of disappearingSquares) {
      square.animation = -animationValue * 5;
    }

    drawGrid();

    if (progress < duration) {
      requestAnimationFrame(animateStep);
    } else {
      for (const square of disappearingSquares) {
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (grid[y][x] === square) {
              grid[y][x] = null;
            }
          }
        }
      }
      applyGravity();
      fillEmptySpaces();
      drawGrid();
      isAnimatingDisappear = false;
      checkGameOver();
      saveGameState();
    }
  }

  requestAnimationFrame(animateStep);
}

function applyGravity() {
  for (let x = 0; x < cols; x++) {
    let emptyRow = rows - 1;
    for (let y = rows - 1; y >= 0; y--) {
      if (grid[y][x]) {
        [grid[emptyRow][x], grid[y][x]] = [grid[y][x], grid[emptyRow][x]];
        emptyRow--;
      }
    }
  }
}

function fillEmptySpaces() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!grid[y][x]) {
        grid[y][x] = {
          color: getRandomColor(x, y),
          animation: 0,
          disappearing: false,
        };
      }
    }
  }
}

paletteSelect.addEventListener("change", (event) => {
  const newPalette = event.target.value;
  localStorage.setItem("selectedPalette", newPalette);
  const oldColors = COLORS;
  COLORS = PALETTES[newPalette];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const square = grid[y][x];
      if (square) {
        const oldColor = square.color;
        const oldColorIndex = oldColors.indexOf(oldColor);
        if (oldColorIndex !== -1 && oldColorIndex < COLORS.length) {
          square.color = COLORS[oldColorIndex];
        } else {
          square.color = getRandomColor(x, y);
        }
      }
    }
  }
  drawGrid();
});

canvas.addEventListener("click", handleClick);
canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("mouseup", handleMouseUp);
canvas.addEventListener("mousemove", handleMouseMove);

newGameTopButton.addEventListener("click", () => {
  initGrid();
  drawGrid();
});

window.addEventListener("resize", () => {
  initGrid();
  drawGrid();
});

newGameButton.addEventListener("click", () => {
  gameOverPopup.classList.add("hidden");
  initGrid();
  drawGrid();
});

if (!loadGameState()) {
  initGrid();
}
drawGrid();
animate();
