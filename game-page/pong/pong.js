const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// global variables
const cWidth = canvas.width; // canvas width
const cHeight = canvas.height; // canvas height
const keys = {}; // keys object to store key strokes

// game classes
class scoreCard {
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
    draw(player){
        ctx.font = '30px "Press Start 2P"';
        ctx.fillStyle = 'white';
        ctx.fillText(player.toString(), this.x, this.y);
        console.log(player.toString(), "score drawn")
    }
}

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
        this.speedX = 5;
        this.speedY = 5;
    }
    initialize() {
        this.x = cWidth / 2 - this.width / 2; 
        this.y = cHeight / 2 - this.height / 2;
        Math.random() < 0.5 ? this.speedX = -this.speedX : this.speedX = this.speedX;
        Math.random() < 0.5 ? this.speedY = -this.speedY : this.speedY = this.speedY;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    move() {
        this.x += this.speedX;
        this.y += this.speedY;
    }
    collision(paddlePlayer, paddleCPU) {
        if (this.x < paddlePlayer.x + paddlePlayer.width && this.x + this.width > paddlePlayer.x && this.y < paddlePlayer.y + paddlePlayer.height && this.y + this.height > paddlePlayer.y) {
            this.speedX = -this.speedX;

        }
        if (this.x < paddleCPU.x + paddleCPU.width && this.x + this.width > paddleCPU.x && this.y < paddleCPU.y + paddleCPU.height && this.y + this.height > paddleCPU.y) {
            this.speedX = -this.speedX;

        }
    }
    collisionWall(canvasHeight){
        if (this.y + this.height > canvasHeight || this.y < 0) {
            this.speedY = -this.speedY;
        }
    }
    collisionPlayerGoal(score) {
        if (this.x < 0) {
            score++;
            this.initialize();
        }
    }
    collisionCPUGoal(score) {
        if (this.x > 800) {
            score++;
            console.log(score.toString());
            this.initialize();
        }
    }
}

// keyboard checks
window.addEventListener('keydown', (e) => {
    keys[e.key] = true; // set key to true when pressed
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault(); // Stop the browser from scrolling
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false; // set key to true when pressed
});

// game objects
const gameBall = new ball(400, 300, 10, 10);
const player = new paddlePlayer(50, 250, 10, 100);
const cpu = new paddleCPU(740, 250, 10, 100);
const playerScoreCard = new scoreCard(0, 0);
const cpuScoreCard = new scoreCard(600, 600);
let cpuScore = 0;
let playerScore = 0;

//game loop
function gameLoop() {
    let cpuScore = 0;
    let playerScore = 0;
    
        // clear
    ctx.clearRect(0, 0, cWidth, cHeight);

       // update
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
        gameBall.speedY = -gameBall.speedY;
    }
    gameBall.collisionPlayerGoal(cpuScore);
    gameBall.collisionCPUGoal(playerScore);
    gameBall.collisionWall(cHeight);

        // redraw
    playerScoreCard.draw(playerScore);
    gameBall.draw();
    player.draw();
    cpu.draw();


    requestAnimationFrame(gameLoop);
}

gameLoop();