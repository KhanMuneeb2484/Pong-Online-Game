require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const cors = require('cors');

const { Server } = require("socket.io");
const io = new Server(server);

app.use(cors({
    origin: "*",
}));

let rooms = [];

app.get('/', (req, res) => {
    res.send('<h1>PONG SERVER</h1>');
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on("join", () => {
        let room;
        if (rooms.length > 0 && rooms[rooms.length - 1].players.length < 2) {
            room = rooms[rooms.length - 1];
        }

        if (room) {
            socket.join(room.id);
            socket.emit("playerNo", 2);

            // Add player to room
            room.players.push({
                socketId: socket.id,
                playerNo: 2,
                score: 0,
                x: 690,
                y: 200,
            });

            // Send message to room
            io.to(room.id).emit("startingGame");

            setTimeout(() => {
                io.to(room.id).emit("startedGame", room);

                // Start game
                startGame(room);
            }, 3000);
        } else {
            room = {
                id: rooms.length + 1,
                players: [{
                    socketId: socket.id,
                    playerNo: 1,
                    score: 0,
                    x: 90,
                    y: 200,
                }],
                ball: {
                    x: 395,
                    y: 245,
                    dx: Math.random() < 0.5 ? 1 : -1,
                    dy: 0,
                },
                winner: 0,
            };
            rooms.push(room);
            socket.join(room.id);
            socket.emit("playerNo", 1);
        }
    });

    socket.on("move", (data) => {
        let room = rooms.find(room => room.id === data.roomId);
        if (room) {
            if (data.direction === "up") {
                room.players[data.playerNo - 1].y -= 10;

                if (room.players[data.playerNo - 1].y < 0) {
                    room.players[data.playerNo - 1].y = 0;
                }
            } else if (data.direction === "down") {
                room.players[data.playerNo - 1].y += 10;

                if (room.players[data.playerNo - 1].y > 440) {
                    room.players[data.playerNo - 1].y = 440;
                }
            }
        }

        // Update rooms
        rooms = rooms.map(r => r.id === room.id ? room : r);
    });

    socket.on('leave', (roomId) => {
        socket.leave(roomId);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

function startGame(room) {
    const minSpeed = 1; // Minimum speed for dx and dy components
    const speedMultiplier = 5; // Multiplier for ball speed
    const boundaryOffset = 10; // Offset for scoring before the exact boundary

    let interval = setInterval(() => {
        room.ball.x += room.ball.dx * speedMultiplier;
        room.ball.y += room.ball.dy * speedMultiplier;

        // Ball collision with player 1's paddle (expanded range)
        if (room.ball.x <= 120 && room.ball.x > 100 && room.ball.y >= room.players[0].y && room.ball.y <= room.players[0].y + 60) {
            room.ball.dx = Math.abs(room.ball.dx); // Ensure ball moves right
            room.ball.dy = (room.ball.y - (room.players[0].y + 30)) / 5;

            // Ensure minimum speed and prevent getting stuck
            room.ball.dx = Math.max(minSpeed, room.ball.dx);
            room.ball.dy = Math.sign(room.ball.dy) * Math.max(minSpeed, Math.abs(room.ball.dy));

            // Reposition ball to avoid immediate re-collision
            room.ball.x = 121;
        }

        // Ball collision with player 2's paddle (expanded range)
        if (room.ball.x >= 680 && room.ball.x < 700 && room.ball.y >= room.players[1].y && room.ball.y <= room.players[1].y + 60) {
            room.ball.dx = -Math.abs(room.ball.dx); // Ensure ball moves left
            room.ball.dy = (room.ball.y - (room.players[1].y + 30)) / 5;

            // Ensure minimum speed and prevent getting stuck
            room.ball.dx = -Math.max(minSpeed, Math.abs(room.ball.dx));
            room.ball.dy = Math.sign(room.ball.dy) * Math.max(minSpeed, Math.abs(room.ball.dy));

            // Reposition ball to avoid immediate re-collision
            room.ball.x = 679;
        }

        // Ball collision with top and bottom walls
        if (room.ball.y <= 0 || room.ball.y >= 490) {
            room.ball.dy *= -1;

            // Ensure minimum speed and prevent getting stuck
            room.ball.dy = Math.sign(room.ball.dy) * Math.max(minSpeed, Math.abs(room.ball.dy));

            // Reposition ball to avoid immediate re-collision
            if (room.ball.y <= 0) {
                room.ball.y = 1;
            } else if (room.ball.y >= 490) {
                room.ball.y = 489;
            }
        }

        // Scoring logic with adjusted boundary limits
        if (room.ball.x <= boundaryOffset) {
            room.players[1].score++;
            resetBall(room, 1);  // Reset ball with initial dx towards player 1
        } else if (room.ball.x >= 800 - boundaryOffset) {
            room.players[0].score++;
            resetBall(room, -1);  // Reset ball with initial dx towards player 2
        }

        // Check if a player has won
        if (room.players[0].score === 10) {
            room.winner = 1;
            io.to(room.id).emit("endGame", room);
            clearInterval(interval);
        } else if (room.players[1].score === 10) {
            room.winner = 2;
            io.to(room.id).emit("endGame", room);
            clearInterval(interval);
        }

        io.to(room.id).emit("updateGame", room);
    }, 1000 / 60);
}

function resetBall(room, direction) {
    // Reset ball to the center with a specified direction
    const initialSpeed = 1; // Initial speed after reset
    room.ball.x = 395;
    room.ball.y = 245;
    room.ball.dx = direction * initialSpeed; // Set initial speed and direction
    room.ball.dy = (Math.random() * 2 - 1) * initialSpeed; // Randomize initial vertical speed

    // Ensure the ball doesn't move too parallel to the walls
    room.ball.dx = Math.max(initialSpeed, Math.abs(room.ball.dx)) * direction;
    room.ball.dy = Math.sign(room.ball.dy) * Math.max(initialSpeed, Math.abs(room.ball.dy));
}



server.listen(process.env.PORT, () => {
    console.log(`Server is listening on Port ${process.env.PORT}`);
});
