import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
import Ball from "./ball.js";
import Player from "./player.js";

let startBtn = document.getElementById("startBtn");
startBtn.addEventListener("click", startGame);

let messageBox = document.getElementById("message");

let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let player1, player2, ball, roomId;
let isGameStarted = false;
let playerNo = 0;

const socket = io("http://localhost:3000", {
    transports: ["websocket"]
});

function startGame() {
    startBtn.style.display = "none";

    if (socket.connected) {
        socket.emit("join");
        messageBox.innerText = "Waiting for other players....";
    } else {
        messageBox.innerText = "Failed to connect to server";
    }
}

socket.on("playerNo", (number) => {
    console.log(`Player number assigned: ${number}`);
    playerNo = number;
});

socket.on("startingGame", () => {
    isGameStarted = true;
    messageBox.innerText = "We are going to start the game....";
});

socket.on("startedGame", (room) => {
    roomId = room.id;
    messageBox.innerText = '';

    player1 = new Player(90, 200, 20, 60, "red");
    player2 = new Player(690, 200, 20, 60, "blue");
    ball = new Ball(400, 250, 10, "green");

    player1.score = room.players[0].score;
    player2.score = room.players[1].score;

    window.addEventListener("keydown", (e) => {
        if (isGameStarted) {
            if (e.keyCode === 38) {
                socket.emit("move", {
                    roomId: roomId,
                    playerNo: playerNo,
                    direction: "up"
                });
            } else if (e.keyCode === 40) {
                socket.emit("move", {
                    roomId: roomId,
                    playerNo: playerNo,
                    direction: "down"
                });
            }
        }
    });
    draw();
});

socket.on("updateGame", (room) => {
    console.log(room);
    console.log("P1::", room.players[0].y);
    console.log("P2::", room.players[1].y);

    player1.y = room.players[0].y;
    player2.y = room.players[1].y;
    ball.x = room.ball.x;
    ball.y = room.ball.y;
    player1.score = room.players[0].score;
    player2.score = room.players[1].score;

    draw();
});

socket.on("endGame", (room) => {
    isGameStarted = false;
    messageBox.innerText = room.winner === playerNo ? "You Won!" : "You Lost!";

    socket.emit("leave", roomId);

    setTimeout(() => {
        ctx.clearRect(0, 0, 800, 500);
        startBtn.style.display = "block";
    }, 3000);
});

function draw() {
    ctx.clearRect(0, 0, 800, 500);

    player1.draw(ctx);
    player2.draw(ctx);
    ball.draw(ctx);

    // Center line
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.setLineDash([10, 10]);
    ctx.moveTo(400, 5);
    ctx.lineTo(400, 495);
    ctx.stroke();
}
