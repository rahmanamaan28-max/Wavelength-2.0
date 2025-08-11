// Game state
const gameState = {
    players: [
        { id: 'player', name: 'Player', score: 0, isBot: false },
        { id: 'bot1', name: 'Bot 1', score: 0, isBot: true },
        { id: 'bot2', name: 'Bot 2', score: 0, isBot: true },
        { id: 'bot3', name: 'Bot 3', score: 0, isBot: true }
    ],
    totalRounds: 5,
    currentRound: 1,
    timer: 90,
    currentSpectrum: {
        left: "HOT",
        right: "COLD",
        name: "Temperature Spectrum"
    },
    clue: null,
    targetPosition: 0.4,
    currentPsychic: 0,
    guesses: [],
    difficulty: 'medium',
    gameStarted: false
};

// Spectra database
const spectra = [
    { left: "HOT", right: "COLD", name: "Temperature Spectrum" },
    { left: "LOUD", right: "QUIET", name: "Sound Level" },
    { left: "SIMPLE", right: "COMPLEX", name: "Complexity" },
    { left: "SAFE", right: "DANGEROUS", name: "Risk Level" },
    { left: "CHEAP", right: "EXPENSIVE", name: "Cost" },
    { left: "COMMON", right: "RARE", name: "Rarity" },
    { left: "WEAK", right: "STRONG", name: "Strength" },
    { left: "SLOW", right: "FAST", name: "Speed" },
    { left: "SOUR", right: "SWEET", name: "Taste" },
    { left: "UGLY", right: "BEAUTIFUL", name: "Aesthetics" }
];

// Bot clue database
const botClues = {
    "Temperature Spectrum": ["Coffee", "Snow", "Ice Cream", "Sauna", "Desert", "Arctic"],
    "Sound Level": ["Whisper", "Concert", "Library", "Jet Engine", "Mouse Click", "Thunder"],
    "Complexity": ["Rock", "Quantum Physics", "Addition", "Rocket Science", "ABCs", "Advanced Calculus"],
    "Risk Level": ["Pillow Fight", "Skydiving", "Brushing Teeth", "Shark Diving", "Walking", "Base Jumping"],
    "Cost": ["Paperclip", "Lamborghini", "Gum", "Private Island", "Penny", "Mona Lisa"],
    "Rarity": ["Pigeon", "Unicorn", "Rain", "Diamond", "Air", "Hope Diamond"],
    "Strength": ["Kitten", "Elephant", "Ant", "Gorilla", "Butterfly", "Hulk"],
    "Speed": ["Sloth", "Cheetah", "Turtle", "Ferrari", "Snail", "Lightning"],
    "Taste": ["Lemon", "Candy", "Vinegar", "Honey", "Pickle", "Chocolate"],
    "Aesthetics": ["Garbage", "Sunset", "Mold", "Rainbow", "Trash Heap", "Waterfall"]
};

// DOM Elements
const screens = {
    home: document.getElementById('home-screen'),
    game: document.getElementById('game-screen'),
    results: document.getElementById('results-screen'),
    gameover: document.getElementById('gameover-screen')
};

const playerNameInput = document.getElementById('player-name');
const roundsSelect = document.getElementById('rounds');
const difficultySelect = document.getElementById('difficulty');
const startGameBtn = document.getElementById('start-game');
const currentRoundDisplay = document.getElementById('current-round');
const totalRoundsDisplay = document.getElementById('total-rounds');
const playerScoreDisplay = document.getElementById('player-score');
const timerDisplay = document.getElementById('timer');
const psychicView = document.getElementById('psychic-view');
const guesserView = document.getElementById('guesser-view');
const spectrumLeft = document.getElementById('spectrum-left');
const spectrumRight = document.getElementById('spectrum-right');
const spectrumName = document.getElementById('spectrum-name');
const targetZone = document.getElementById('target-zone');
const clueInput = document.getElementById('clue-input');
const submitClueBtn = document.getElementById('submit-clue');
const clueDisplay = document.getElementById('clue-display');
const guesserLeft = document.getElementById('guesser-left');
const guesserRight = document.getElementById('guesser-right');
const dial = document.getElementById('dial');
const submitGuessBtn = document.getElementById('submit-guess');
const gameStatus = document.getElementById('game-status');
const botThinking = document.getElementById('bot-thinking');
const botMessage = document.getElementById('bot-message');
const playerCards = document.querySelectorAll('.player-card');
const playerScores = document.querySelectorAll('.player-score');
const nextRoundBtn = document.getElementById('next-round');
const playAgainBtn = document.getElementById('play-again');
const backToHomeBtn = document.getElementById('back-to-home');
const resultsList = document.getElementById('results-list');
const targetRangeDisplay = document.getElementById('target-range');
const resultsSpectrum = document.getElementById('results-spectrum');
const winnerName = document.getElementById('winner-name');
const roundHistory = document.getElementById('round-history');

