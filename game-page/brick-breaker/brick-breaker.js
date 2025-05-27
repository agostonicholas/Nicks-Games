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
        this.color = 'purple';
        this.speed = 5;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    moveLeft() {
        if (this.x > 0) {
            this.x -= this.speed;
        }
    }
    moveRight(canvasWidth) {
        if (this.x + this.width < canvasWidth) {
            this.x += this.speed;
        }
    }
}

class ball {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = "green";
        this.speedX = 5;
        this.speedY = 5;
    }

    move(){
        this.speedX = 5;
        this.speedY = 5;
    }

    initialize(paddlePlayer){
        let paddleCenter = paddlePlayer.y + paddlePlayer.height / 2;
        this.x = paddleCenter;
        this.y = paddleCenter + 50;
        this.speedX = 0;
        this.speedY = 0;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    collision(paddlePlayer) {
        if (this.x < paddlePlayer.x + paddlePlayer.width && 
            this.x + this.width > paddlePlayer.x && 
            this.y < paddlePlayer.y + paddlePlayer.height && 
            this.y + this.height > paddlePlayer.y) {

                let hitPos = ((this.x + this.width / 2) - (paddlePlayer.x + paddlePlayer.width / 2)) / (paddlePlayer.width / 2);
                let maxBounce = Math.PI / 3;
                let angle = hitPos * maxBounce;
                let speed = Math.sqrt(this.speedX ** 2 + this.speedY ** 2) || 5;

                this.speedX = speed * Math.sin(angle); // Ensure ball goes right
                this.speedY = -Math.abs(speed * Math.cos(angle));

                this.y = paddlePlayer.y - this.height - 1;
        }
    }
    
    collisionWall(canvasHeight, canvasWidth){
        if (this.y + this.height > canvasHeight || this.y < 0) {
            this.speedY = -this.speedY;
        }
        if (this.x + this.width > canvasWidth || this.x < 0) {
            this.speedX = -this.speedX;
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
gameBall = new ball(450, 450, 10, 10);
let ballIsReady = true;
let ballsLeft = 3;
youLose = false;

gameBall.initialize(paddlePlayer);

function gameOver(){
    if(youLose = true){
        ctx.clearRect(0, 0, cWidth, cHeight);
        gameLoop();
    }
}

function gameLoop() {
        //clear
    ctx.clearRect(0, 0, cWidth, cHeight);
        //update
    if(ballsLeft == 0){
        gameOver = true;
    }

    if(gameBall.y > (paddlePlayer.y + 20)){
        ballsLeft -= 1;
        ballIsReady = true;
    }

    if(ballIsReady){
        gameBall.x = paddlePlayer.x + paddlePlayer.width / 2 - gameBall.width / 2;
        gameBall.y = paddlePlayer.y - gameBall.height - 2;
        if(keys['ArrowUp'] || keys[' ']) {
            gameBall.speedX = 0;
            gameBall.speedY = -5;
            ballIsReady = false
        }
    } else {
        gameBall.x += gameBall.speedX;
        gameBall.y += gameBall.speedY;
        gameBall.collision(paddlePlayer);
        gameBall.collisionWall(cHeight, cWidth);
    }

    if(gameBall.y > cHeight){
        gameBall.initialize(paddlePlayer);
        ballIsReady = true;
    }

    if (keys['ArrowLeft']) paddlePlayer.moveLeft();
    if (keys['ArrowRight']) paddlePlayer.moveRight(cWidth);
        //render
    paddlePlayer.draw();
    gameBall.draw();

    requestAnimationFrame(gameLoop);
}

gameLoop();