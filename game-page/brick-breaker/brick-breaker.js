const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// global variables
const cWidth = canvas.width; // canvas width
const cHeight = canvas.height; // canvas height
const keys = {}; // keys object to store key strokes

class paddle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = 'white';
        this.speed = 5;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        console.log("paddle drawn");
    }
    moveLeft() {
        if (this.x > 0) {
            this.x -= this.speed;
            console.log("paddle moved left");
        }
    }
    moveRight(canvasWidth) {
        if (this.x + this.width < canvasWidth) {
            this.x += this.speed;
            console.log("paddle moved right");
        }
    }
}

window.addEventListener('keydown', (e) => {
    keys[e.key] = true; // set key to true when pressed
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault(); // Stop the browser from scrolling
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false; // set key to true when pressed
});

paddlePlayer = new paddle(400, 550, 100, 10);

function gameLoop() {
        //clear
    ctx.clearRect(0, 0, cWidth, cHeight);
        //update
        if (keys['ArrowLeft']){
            paddlePlayer.moveLeft();
        }
        if (keys['ArrowRight']){
            paddlePlayer.moveRight(cWidth)
        }
        //render
    paddlePlayer.draw();

    requestAnimationFrame(gameLoop);
}

paddlePlayer.draw();