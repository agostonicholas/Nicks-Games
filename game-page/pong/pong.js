const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// global variables
const cWidth = canvas.width; // canvas width
const cHeight = canvas.height; // canvas height
const keys = {}; // keys object to store key strokes
const button = {
    x: 300,
    y: 500,
    width: 200,
    height:60,
    color: 'white',
    text: 'Start Game'
};

// game classes
class scoreCard {
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
    draw(player){
        ctx.font = '40px "Press Start 2P"';
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
        this.center = this.y + this.height / 2;
        this.bottom = this.y + this.height;
        this.top = this.y;
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
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = 'white';
        this.speed = 3;
        this.center = this.y + this.height / 2;
        this.bottom = this.y + this.height;
        this.top = this.y;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    update(ball) {
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
        this.speedX = 3;
        this.speedY = 3;
    }
    initialize() {
        this.speedX = 3;
        this.speedY = 3;
        this.x = cWidth / 2 - this.width / 2; 
        this.y = cHeight / 2 - this.height / 2;
        
        let angle = Math.random() > 0.5 ? Math.PI / 4 : -Math.PI / 4;

        if (Math.random() < 0.5) { 
            this.speedX = -this.speedX * Math.cos(angle);
        }
        if (Math.random() > 0.5){  
            this.speedY = -this.speedY * Math.sin(angle);
        }
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
        if (this.x < paddleCPU.x + paddleCPU.width && 
            this.x + this.width > paddleCPU.x && 
            this.y < paddleCPU.y + paddleCPU.height && 
            this.y + this.height > paddleCPU.y) {
            
                let paddleCenter = paddleCPU.y + paddleCPU.height / 2;
                let distanceFromCenter = this.y - paddleCenter;
                let normalizedSpeed = distanceFromCenter / (paddleCPU.height / 2);
                let angle = normalizedSpeed * (Math.PI / 4);
                let speed = Math.sqrt(this.speedX ** 2 + this.speedY ** 2);
        
                this.speedX = -Math.abs(speed * Math.cos(angle)); // Ensure ball goes left
                this.speedY = speed * Math.sin(angle);
        
                if (Math.abs(this.speedX) < 6) {
                    this.speedX *= 1.1;
                }

        }
    }
    collisionWall(canvasHeight){
        if (this.y + this.height > canvasHeight || this.y < 0) {
            this.speedY = -this.speedY;
        }
    }
    collisionPlayerGoal() {
        if (this.x < 0) {
            console.log("Score!");
            this.initialize();
            return true;
        }
    }
    collisionCPUGoal() {
        if (this.x > 800) {
            console.log("Score!");
            this.initialize();
            return true;
        }
    }
}

function startGame() {
    ctx.clearRect(0, 0, cWidth, cHeight);
    playGame = true;
    gameLoop();
}

// keyboard checks
window.addEventListener('click', function (e){
    const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (
    mouseX >= button.x &&
    mouseX <= button.x + button.width &&
    mouseY >= button.y &&
    mouseY <= button.y + button.height
  ) {
    startGame();
  }
});
window.addEventListener('keydown', (e) => {
    keys[e.key] = true; // set key to true when pressed
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault(); // Stop the browser from scrolling
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false; // set key to true when pressed
});

const startCPU = new paddleCPU(50, 250, 10, 100);
const startCPU2 = new paddleCPU(740, 250, 10, 100);
const startBall = new ball(400, 300, 10, 10);
let playGame = false

// start game and stuff

function drawButton() {
    ctx.fillStyle = "#444";
    ctx.fillRect(button.x, button.y, button.width, button.height);

    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2);
    console.log("Button Drawn")
}

function startScreen() {
    if (!playGame){

        ctx.clearRect(0, 0, cWidth, cHeight);

        // update
        for ( let i = 0; i < 10; i++){
            ctx.fillStyle = 'white';
            ctx.fillRect(400, 0, 5, cHeight);
        }
        startBall.move();
        if (startBall.collision(startCPU, startCPU2)){
            startBall.speedY = -gameBall.speedY;
        }
        if (startBall.collision(player, cpu)){
            startBall.speedY = -startBall.speedY;
        }
        
        startBall.collisionCPUGoal()
        startBall.collisionPlayerGoal()
        startBall.collisionWall(cHeight);
        
        startCPU.update(startBall);
        startCPU2.update(startBall);
        //render
        startCPU.draw();
        startCPU2.draw();
        startBall.draw();
        drawButton();

        requestAnimationFrame(startScreen);
    }
}

const gameBall = new ball(400, 300, 10, 10);
const player = new paddlePlayer(50, 250, 10, 100);
const cpu = new paddleCPU(740, 250, 10, 100);
const playerScoreCard = new scoreCard(150, 100);
const cpuScoreCard = new scoreCard(570, 100);

let playerScore = 0;
let cpuScore = 0;

//game loop
function gameLoop() {

    if (playGame == true){
        // clear
        ctx.clearRect(0, 0, cWidth, cHeight);

       // update

        for ( let i = 0; i < 10; i++){
        ctx.fillStyle = 'white';
        ctx.fillRect(400, 0, 5, cHeight);
        }
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
        gameBall.collision(player, cpu)
    
        if (gameBall.collisionCPUGoal()) {
            playerScore++;
        }
        if (gameBall.collisionPlayerGoal()) {
            cpuScore++;
        }
        gameBall.collisionWall(cHeight);

        if (playerScore >= 10) {
            console.log("Player win!");
            ctx.font = '40 px "Press Start 2P"';
            ctx.fillStyle = 'lime';
            ctx.fillText("You win!", 425, 400);
            playGame = false;
        }
        if (cpuScore >= 10) {
            console.log("CPU win!");
            ctx.font = '40 px "Press Start 2P"';
            ctx.fillStyle = 'lime';
            ctx.fillText("RIP BOZO", 425, 400);
            playGame = false;
        }

            // redraw
        cpuScoreCard.draw(cpuScore);
        playerScoreCard.draw(playerScore);
        gameBall.draw();
        player.draw();
        cpu.draw();


        requestAnimationFrame(gameLoop);
    }
}

startScreen();