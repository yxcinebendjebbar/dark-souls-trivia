const socket = io();

const mainMenu = document.getElementById('main-menu');
const gameRoom = document.getElementById('game-room');
const playerNameInput = document.getElementById('player-name');
const joinRoomButton = document.getElementById('join-room');
const leaderboard = document.getElementById('leaderboard');
const questionCard = document.getElementById('question-card');
const answerInput = document.getElementById('answer');
const submitAnswerButton = document.getElementById('submit-answer');

let roomId;

// Join room
joinRoomButton.addEventListener('click', () => {
    const playerName = playerNameInput.value;
    if (!playerName) return alert('Enter a name!');

    socket.emit('join_room', { playerName });
});

// Handle room joined
socket.on('room_joined', (id) => {
    roomId = id;
    mainMenu.style.display = 'none';
    gameRoom.style.display = 'block';
    document.body.style.alignItems = "start"
});

// Update leaderboard
socket.on('update_leaderboard', (players) => {
    console.log('Updated leaderboard received:', players); // Debug
    leaderboard.innerHTML = players
        .map((p) => `<div>${p.name}: ${p.score}</div>`)
        .join('');
});



// New question
socket.on('new_question', (question) => {
    questionCard.textContent = question;
});

// Submit answer
submitAnswerButton.addEventListener('click', () => {
    const answer = answerInput.value;
    socket.emit('submit_answer', { roomId, answer });
    answerInput.value = '';
});

socket.on('game_over', ({ winner, score }) => {
    document.getElementById('winner-name').textContent = `Winner: ${winner}`;
    document.getElementById('winner-score').textContent = `Score: ${score}`;
    document.getElementById('game-over-modal').style.display = 'block';
    gameRoom.style.display = 'none'
});
