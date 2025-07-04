const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const paletteSelect = document.getElementById('palette-select');

const SQUARE_SIZE = 50;
const PALETTES = {
    '0': ['#03071e', '#370617', '#6a040f', '#9d0208', '#d00000', '#dc2f02', '#e85d04', '#f48c06', '#faa307', '#ffba08'],
    '1': ['#FFB6C1', '#98FB98', '#ADD8E6', '#FFFFE0', '#E6E6FA', '#AFEEEE', '#FFDAB9', '#DDA0DD', '#B2DFDB', '#FFC0CB'],
    '2': ['#001219', '#005F73', '#0A9396', '#94D2BD', '#E9D8A6', '#EE9B00', '#CA6702', '#BB3E03', '#AE2012', '#9B2226']
};
let COLORS = PALETTES['0'];

let grid = [];
let cols, rows;
let score = 0;
let highscore = localStorage.getItem('highscore') || 0;
highscoreEl.innerText = highscore;
let hoveredSquare = null;
let mouseDown = false;
let hoveredNeighbors = [];

function getRandomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function initGrid() {
    cols = Math.floor(window.innerWidth / SQUARE_SIZE);
    rows = Math.floor((window.innerHeight - 50) / SQUARE_SIZE);
    canvas.width = cols * SQUARE_SIZE;
    canvas.height = rows * SQUARE_SIZE;
    canvas.style.marginTop = '50px';

    for (let y = 0; y < rows; y++) {
        grid[y] = [];
        for (let x = 0; x < cols; x++) {
            grid[y][x] = { color: getRandomColor(), animation: 0 };
        }
    }
    score = 0;
    scoreEl.innerText = score;
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let squaresToDrawNormally = [];
    let squaresToDrawOnTop = [];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x]) {
                const square = grid[y][x];
                if (square.animation > 0) {
                    squaresToDrawOnTop.push({ square, x, y });
                } else {
                    squaresToDrawNormally.push({ square, x, y });
                }
            }
        }
    }

    for (const item of squaresToDrawNormally) {
        const { square, x, y } = item;
        const size = SQUARE_SIZE + square.animation * 20;
        const offset = (SQUARE_SIZE - size) / 2;
        ctx.fillStyle = square.color;
        ctx.fillRect(x * SQUARE_SIZE + offset, y * SQUARE_SIZE + offset, size, size);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * SQUARE_SIZE + offset, y * SQUARE_SIZE + offset, size, size);
    }

    for (const item of squaresToDrawOnTop) {
        const { square, x, y } = item;
        const size = SQUARE_SIZE + square.animation * 20;
        const offset = (SQUARE_SIZE - size) / 2;
        ctx.fillStyle = square.color;
        ctx.fillRect(x * SQUARE_SIZE + offset, y * SQUARE_SIZE + offset, size, size);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * SQUARE_SIZE + offset, y * SQUARE_SIZE + offset, size, size);
    }
}

function findNeighbors(x, y, color) {
    let neighbors = [{x, y}];
    let checked = new Array(rows).fill(false).map(() => new Array(cols).fill(false));
    checked[y][x] = true;
    let queue = [{x, y}];

    while (queue.length > 0) {
        const {x: currentX, y: currentY} = queue.shift();

        const directions = [
            {x: 0, y: 1}, {x: 0, y: -1},
            {x: 1, y: 0}, {x: -1, y: 0}
        ];

        for (const dir of directions) {
            const newX = currentX + dir.x;
            const newY = currentY + dir.y;

            if (newX >= 0 && newX < cols && newY >= 0 && newY < rows &&
                !checked[newY][newX] && grid[newY][newX] && grid[newY][newX].color === color) {
                
                checked[newY][newX] = true;
                neighbors.push({x: newX, y: newY});
                queue.push({x: newX, y: newY});
            }
        }
    }
    return neighbors;
}

function handleClick(event) {
    const x = Math.floor(event.clientX / SQUARE_SIZE);
    const y = Math.floor((event.clientY - 50) / SQUARE_SIZE);

    if (y < 0) return; // Clicked on the top menu

    const color = grid[y][x].color;
    if (!color) return;

    const neighbors = findNeighbors(x, y, color);

    if (neighbors.length >= 2) {
        for (const n of neighbors) {
            grid[n.y][n.x] = null;
        }
        score += Math.pow(2, neighbors.length);
        scoreEl.innerText = score;
        if (score > highscore) {
            highscore = score;
            highscoreEl.innerText = highscore;
            localStorage.setItem('highscore', highscore);
        }
        applyGravity();
        fillEmptySpaces();
        drawGrid();
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
        hoveredNeighbors = neighbors.map(n => grid[n.y][n.x]);
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
            if (square) {
                let targetAnimation = 0;
                if (mouseDown) {
                    if (hoveredNeighbors.length > 0) {
                        targetAnimation = hoveredNeighbors.includes(square) ? 1 : 0;
                    } else {
                        targetAnimation = (square === hoveredSquare) ? 1 : 0;
                    }
                } else {
                    targetAnimation = (square === hoveredSquare) ? 1 : 0;
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
                grid[y][x] = { color: getRandomColor(), animation: 0 };
            }
        }
    }
}

paletteSelect.addEventListener('change', (event) => {
    const oldColors = COLORS;
    COLORS = PALETTES[event.target.value];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const square = grid[y][x];
            if (square) {
                const oldColor = square.color;
                const oldColorIndex = oldColors.indexOf(oldColor);
                if (oldColorIndex !== -1 && oldColorIndex < COLORS.length) {
                    square.color = COLORS[oldColorIndex];
                } else {
                    square.color = getRandomColor();
                }
            }
        }
    }
    drawGrid();
});

canvas.addEventListener('click', handleClick);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mousemove', handleMouseMove);

window.addEventListener('resize', () => {
    initGrid();
    drawGrid();
});

initGrid();
drawGrid();
animate();
