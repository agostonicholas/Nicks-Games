import { saveScore } from "../backend-functions.js";

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// global variables
const cWidth = canvas.width; // canvas width
const cHeight = canvas.height; // canvas height
const song1 = new Audio('assets/music/song1.mp3');
const song2 = new Audio('assets/music/song2.mp3');
const song3 = new Audio('assets/music/song3.mp3');
const dead = new Audio('assets/sounds/explosion.mp3');
const playlist = [song1, song2, song3];
const keys = {}; // keys object to store key strokes
const user = localStorage.getItem('username') || 'BOZO';

let startTime = null;
const timeElapsed = () => startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
let currentSongIndex = 0;
let musicInitialized = false;
let isMusicPlaying = false;

function setupMusic() {
    if (musicInitialized) return;
    playlist.forEach((track) => {
        track.loop = false;
        track.addEventListener('ended', handleTrackEnded);
    });
    musicInitialized = true;
}

function handleTrackEnded() {
    currentSongIndex = (currentSongIndex + 1) % playlist.length;
    playCurrentSong(true);
}

function playCurrentSong(restart = false) {
    setupMusic();
    playlist.forEach((track, idx) => {
        if (idx !== currentSongIndex) {
            track.pause();
            track.currentTime = 0;
        }
    });
    const track = playlist[currentSongIndex];
    if (restart) {
        track.currentTime = 0;
    }
    track.play().then(() => {
        isMusicPlaying = true;
    }).catch((error) => {
        isMusicPlaying = false;
        console.warn('Unable to start music playback:', error);
    });
}

function startMusic() {
    if (!isMusicPlaying) {
        playCurrentSong(true);
    }
}

function stopMusic() {
    if (!musicInitialized) return;
    const track = playlist[currentSongIndex];
    track.pause();
    track.currentTime = 0;
    isMusicPlaying = false;
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

class SeekerEnemy extends enemy {
    constructor(x, y) {
        super(x, y);
        this.color = 'green';
        this.speed = 1;
    }
    move() {
        const dx = goodBall.x - this.x;
        const dy = goodBall.y - this.y;
        const distance = Math.hypot(dx, dy) || 1;
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;

        if (this.x < this.radius) this.x = this.radius;
        if (this.x > cWidth - this.radius) this.x = cWidth - this.radius;
        if (this.y < this.radius) this.y = this.radius;
        if (this.y > cHeight - this.radius) this.y = cHeight - this.radius;
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
const GAME_OVER_DRAW_DELAY = 250;
const GAME_OVER_DISPLAY_DURATION = 7000;
const SEEKER_SPAWN_INTERVAL = 10000;

function circlesCollide(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < a.radius + b.radius;
}

function startGameScreen() {
    if (playGame) return;
    ctx.clearRect(0, 0, cWidth, cHeight);
    ctx.fillStyle = 'white';
    ctx.font = '32px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('TONE', cWidth / 2, cHeight / 2 - 60);
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText('Press Enter to Start', cWidth / 2, cHeight / 2);

    // Spawn enemies every 2 seconds
    if (Date.now() - lastEnemySpawn > 1000) {
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
        startMusic();
        newEnemySpawn = Date.now();
        lastSeekerSpawn = Date.now();
        runGameLoop();
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
    }
});

let gameEnemies = [];
let newEnemySpawn = Date.now();
let lastSeekerSpawn = Date.now();
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
    if (Date.now() - lastSeekerSpawn > SEEKER_SPAWN_INTERVAL) {
        gameEnemies.push(new SeekerEnemy(Math.random() * cWidth, Math.random() * cHeight));
        lastSeekerSpawn = Date.now();
    }

    // Draw all enemies
    for (let e of gameEnemies) {
        e.draw();
        e.move();
        if (circlesCollide(goodBall, e)) {
            if (!gameOver) {
                dead.currentTime = 0;
                dead.play();
                stopMusic();
                gameOver = true;
                gameLoopActive = false;
                setTimeout(() => {
                    ctx.clearRect(0, 0, cWidth, cHeight);

                    ctx.fillStyle = 'white';
                    ctx.font = '32px "Press Start 2P"';
                    ctx.textAlign = 'center';
                    ctx.fillText('GAME OVER', cWidth / 2, cHeight / 2 - 60);
                    ctx.font = '20px "Press Start 2P"';
                    ctx.fillText(`You survived for ${timeElapsed()} seconds`, cWidth / 2, cHeight / 2);
                    ctx.fillText('Refresh to play again', cWidth / 2, cHeight / 2 + 40);

                    if (!scoreSaved) {
                        saveScore(user, timeElapsed().toString());
                        scoreSaved = true;
                    }
                }, GAME_OVER_DRAW_DELAY);

                setTimeout(() => {
                    gameEnemies = [];
                    startScreenEnemies = [];
                    lastEnemySpawn = Date.now();
                    newEnemySpawn = Date.now();
                    lastSeekerSpawn = Date.now();
                    startTime = null;
                    gameOver = false;
                    playGame = false;
                    scoreSaved = false;
                    startGameScreen();
                }, GAME_OVER_DRAW_DELAY + GAME_OVER_DISPLAY_DURATION);
            }
            break;
        }
    }
    if (gameLoopActive) {
        requestAnimationFrame(runGameLoop);
    }
}

startGameScreen();

let gameTimer = new timer(350, 30);

canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    goodBall.x = e.clientX - rect.left;
    goodBall.y = e.clientY - rect.top;
    goodBall.draw();
});
