const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// global variables
const cWidth = canvas.width; // canvas width
const cHeight = canvas.height; // canvas height

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
    moveUp() {
        if ((ball.x || ball.y) > (this.x || this.y)) {
            this.y -= this.speed;
        }
    }
    moveDown() {
        if ((ball.x || ball.y) < (this.x || this.y)) {
            this.y += this.speed;
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
}

const gameBall = new ball(400, 300, 10, 10);
const player = new paddlePlayer(50, 250, 10, 100);
const cpu = new paddleCPU(740, 250, 10, 100);



player.draw();
cpu.draw();
gameBall.draw();

