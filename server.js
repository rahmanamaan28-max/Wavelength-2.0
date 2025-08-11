const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const rooms = {};

// Helper functions
const generateRoomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

io.on('connection', (socket) => {
    let currentRoom = null;
    let player = null;

    // Join room
    socket.on('joinRoom', ({ playerName, roomCode }) => {
        roomCode = roomCode.toUpperCase();
        
        if (!rooms[roomCode]) {
            socket.emit('error', 'Room not found');
            return;
        }
        
        if (rooms[roomCode].gameStarted) {
            socket.emit('error', 'Game has already started');
            return;
        }
        
        player = {
            id: socket.id,
            name: playerName,
            isHost: false,
            team: null
        };
        
        rooms[roomCode].players.push(player);
        currentRoom = roomCode;
        socket.join(roomCode);
        
        socket.emit('roomJoined', {
            roomCode,
            players: rooms[roomCode].players
        });
        
        io.to(roomCode).emit('playerJoined', rooms[roomCode].players);
    });

    // Create room
    socket.on('createRoom', ({ playerName }) => {
        const roomCode = generateRoomCode();
        
        player = {
            id: socket.id,
            name: playerName,
            isHost: true,
            team: null
        };
        
        rooms[roomCode] = {
            players: [player],
            teams: { blue: [], red: [] },
            gameStarted: false,
            gameState: null
        };
        
        currentRoom = roomCode;
        socket.join(roomCode);
        
        socket.emit('roomCreated', { roomCode, players: rooms[roomCode].players });
    });

    // Join team
    socket.on('joinTeam', (team) => {
        if (!currentRoom || !player) return;
        
        // Remove player from any existing team
        rooms[currentRoom].teams.blue = rooms[currentRoom].teams.blue.filter(p => p.id !== player.id);
        rooms[currentRoom].teams.red = rooms[currentRoom].teams.red.filter(p => p.id !== player.id);
        
        // Add player to selected team
        rooms[currentRoom].teams[team].push(player);
        player.team = team;
        
        io.to(currentRoom).emit('teamUpdated', rooms[currentRoom].teams);
    });

    // Start game
    socket.on('startGame', ({ rounds, timer, gameMode }) => {
        if (!currentRoom || !player || !player.isHost) return;
        
        const room = rooms[currentRoom];
        room.gameStarted = true;
        
        // Initialize game state
        room.gameState = {
            totalRounds: parseInt(rounds),
            timerPerRound: parseInt(timer),
            gameMode,
            currentRound: 1,
            teams: [
                { name: 'Team Blue', score: 0, players: room.teams.blue },
                { name: 'Team Red', score: 0, players: room.teams.red }
            ],
            currentTeamIndex: 0,
            currentPsychic: null,
            currentSpectrum: null,
            clue: null,
            targetPosition: null,
            guesses: [],
            timer: parseInt(timer)
        };
        
        startNewRound(room);
        
        io.to(currentRoom).emit('gameStarted', room.gameState);
    });

    // Submit clue
    socket.on('submitClue', (clue) => {
        if (!currentRoom || !player || !rooms[currentRoom].gameState) return;
        
        const gameState = rooms[currentRoom].gameState;
        
        if (gameState.currentPsychic.id !== player.id) return;
        
        gameState.clue = clue;
        gameState.timer = rooms[currentRoom].gameState.timerPerRound;
        
        io.to(currentRoom).emit('updateGameState', gameState);
        
        // Start timer for guesses
        startTimer(currentRoom);
    });

    // Submit guess
    socket.on('submitGuess', (value) => {
        if (!currentRoom || !player || !rooms[currentRoom].gameState) return;
        
        const gameState = rooms[currentRoom].gameState;
        
        // Only allow guesses from non-psychic players
        if (gameState.currentPsychic.id === player.id) return;
        
        // Add guess
        gameState.guesses.push({
            player: {
                id: player.id,
                name: player.name,
                team: player.team
            },
            value: value
        });
        
        io.to(currentRoom).emit('updateGameState', gameState);
        
        // Check if all players have guessed
        if (gameState.guesses.length === gameState.teams[0].players.length + gameState.teams[1].players.length - 1) {
            calculateResults(currentRoom);
        }
    });

    // Next round
    socket.on('nextRound', () => {
        if (!currentRoom || !player || !player.isHost) return;
        
        const room = rooms[currentRoom];
        room.gameState.currentRound++;
        
        if (room.gameState.currentRound > room.gameState.totalRounds) {
            endGame(currentRoom);
            return;
        }
        
        startNewRound(room);
        io.to(currentRoom).emit('updateGameState', room.gameState);
    });

    // Play again
    socket.on('playAgain', () => {
        if (!currentRoom || !player || !player.isHost) return;
        
        const room = rooms[currentRoom];
        room.gameState.currentRound = 1;
        room.gameState.teams[0].score = 0;
        room.gameState.teams[1].score = 0;
        
        startNewRound(room);
        io.to(currentRoom).emit('updateGameState', room.gameState);
        switchScreen('game');
    });

    // Back to lobby
    socket.on('backToLobby', () => {
        if (!currentRoom || !player || !player.isHost) return;
        
        const room = rooms[currentRoom];
        room.gameStarted = false;
        room.gameState = null;
        
        io.to(currentRoom).emit('backToLobby');
    });

    // Disconnect
    socket.on('disconnect', () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        
        const room = rooms[currentRoom];
        
        // Remove player from room
        room.players = room.players.filter(p => p.id !== socket.id);
        
        // Remove player from teams
        room.teams.blue = room.teams.blue.filter(p => p.id !== socket.id);
        room.teams.red = room.teams.red.filter(p => p.id !== socket.id);
        
        // If no players left, delete room
        if (room.players.length === 0) {
            delete rooms[currentRoom];
        } else {
            // If host left, assign new host
            if (player && player.isHost) {
                room.players[0].isHost = true;
            }
            
            io.to(currentRoom).emit('playerLeft', room.players);
            io.to(currentRoom).emit('teamUpdated', room.teams);
        }
    });

    // Helper functions
    function startNewRound(room) {
        const gameState = room.gameState;
        
        // Reset round-specific state
        gameState.clue = null;
        gameState.guesses = [];
        gameState.timer = gameState.timerPerRound;
        
        // Select psychic (rotate through players)
        const currentTeam = gameState.teams[gameState.currentTeamIndex];
        const psychicIndex = gameState.currentPsychic 
            ? (currentTeam.players.indexOf(gameState.currentPsychic) + 1) % currentTeam.players.length
            : 0;
        
        gameState.currentPsychic = currentTeam.players[psychicIndex];
        
        // Select spectrum and target position
        // In a real game, this would come from a predefined deck
        gameState.currentSpectrum = {
            left: 'Hot',
            right: 'Cold',
            name: 'Temperature Spectrum'
        };
        gameState.targetPosition = Math.random();
        
        // Switch to next team for next round
        gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % gameState.teams.length;
    }

    function startTimer(roomCode) {
        const room = rooms[roomCode];
        const gameState = room.gameState;
        
        const timerInterval = setInterval(() => {
            gameState.timer--;
            
            if (gameState.timer <= 0) {
                clearInterval(timerInterval);
                calculateResults(roomCode);
            } else {
                io.to(roomCode).emit('updateGameState', gameState);
            }
        }, 1000);
    }

    function calculateResults(roomCode) {
        const room = rooms[roomCode];
        const gameState = room.gameState;
        
        const results = {
            targetPosition: gameState.targetPosition,
            guesses: []
        };
        
        // Calculate points for each guess
        gameState.guesses.forEach(guess => {
            const distance = Math.abs(guess.value - gameState.targetPosition);
            let points = 0;
            
            if (distance <= 0.1) {
                points = 4;
            } else if (distance <= 0.2) {
                points = 3;
            } else if (distance <= 0.3) {
                points = 2;
            } else if (distance <= 0.4) {
                points = 1;
            }
            
            // Add to team score
            const teamIndex = guess.team === 'blue' ? 0 : 1;
            gameState.teams[teamIndex].score += points;
            
            results.guesses.push({
                player: guess.player,
                value: guess.value,
                points: points,
                team: guess.team
            });
        });
        
        io.to(roomCode).emit('showResults', results);
    }

    function endGame(roomCode) {
        const room = rooms[roomCode];
        const finalScores = {
            blue: room.gameState.teams[0].score,
            red: room.gameState.teams[1].score
        };
        
        io.to(roomCode).emit('gameOver', finalScores);
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
