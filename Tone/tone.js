import { saveScore } from "../backend-functions.js";

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// global variables
const cWidth = canvas.width; // canvas width
const cHeight = canvas.height; // canvas height
const keys = {}; // keys object to store key strokes
const user = localStorage.getItem('username') || 'BOZO';

let startTime = null;
const timeElapsed = () => startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

window.addEventListener('keydown', (e) => {
    keys[e.key] = true; // set key to true when pressed
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault(); // Stop the browser from scrolling
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false; // set key to true when pressed
});

class player {
    constructor (x, y){
        this.x = x;
        this.y = y;
        this.score = 0;
        this.radius = 10;
    }
    draw(){
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
    }
}

class enemy {
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.color = 'red';
        this.speedX = (Math.random() - 0.5) * 2; // random speed
        this.speedY = (Math.random() - 0.5) * 2;
        this.radius = 10;
    }
    draw(){
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    move(){
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < this.radius || this.x > cWidth - this.radius) this.speedX *= -1;
        if (this.y < this.radius || this.y > cHeight - this.radius) this.speedY *= -1;
    }
}

class timer {
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.speedX = 5;
        this.speedY = 5;
    }
    draw(){
        ctx.fillStyle = 'white';
        ctx.font = '20px "Press Start 2P"';
        ctx.fillText(`TIME: ${timeElapsed()} seconds`, this.x, this.y);
    }
}

let playGame = false;
let gameLoopActive = false;
let goodBall = new player(50, 50);
let startScreenEnemies = [];
let lastEnemySpawn = 0;

function circlesCollide(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < a.radius + b.radius;
}

function startGameScreen() {
    ctx.clearRect(0, 0, cWidth, cHeight);
    ctx.fillStyle = 'white';
    ctx.font = '32px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('TONE', cWidth / 2, cHeight / 2 - 60);
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText('Press Enter to Start', cWidth / 2, cHeight / 2);

    // Spawn enemies every 2 seconds
    if (Date.now() - lastEnemySpawn > 2000) {
        startScreenEnemies.push(new enemy(Math.random() * cWidth, Math.random() * cHeight));
        lastEnemySpawn = Date.now();
    }
    // Draw all enemies
    for (let e of startScreenEnemies) {
        e.draw();
        e.move();
    }

    requestAnimationFrame(startGameScreen);
}

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'Enter' && !playGame) {
        playGame = true;
        gameLoopActive = true;
        startTime = Date.now();
        runGameLoop();
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
    }
});

let gameEnemies = [];
let newEnemySpawn = Date.now();
let gameOver = false;
let scoreSaved = false;

function runGameLoop() {
    if (!gameLoopActive) return;
    ctx.clearRect(0, 0, cWidth, cHeight);
    goodBall.draw();
    gameTimer.draw();
    if (Date.now() - newEnemySpawn > 3000) {
        gameEnemies.push(new enemy(Math.random() * cWidth, Math.random() * cHeight));
        newEnemySpawn = Date.now();
    }

    // Draw all enemies
    for (let e of gameEnemies) {
        e.draw();
        e.move();
        if (circlesCollide(goodBall, e)) {
            gameOver = true;
            if (gameOver){ // handle collision
                ctx.clearRect(0, 0, cWidth, cHeight);
                setTimeout(() => {
                    ctx.fillStyle = 'white';
                    ctx.font = '32px "Press Start 2P"';
                    ctx.textAlign = 'center';
                    ctx.fillText('GAME OVER', cWidth / 2, cHeight / 2 - 60);
                    ctx.font = '20px "Press Start 2P"';
                    ctx.fillText(`You survived for ${timeElapsed()} seconds`, cWidth / 2, cHeight / 2);
                    ctx.fillText('Refresh to play again', cWidth / 2, cHeight / 2 + 40);
                    if (!scoreSaved){
                        saveScore(user, timeElapsed().toString());
                        scoreSaved = true;
                    }
                }, 5000);
                startGameScreen();
                return;
            }
        }
    }
    requestAnimationFrame(runGameLoop);
}

startGameScreen();

let gameTimer = new timer(350, 30);

canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    goodBall.x = e.clientX - rect.left;
    goodBall.y = e.clientY - rect.top;
    goodBall.draw();
});