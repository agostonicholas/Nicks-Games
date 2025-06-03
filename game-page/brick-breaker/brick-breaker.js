const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// global variables
const cWidth = canvas.width; // canvas width
const cHeight = canvas.height; // canvas height
const keys = {}; // keys object to store key strokes
const brickColors = ['blue', 'red', 'green', 'yellow', 'orange']

class scoreboard{
    constructor(x, y, score){
        
    }
}


class brick {
    constructor(x, y, colorIndex){
        this.x = x;
        this.y = y;
        this.length = 30;
        this.width = 10;
        this.colorIndex = colorIndex;
        this.color = brickColors[this.colorIndex]
    }
    
    draw(){
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.length, this.width);
    }
    
    downgradeColor() {
        this.colorIndex--;
        if (this.colorIndex >= 0) {
            this.color = brickColors[this.colorIndex];
        }
    }

}



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

    collisionBrick(brick) {
        if (this.x < brick.x + brick.width && 
            this.x + this.width > brick.x && 
            this.y < brick.y + brick.height && 
            this.y + this.height > brick.y) {

                let hitPos = ((this.x + this.width / 2) - (brick.x + brick.width / 2)) / (brick.width / 2);
                let maxBounce = Math.PI / 3;
                let angle = hitPos * maxBounce;
                let speed = Math.sqrt(this.speedX ** 2 + this.speedY ** 2) || 5;

                this.speedX = speed * Math.sin(angle); // Ensure ball goes right
                this.speedY = -Math.abs(speed * Math.cos(angle));

                this.y = brick.y - this.height - 1;
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
score = 0;

gameBall.initialize(paddlePlayer);

function gameOver(){
    if(youLose = true){
        ctx.clearRect(0, 0, cWidth, cHeight);
        gameLoop();
    }
}



let brickRows = 5;
let brickCols = 8;
let brickWidth = 80;
let brickHeight = 30;
let brickPadding = 10;
let brickOffsetTop = 50;
let brickOffsetLeft = 35;

let bricksArray = [];

for (let row = 0; row < brickRows; row++){
    for (let col = 0; col < brickCols; col++){
        let colorIndex = Math.floor(Math.random() * brickColors.length);
        let x = brickOffsetLeft + col * (brickWidth + brickPadding);
        let y = brickOffsetTop + row * (brickHeight + brickPadding);
        bricksArray.push(new brick(x, y, colorIndex));
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

        for (let i = bricksArray.length - 1; i >= 0; i--) {
            let b = bricksArray[i];
            gameBall.collisionBrick(b);

            if (
                gameBall.x < b.x + b.length &&
                gameBall.x + gameBall.width > b.x &&
                gameBall.y < b.y + b.width &&
                gameBall.y + gameBall.height > b.y
                ) {
                if(b.colorIndex > 0){
                    b.downgradeColor();
                    gameBall.speedY = -gameBall.speedY;
                    score += 10;
                } else {
                    bricksArray.splice(i, 1);
                    gameBall.speedY = -gameBall.speedY;
                    score += 10;
                }
            }
        }
        if(bricksArray.length == 0){
            ballIsReady = true
        }
    }

    if(gameBall.y > cHeight){
        gameBall.initialize(paddlePlayer);
        ballIsReady = true;
    }

    

    if (keys['ArrowLeft']) paddlePlayer.moveLeft();
    if (keys['ArrowRight']) paddlePlayer.moveRight(cWidth);
        //render
    for (let b of bricksArray){
        b.draw();
    }
    paddlePlayer.draw();
    gameBall.draw();

    requestAnimationFrame(gameLoop);
}

gameLoop();