// Current guess value
let currentGuess = 0.5;
let timerInterval;

// Initialize game
function initGame() {
    // Set up event listeners
    startGameBtn.addEventListener('click', startGame);
    submitClueBtn.addEventListener('click', submitClue);
    submitGuessBtn.addEventListener('click', submitGuess);
    nextRoundBtn.addEventListener('click', nextRound);
    playAgainBtn.addEventListener('click', playAgain);
    backToHomeBtn.addEventListener('click', backToHome);
    
    // Setup dial interaction
    setupDialInteraction();
}

// Start the game
function startGame() {
    // Get player name
    const playerName = playerNameInput.value.trim() || 'Player';
    gameState.players[0].name = playerName;
    playerCards[0].querySelector('.player-name').textContent = playerName;
    
    // Set game settings
    gameState.totalRounds = parseInt(roundsSelect.value);
    gameState.difficulty = difficultySelect.value;
    gameState.currentRound = 1;
    
    // Reset scores and history
    gameState.players.forEach(player => player.score = 0);
    roundHistory.innerHTML = '';
    updateScores();
    
    // Switch to game screen
    switchScreen('game');
    
    // Start first round
    startNewRound();
}

// Start a new round
function startNewRound() {
    // Clear any existing timers
    clearInterval(timerInterval);
    
    // Reset round state
    gameState.clue = null;
    gameState.guesses = [];
    gameState.timer = 90;
    
    // Select a random spectrum
    const spectrumIndex = Math.floor(Math.random() * spectra.length);
    gameState.currentSpectrum = spectra[spectrumIndex];
    
    // Set target position (20% wide zone)
    gameState.targetPosition = 0.1 + Math.random() * 0.8;
    
    // Rotate psychic
    gameState.currentPsychic = (gameState.currentPsychic + 1) % gameState.players.length;
    
    // Reset dial
    dial.style.transform = 'rotate(0deg)';
    currentGuess = 0.5;
    
    // Update UI
    updateGameScreen();
    
    // Hide bot thinking
    botThinking.style.display = 'none';
    
    // If psychic is a bot, generate clue automatically
    if (gameState.players[gameState.currentPsychic].isBot) {
        botGenerateClue();
    }
}

// Bot generates a clue
function botGenerateClue() {
    const psychic = gameState.players[gameState.currentPsychic];
    const spectrum = gameState.currentSpectrum.name;
    
    // Show bot thinking
    botThinking.style.display = 'block';
    botMessage.textContent = `${psychic.name} is thinking of a clue...`;
    
    // Generate clue after delay
    setTimeout(() => {
        const clues = botClues[spectrum] || ['Thing', 'Something', 'Object'];
        const clue = clues[Math.floor(Math.random() * clues.length)];
        gameState.clue = clue;
        
        // Update UI
        botMessage.innerHTML = `<span class="bot-message">${psychic.name} says: "${clue}"</span>`;
        updateGameScreen();
        
        // Start timer for guesses
        startTimer();
        
        // Bots submit guesses
        botGenerateGuesses();
    }, 2000);
}

