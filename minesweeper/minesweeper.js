const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const cWidth = canvas.width; // canvas width
const cHeight = canvas.height; // canvas height

let tileRows = 10;
let tileCols = 19;
let tileWidth = 30;
let tileHeight = 10;
let tilePadding = 10;
let tileOffsetTop = 50;
let tileOffsetLeft = 35;

let activeBombs = 0
let maxBombs = 10

let tilesArray = []

class tile{
    constructor(x, y, mine){
        this.x = x;
        this.y = y;
        this.mine = mine
    }

    draw(){
        ctx.fillStyle = 'green'
        ctx.fillRect(this.x, this.y, tileWidth, tileHeight);
    }
}

function floodFillReveal(x, y, board) {
    // Check bounds
    if (x < 0 || y < 0 || x >= board[0].length || y >= board.length) return;
    const cell = board[y][x];
    if (cell.revealed || cell.mine) return;

    cell.revealed = true;

    // Stop if this cell is adjacent to a mine
    if (cell.adjacent > 0) return;

    // Recursively reveal all neighbors
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx !== 0 || dy !== 0) {
                floodFillReveal(x + dx, y + dy, board);
            }
        }
    }
}

for (let row = 0; row < tileRows; row++){
    tilesArray[row] = [];
    for (let col = 0; col < tileCols; col++){
        if(activeBombs < maxBombs && Math.random() < 0.15){
            isBomb = true;
            activeBombs++;
        }

        let x = tileOffsetLeft + col * (tileWidth + tilePadding);
        let y = tileOffsetTop + row * (tileHeight + tilePadding);
        tilesArray[row][col]= new tile(x, y, isBomb);
    }
}

window.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    console.log("mouseX: ", mouseX, "mouseY: ", mouseY);
});

function gameLoop(){
    gameOver = false;
    
    if (!gameOver){
        ctx.clearRect(0, 0, cWidth, cHeight);
        
        for (let t of tilesArray){
            t.draw();
        }

        for (let row = 0; row < tileRows; row++) {
            for (let col = 0; col < tileCols; col++) {
                const cell = tilesArray[row][col];
                if (cell.revealed) {
                    // Draw revealed tile background
                    ctx.fillStyle = "#ccc";
                    ctx.fillRect(cell.x, cell.y, tileWidth, tileHeight);

                    // Draw number if adjacent > 0
                    if (cell.adjacent > 0) {
                        ctx.fillStyle = '15px "Press Start 2P"';
                        ctx.fillText(cell.adjacent, cell.x + tileWidth/2, cell.y + tileHeight/2);
                    }
                }
            }
        }

        requestAnimationFrame(gameLoop);
    }

    

}