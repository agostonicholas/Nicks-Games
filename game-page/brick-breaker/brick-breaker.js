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
        shoot();
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

                let paddleCenter = paddlePlayer.y + paddlePlayer.height / 2;
                let distanceFromCenter = this.y - paddleCenter;
                let normalizedSpeed = distanceFromCenter / (paddlePlayer.height / 2);
                let angle = normalizedSpeed * (Math.PI / 4);
                let speed = Math.sqrt(this.speedX ** 2 + this.speedY ** 2);

                this.speedX = Math.abs(speed * Math.cos(angle)); // Ensure ball goes right
                this.speedY = speed * Math.sin(angle);

                if (this.speedX < 6) {
                    this.speedX *= 1.1;
                }
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

function shoot(){
    if (keys['ArrowUp']){
        ball.speedX = 5;
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

function gameLoop() {
        //clear
    ctx.clearRect(0, 0, cWidth, cHeight);
        //update
        gameBall.collision(paddlePlayer);
        gameBall.collisionWall(cHeight, cWidth);
        if(gameBall.initialize() == true)
            gameBall.move();

        if (keys['ArrowLeft']){
            paddlePlayer.moveLeft();
        }
        if (keys['ArrowRight']){
            paddlePlayer.moveRight(cWidth);
        }
        //render
    paddlePlayer.draw();
    gameBall.draw();

    requestAnimationFrame(gameLoop);
}

gameLoop();