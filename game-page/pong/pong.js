const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// global variables
const cWidth = canvas.width; // canvas width
const cHeight = canvas.Height; // canvas height

function gameLoop() {
    while (running) {
        ctx.clearRect(0, 0, canvas.cWidth, canvas.cHeight);

        ctx.beginPath();
        ctx.arc(95, 50, 40, 0, 2 * Math.PI);
        ctx.stroke();
    }
}