// Bots submit guesses
function botGenerateGuesses() {
    gameState.players.forEach((player, index) => {
        if (player.isBot && index !== gameState.currentPsychic) {
            setTimeout(() => {
                // Difficulty affects how close bots get to the target
                let accuracy = 0.7; // medium
                if (gameState.difficulty === 'easy') accuracy = 0.5;
                if (gameState.difficulty === 'hard') accuracy = 0.85;
                
                // Generate guess (closer to target for higher difficulty)
                const baseGuess = gameState.targetPosition + (Math.random() - 0.5) * 0.4;
                const weightedGuess = baseGuess * accuracy + gameState.targetPosition * (1 - accuracy);
                const guess = Math.max(0, Math.min(1, weightedGuess));
                
                // Submit guess
                gameState.guesses.push({
                    player: player,
                    value: guess
                });
                
                // Update UI
                botMessage.innerHTML = `<span class="bot-message">${player.name} submitted a guess</span>`;
                updateGameScreen();
                
                // If all guesses are in, show results
                if (gameState.guesses.length === gameState.players.length - 1) {
                    showResults();
                }
            }, 1000 + Math.random() * 3000); // Random delay between 1-4 seconds
        }
    });
}

// Submit clue (player)
function submitClue() {
    const clue = clueInput.value.trim();
    if (clue) {
        gameState.clue = clue;
        clueInput.value = '';
        updateGameScreen();
        
        // Start timer for guesses
        startTimer();
        
        // Bots submit guesses
        botGenerateGuesses();
    }
}

// Submit guess (player)
function submitGuess() {
    // Only submit if player is not the psychic
    if (gameState.currentPsychic !== 0) {
        gameState.guesses.push({
            player: gameState.players[0],
            value: currentGuess
        });
        
        updateGameScreen();
        
        // If all guesses are in, show results
        if (gameState.guesses.length === gameState.players.length - 1) {
            showResults();
        }
    }
}

// Show results of the round
function showResults() {
    // Stop timer
    clearInterval(timerInterval);
    
    // Calculate points
    gameState.guesses.forEach(guess => {
        const distance = Math.abs(guess.value - gameState.targetPosition);
        let points = 0;
        
        if (distance <= 0.1) points = 4;
        else if (distance <= 0.2) points = 3;
        else if (distance <= 0.3) points = 2;
        else if (distance <= 0.4) points = 1;
        
        // Add to player score
        const playerIndex = gameState.players.findIndex(p => p.id === guess.player.id);
        gameState.players[playerIndex].score += points;
        
        // Add to round history
        if (!guess.player.isBot) {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.textContent = `Round ${gameState.currentRound}: You scored ${points} points`;
            roundHistory.appendChild(historyItem);
        }
    });
    
    // Update scores
    updateScores();
    
    // Display results
    displayResults();
    
    // Switch to results screen
    switchScreen('results');
}

// Display results
function displayResults() {
    // Clear previous results
    resultsList.innerHTML = '';
    resultsSpectrum.innerHTML = '<div class="target-zone" id="results-target-zone" style="left: 30%; width: 20%;"></div>';
    
    // Set target range
    const targetStart = Math.round((gameState.targetPosition - 0.1) * 100);
    const targetEnd = Math.round((gameState.targetPosition + 0.1) * 100);
    targetRangeDisplay.textContent = `${targetStart}-${targetEnd}%`;
    
    // Position target zone
    const resultsTargetZone = document.getElementById('results-target-zone');
    resultsTargetZone.style.left = `${(gameState.targetPosition - 0.1) * 100}%`;
    resultsTargetZone.style.width = '20%';
    
    // Add guess markers and results
    gameState.guesses.forEach(guess => {
        // Create marker
        const marker = document.createElement('div');
        marker.className = 'guess-marker';
        marker.style.left = `${guess.value * 100}%`;
        marker.style.backgroundColor = guess.player.isBot ? '#4CAF50' : '#2196F3';
        resultsSpectrum.appendChild(marker);
        
        // Create result item
        const resultItem = document.createElement('div');
        resultItem.className = 'result';
        
        // Calculate points
        const distance = Math.abs(guess.value - gameState.targetPosition);
        let points = 0;
        if (distance <= 0.1) points = 4;
        else if (distance <= 0.2) points = 3;
        else if (distance <= 0.3) points = 2;
        else if (distance <= 0.4) points = 1;
        
        resultItem.innerHTML = `
            <div class="player">${guess.player.name}: ${Math.round(guess.value * 100)}%</div>
            <div class="points">+${points} points</div>
        `;
        resultsList.appendChild(resultItem);
    });
}

