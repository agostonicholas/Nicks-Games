const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// global variables
const cWidth = canvas.width; // canvas width
const cHeight = canvas.height; // canvas height
const keys = {}; // keys object to store key strokes

// game objects
class paddlePlayer {
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
    }
    moveUp() {
        if (this.y > 0) {
            this.y -= this.speed;
        }
    }
    moveDown(canvasHeight) {
        if (this.y + this.height < canvasHeight) {
            this.y += this.speed;
        }
    }
}

class paddleCPU {
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
    }
    update(ball, canvasHeight) {
        const paddleCenter = this.y + this.height / 2;

        if (ball.y < paddleCenter) {
            this.y -= this.speed;
        } else if (ball.y > this.y + this.height) {
            this.y += this.speed;
        }

        if (this.y < 0) {
            this.y = 0;
          } else if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
          }
    }
}

class ball {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = 'white';
        this.speed = 5;
        this.velocityY = 5;
    }
    initialize() {
        this.x = cWidth / 2 - this.width / 2; 
        this.y = cHeight / 2 - this.height / 2;
        this.speed = 5;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    move() {
        this.x += this.speed;
        this.y += this.speed;
    }
    collision(paddlePlayer, paddleCPU) {
        if (this.x < paddlePlayer.x + paddlePlayer.width && this.x + this.width > paddlePlayer.x && this.y < paddlePlayer.y + paddlePlayer.height && this.y + this.height > paddlePlayer.y) {
            this.speed = -this.speed;
        }
        if (this.x < paddleCPU.x + paddleCPU.width && this.x + this.width > paddleCPU.x && this.y < paddleCPU.y + paddleCPU.height && this.y + this.height > paddleCPU.y) {
            this.speed = -this.speed;
        }
    }
    collisionWall(canvasHeight){
        if (this.y <= 0) {
            this.y = 0;
            this.velocityY *= -1;
          } 
          if (this.y + this.size >= canvasHeight) {
            this.y = canvasHeight - this.size;
            this.velocityY *= -1;
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

const gameBall = new ball(400, 300, 10, 10);
const player = new paddlePlayer(50, 250, 10, 100);
const cpu = new paddleCPU(740, 250, 10, 100);

function gameLoop() {

    ctx.clearRect(0, 0, cWidth, cHeight);


    // player movement
    if(keys['ArrowUp']) {
        player.moveUp();
    }
    if(keys['ArrowDown']) {
        player.moveDown(cHeight);
    }

    // cpu movement
    cpu.update(gameBall);

    // ball movement and collision
    gameBall.move();
    if (gameBall.collision(player, cpu)){
        gameBall.speed = -gameBall.speed;
    }
    gameBall.collisionWall(cHeight);
    
    gameBall.draw();
    player.draw();
    cpu.draw();


    requestAnimationFrame(gameLoop);
}

gameLoop();