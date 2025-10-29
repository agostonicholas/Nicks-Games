import { saveScore } from "../backend-functions.js";

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// global variables
const cWidth = canvas.width; // canvas width
const cHeight = canvas.height; // canvas height
const keys = {}; // keys object to store key strokes
const brickColors = ['blue', 'red', 'green', 'yellow', 'orange']
const user = localStorage.getItem('username') || 'BOZO';

class scoreboard{
    constructor(x, y, score){
        this.x = x;
        this.y = y;
        this.score = score;
    }
    draw(player){
        ctx.fillStyle = 'white';
        ctx.font = '20px "Press Start 2P"';
        ctx.fillText(`P1 ${player}`, this.x, this.y);
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
        this.speedX = 1;
        this.speedY = 1;
    }

    move(){
        this.speedX = 1;
        this.speedY = 1;
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

let scoreSaved = false;
let score = 0;
let paddlePlayer = new paddle(400, 550, 100, 10);
let gameBall = new ball(450, 450, 10, 10);
let playerScore = new scoreboard(50, 37, score);
let ballIsReady = true;
let ballsLeft = 3;
let gameOver = false;
let gameOverDelay = false;
const collisionSound = new Audio("sounds/bounce.mp3");
const deathSound = new Audio("sounds/explosion.mp3");
const gameOverSound = new Audio("sounds/game-over.mp3");

gameBall.initialize(paddlePlayer);

// bricks 

let brickRows = 10;
let brickCols = 19;
let brickWidth = 30;
let brickHeight = 10;
let brickPadding = 10;
let brickOffsetTop = 50;
let brickOffsetLeft = 35;

let bricksArray = [];

class brick {
    constructor(x, y, colorIndex){
        this.x = x;
        this.y = y;
        this.height = brickHeight;
        this.width = brickWidth;
        this.colorIndex = colorIndex;
        this.color = brickColors[this.colorIndex]
    }
    
    draw(){
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    downgradeColor() {
        this.colorIndex--;
        if (this.colorIndex >= 0) {
            this.color = brickColors[this.colorIndex];
        }
    }

}

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
    if(ballsLeft == 0){ // game over condition
        gameOver = true;
    }
    if (gameOver){
        ctx.clearRect(0, 0, cWidth, cHeight);
        ctx.fillStyle = 'white';
        ctx.font = '40px "Press Start 2P"'
        ctx.fillText(`RIP ${user}`, 250, cHeight / 2);
        ctx.fillText(`P1 ${score}`, 250, 355);
        if (!scoreSaved){    
            saveScore(user, score);
            scoreSaved = true;
        }
        if(!gameOverDelay){
            gameOverDelay = true;
            gameOverSound.play();
            setTimeout(() => {
                score = 0;
                ballsLeft = 3;
                ballIsReady = true;
                gameOver = false;
                gameOverDelay = false;
                scoreSaved = false;

                bricksArray = [];
                for (let row = 0; row < brickRows; row++) {
                    for (let col = 0; col < brickCols; col++) {
                        let colorIndex = Math.floor(Math.random() * brickColors.length);
                        let x = brickOffsetLeft + col * (brickWidth + brickPadding);
                        let y = brickOffsetTop + row * (brickHeight + brickPadding);
                        bricksArray.push(new brick(x, y, colorIndex));
                    }
                }
            }, 5000);
        }
        requestAnimationFrame(gameLoop);
        return;
    }
    
    if (!gameOver){
        ctx.clearRect(0, 0, cWidth, cHeight);

            //update

        if(gameBall.y > (paddlePlayer.y + 20)){ // ball is dead
            deathSound.play();
            ballsLeft -= 1;
            ballIsReady = true;
        }

        if(ballIsReady){ // ball is being positioned and shot
            gameBall.x = paddlePlayer.x + paddlePlayer.width / 2 - gameBall.width / 2;
            gameBall.y = paddlePlayer.y - gameBall.height - 2;
            ctx.fillStyle = 'white';
            ctx.font = '20px "Press Start 2P"';
            ctx.fillText('Press up arrow or space to fire!', 90, 450);
            if(keys['ArrowUp'] || keys[' ']) {
                gameBall.speedX = 0;
                gameBall.speedY = -5;
                ballIsReady = false
            }
        } else { // ball is in motion
            gameBall.x += gameBall.speedX;
            gameBall.y += gameBall.speedY;
            gameBall.collision(paddlePlayer);
            gameBall.collisionWall(cHeight, cWidth);

            for (let i = bricksArray.length - 1; i >= 0; i--) { // try to ensure one collision per brick hit 
                let b = bricksArray[i];

                if ( // logic for bounce and downgrading brick colors
                    gameBall.x < b.x + b.width &&
                    gameBall.x + gameBall.width > b.x &&
                    gameBall.y < b.y + b.height &&
                    gameBall.y + gameBall.height > b.y
                    ) {
                    if(b.colorIndex > 0){
                        b.downgradeColor();
                    } else {
                        bricksArray.splice(i, 1);
                    }
                    collisionSound.currentTime = 0;
                    collisionSound.play();
                    gameBall.speedY = -gameBall.speedY;
                    score += 10;
                    break;
                }
            }
            if(bricksArray.length == 0){ // reset the ball on grid clear
                ballIsReady = true
            }
        }

        if(gameBall.y > cHeight){
            gameBall.initialize(paddlePlayer);
            ballIsReady = true;
        }

        if (keys['ArrowLeft']) paddlePlayer.moveLeft(); // movement logic left
        if (keys['ArrowRight']) paddlePlayer.moveRight(cWidth); // movement right

            //render
        
            for (let b of bricksArray){
            b.draw();
        }

        ctx.fillStyle = 'white';
        ctx.font = '20px "Press Start 2P"';
        ctx.fillText(`Balls ${ballsLeft}`, 650, 37);

        playerScore.draw(score);
        paddlePlayer.draw();
        gameBall.draw();

        requestAnimationFrame(gameLoop);
    }
}

gameLoop();