// Move to next round
function nextRound() {
    gameState.currentRound++;
    
    if (gameState.currentRound > gameState.totalRounds) {
        endGame();
    } else {
        startNewRound();
        switchScreen('game');
    }
}

// End the game
function endGame() {
    // Determine winner
    let winner = gameState.players[0];
    for (let player of gameState.players) {
        if (player.score > winner.score) {
            winner = player;
        }
    }
    
    winnerName.textContent = winner.name;
    
    // Update final scores in game over screen
    const finalScores = document.querySelectorAll('#gameover-screen .player-score');
    gameState.players.forEach((player, i) => {
        finalScores[i].textContent = player.score;
    });
    
    switchScreen('gameover');
}

// Play again
function playAgain() {
    // Reset game state
    gameState.currentRound = 1;
    gameState.players.forEach(player => player.score = 0);
    roundHistory.innerHTML = '';
    
    startGame();
}

// Back to home
function backToHome() {
    switchScreen('home');
}

// Start timer
function startTimer() {
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        gameState.timer--;
        timerDisplay.textContent = formatTime(gameState.timer);
        
        if (gameState.timer <= 0) {
            clearInterval(timerInterval);
            showResults();
        }
    }, 1000);
}

// Format time for display
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update game screen
function updateGameScreen() {
    // Update round info
    currentRoundDisplay.textContent = gameState.currentRound;
    totalRoundsDisplay.textContent = gameState.totalRounds;
    
    // Update timer
    timerDisplay.textContent = formatTime(gameState.timer);
    
    // Update scores
    updateScores();
    
    // Update spectrum display
    spectrumLeft.textContent = gameState.currentSpectrum.left;
    spectrumRight.textContent = gameState.currentSpectrum.right;
    spectrumName.textContent = gameState.currentSpectrum.name;
    
    guesserLeft.textContent = gameState.currentSpectrum.left;
    guesserRight.textContent = gameState.currentSpectrum.right;
    
    // Position target zone
    targetZone.style.left = `${(gameState.targetPosition - 0.1) * 100}%`;
    targetZone.style.width = '20%';
    
    // Show clue if available
    if (gameState.clue) {
        clueDisplay.textContent = gameState.clue;
    } else {
        clueDisplay.textContent = 'Waiting for clue...';
    }
    
    // Show appropriate view
    const isPsychic = gameState.currentPsychic === 0;
    psychicView.classList.toggle('active', isPsychic);
    guesserView.classList.toggle('active', !isPsychic);
    
    // Update game status
    if (isPsychic) {
        gameStatus.textContent = "You are the Psychic! Give a clue to the other players.";
    } else {
        const psychicName = gameState.players[gameState.currentPsychic].name;
        if (gameState.clue) {
            gameStatus.textContent = `${psychicName} gave the clue: "${gameState.clue}" - Now make your guess!`;
        } else {
            gameStatus.textContent = `${psychicName} is the Psychic. Waiting for clue...`;
        }
    }
}

// Update scores
function updateScores() {
    playerScores.forEach((el, i) => {
        el.textContent = gameState.players[i].score;
    });
    playerScoreDisplay.textContent = gameState.players[0].score;
}

// Setup dial interaction
function setupDialInteraction() {
    dial.addEventListener('click', (e) => {
        const rect = dial.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const degrees = (angle * (180 / Math.PI) + 180) % 360;
        
        // Update guess position (0-1)
        currentGuess = degrees / 360;
        
        // Rotate dial
        dial.style.transform = `rotate(${degrees}deg)`;
    });
}

// Switch screens
function switchScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    screens[screenName].classList.add('active');
}

// Initialize the game
window.addEventListener('DOMContentLoaded', initGame);
