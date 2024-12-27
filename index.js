const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const triviaData = require('./trivia.json');

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const PORT = 3000


app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});



let rooms = {}

let usedQuestions = new Set();


const generateRoomId = () => Math.random().toString(36).substring(2, 6)


const getRandomTrivia = () => {
    return triviaData[Math.floor(Math.random() * triviaData.length)];
};


io.on('connection', (socket) => {
    console.log(`Player conected: ${socket.id}`)

    socket.on('join_room', ({ playerName }) => {
        // Find an existing room with available slots
        let roomId = Object.keys(rooms).find(
            (id) => rooms[id].players.length < 10
        );

        // If no room is found or all rooms are full, create a new room
        if (!roomId) {
            roomId = generateRoomId();
            rooms[roomId] = { players: [], gameState: {} };
        }

        const room = rooms[roomId];

        // Add the player to the room
        room.players.push({ id: socket.id, name: playerName, score: 0 });
        socket.join(roomId);

        room.players.sort((a, b) => b.score - a.score);

        // Broadcast the updated player list to everyone in the room
        io.to(roomId).emit('update_leaderboard', room.players);

        // Start the game if this is the first player in the room
        if (room.players.length >= 2) {
            startGame(roomId);
        }

        console.log(`Player ${playerName} joined room ${roomId}`);
        console.log(`Current players in room ${roomId}:`, room.players);

        // Inform the player that they have successfully joined the room
        socket.emit('room_joined', roomId);
    });




    const startGame = (roomId) => {
        const room = rooms[roomId];
        if (!room) return;

        let trivia = getRandomTrivia();

        // Ensure the question hasn't been asked before
        while (usedQuestions.has(trivia.question)) {
            trivia = getRandomTrivia();
        }

        usedQuestions.add(trivia.question); // Mark the question as asked
        room.gameState.currentTrivia = trivia;

        io.to(roomId).emit('new_question', trivia.question);
    };



    // Handle answers
    socket.on('submit_answer', ({ roomId, answer }) => {
        const room = rooms[roomId];
        if (!room) return;

        const { currentTrivia } = room.gameState;
        const player = room.players.find((p) => p.id === socket.id);

        if (currentTrivia && answer.toLowerCase() === currentTrivia.answer.toLowerCase()) {
            player.score += 1;
        }

        // Check if all questions are done
        if (usedQuestions.size === triviaData.length) {
            // Game over, show winner
            const winner = room.players.reduce((prev, current) => (prev.score > current.score ? prev : current));
            io.to(roomId).emit('game_over', { winner: winner.name, score: winner.score });
            return;
        }

        // Sort leaderboard and send updated data
        room.players.sort((a, b) => b.score - a.score);
        io.to(roomId).emit('update_leaderboard', room.players);

        // Get new question
        let trivia = getRandomTrivia();
        while (usedQuestions.has(trivia.question)) {
            trivia = getRandomTrivia()
        }
        usedQuestions.add(trivia.question)
        room.gameState.currentTrivia = trivia;
        io.to(roomId).emit('new_question', trivia.question);
    });


    // disconnects
    socket.on('disconnect', () => {
        for (let roomId in rooms) {
            const room = rooms[roomId];
            room.players = room.players.filter((p) => p.id !== socket.id);

            if (room.players.length === 0) {
                delete rooms[roomId];
            } else {
                // Update leaderboard for remaining players
                io.to(roomId).emit('update_leaderboard', room.players);
            }
        }
    });

})
