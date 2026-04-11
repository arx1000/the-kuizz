const generatePin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const games = new Map();

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const shuffleQuestions = (questions) => {
  return questions.map(q => {
    const optionsWithIndex = q.options.map((opt, idx) => ({ text: opt, originalIndex: idx }));
    const shuffledOptions = shuffleArray(optionsWithIndex);
    const newCorrectAnswer = shuffledOptions.findIndex(o => o.originalIndex === q.correctAnswer);
    
    return {
      ...q,
      options: shuffledOptions.map(o => o.text),
      correctAnswer: newCorrectAnswer,
      originalCorrectAnswer: q.correctAnswer
    };
  });
};

const calculateScore = (timeRemaining, timeLimit, isCorrect, maxPoints = 1000) => {
  if (!isCorrect) return 0;
  const basePoints = maxPoints;
  const timeBonus = Math.floor((timeRemaining / timeLimit) * maxPoints);
  return basePoints + timeBonus;
};

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('host:create', (data, callback) => {
      try {
        const { quiz, userId } = data;
        
        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
          return callback({ success: false, message: 'Invalid quiz data' });
        }

        const pin = generatePin();
        const gameId = `game_${Date.now()}`;
        const shuffledQuestions = shuffleQuestions(quiz.questions);

        const game = {
          id: gameId,
          pin,
          quiz: {
            ...quiz,
            questions: shuffledQuestions
          },
          hostId: socket.id,
          hostUserId: userId,
          players: new Map(),
          state: 'waiting',
          currentQuestion: -1,
          answers: new Map(),
          scores: new Map(),
          startTime: null,
          questionStartTime: null,
          questionTimer: null
        };

        games.set(pin, game);
        socket.join(`game:${pin}`);
        
        console.log(`Game created with PIN: ${pin}`);
        callback({ success: true, pin, gameId });
      } catch (error) {
        console.error('Create game error:', error);
        callback({ success: false, message: 'Failed to create game' });
      }
    });

    socket.on('host:start', (data, callback) => {
      try {
        const { pin } = data;
        const game = games.get(pin);

        if (!game) {
          return callback({ success: false, message: 'Game not found' });
        }

        if (game.players.size === 0) {
          return callback({ success: false, message: 'No players have joined yet' });
        }

        if (game.questionTimer) {
          clearTimeout(game.questionTimer);
          game.questionTimer = null;
        }

        game.state = 'question';
        game.currentQuestion = 0;
        game.scores = new Map();
        game.answers = new Map();
        game.startTime = Date.now();

        game.players.forEach((player) => {
          game.scores.set(player.id, { score: 0, answers: [] });
        });

        const question = game.quiz.questions[0];
        const questionData = {
          questionIndex: 0,
          totalQuestions: game.quiz.questions.length,
          question: question.questionText,
          options: question.options,
          timeLimit: question.timeLimit,
          totalTime: game.quiz.questions.reduce((sum, q) => sum + q.timeLimit + 5, 0)
        };

        game.questionStartTime = Date.now();

        io.to(`game:${pin}`).emit('game:question', questionData);

        game.questionTimer = setTimeout(() => {
          if (game.state === 'question' && game.currentQuestion === 0) {
            endQuestion(game, io, pin);
          }
        }, question.timeLimit * 1000);

        callback({ success: true });
      } catch (error) {
        console.error('Start game error:', error);
        callback({ success: false, message: 'Failed to start game' });
      }
    });

    socket.on('host:next', (data, callback) => {
      try {
        const { pin } = data;
        const game = games.get(pin);

        if (!game) {
          return callback({ success: false, message: 'Game not found' });
        }

        if (game.questionTimer) {
          clearTimeout(game.questionTimer);
          game.questionTimer = null;
        }

        if (game.state === 'question') {
          endQuestion(game, io, pin);
        }

        game.currentQuestion++;

        if (game.currentQuestion >= game.quiz.questions.length) {
          game.state = 'finished';
          showFinalResults(game, io, pin);
          return callback({ success: true, finished: true });
        }

        const question = game.quiz.questions[game.currentQuestion];
        const questionData = {
          questionIndex: game.currentQuestion,
          totalQuestions: game.quiz.questions.length,
          question: question.questionText,
          options: question.options,
          timeLimit: question.timeLimit
        };

        game.questionStartTime = Date.now();
        io.to(`game:${pin}`).emit('game:question', questionData);

        game.questionTimer = setTimeout(() => {
          if (game.state === 'question' && game.currentQuestion >= 0) {
            endQuestion(game, io, pin);
          }
        }, question.timeLimit * 1000);

        callback({ success: true });
      } catch (error) {
        console.error('Next question error:', error);
        callback({ success: false, message: 'Failed to proceed' });
      }
    });

    socket.on('host:kick', (data, callback) => {
      try {
        const { pin, playerId } = data;
        const game = games.get(pin);

        if (!game) {
          return callback({ success: false, message: 'Game not found' });
        }

        const player = game.players.get(playerId);
        if (player) {
          io.to(`player:${playerId}`).emit('game:kicked');
          game.players.delete(playerId);
          io.to(`game:${pin}`).emit('game:playerLeft', { playerId, username: player.username });
        }

        callback({ success: true });
      } catch (error) {
        console.error('Kick player error:', error);
        callback({ success: false, message: 'Failed to kick player' });
      }
    });

    socket.on('host:end', (data, callback) => {
      try {
        const { pin } = data;
        const game = games.get(pin);

        if (!game) {
          return callback({ success: false, message: 'Game not found' });
        }

        if (game.questionTimer) {
          clearTimeout(game.questionTimer);
        }

        game.state = 'finished';
        showFinalResults(game, io, pin);
        games.delete(pin);

        callback({ success: true });
      } catch (error) {
        console.error('End game error:', error);
        callback({ success: false, message: 'Failed to end game' });
      }
    });

    socket.on('player:join', (data, callback) => {
      try {
        const { pin, username, userId } = data;
        const game = games.get(pin);

        if (!game) {
          return callback({ success: false, message: 'Game not found' });
        }

        if (game.state !== 'waiting') {
          return callback({ success: false, message: 'Game already started' });
        }

        const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const player = {
          id: playerId,
          username: username.substring(0, 20),
          userId,
          socketId: socket.id,
          score: 0
        };

        game.players.set(playerId, player);
        socket.join(`game:${pin}`);
        socket.join(`player:${playerId}`);

        socket.emit('player:joined', { playerId, player });
        io.to(`game:${pin}`).emit('game:playerJoined', { 
          playerId, 
          username: player.username,
          playerCount: game.players.size 
        });

        callback({ success: true, playerId });
      } catch (error) {
        console.error('Join game error:', error);
        callback({ success: false, message: 'Failed to join game' });
      }
    });

    socket.on('player:answer', (data, callback) => {
      try {
        const { pin, playerId, answer, timeRemaining } = data;
        const game = games.get(pin);

        if (!game) {
          return callback({ success: false, message: 'Game not found' });
        }

        if (game.state !== 'question') {
          return callback({ success: false, message: 'No active question' });
        }

        if (game.answers.has(playerId)) {
          return callback({ success: false, message: 'Already answered' });
        }

        const currentQuestion = game.quiz.questions[game.currentQuestion];
        const isCorrect = answer === currentQuestion.correctAnswer;
        const score = calculateScore(timeRemaining, currentQuestion.timeLimit, isCorrect, currentQuestion.maxPoints || 1000);

        game.answers.set(playerId, {
          answer,
          isCorrect,
          score,
          timeRemaining
        });

        const playerScore = game.scores.get(playerId) || { score: 0, answers: [] };
        playerScore.score += score;
        playerScore.answers.push({ question: game.currentQuestion, isCorrect, score });
        game.scores.set(playerId, playerScore);

        const player = game.players.get(playerId);
        if (player) {
          player.score = playerScore.score;
        }

        socket.emit('player:answered', { 
          success: true, 
          isCorrect,
          score,
          correctAnswer: currentQuestion.correctAnswer
        });

        callback({ success: true });
      } catch (error) {
        console.error('Answer error:', error);
        callback({ success: false, message: 'Failed to submit answer' });
      }
    });
    socket.on('player:next', (data, callback) => {
  try {
    const { pin, playerId } = data;
    callback({ success: true });
  } catch (error) {
    console.error('Player next error:', error);
  }
});

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      games.forEach((game, pin) => {
        if (game.hostId === socket.id) {
          if (game.questionTimer) {
            clearTimeout(game.questionTimer);
          }
          io.to(`game:${pin}`).emit('game:hostLeft');
          games.delete(pin);
        } else {
          game.players.forEach((player, playerId) => {
            if (player.socketId === socket.id) {
              game.players.delete(playerId);
              io.to(`game:${pin}`).emit('game:playerLeft', { playerId, username: player.username });
            }
          });
        }
      });
    });

    function endQuestion(game, io, pin) {
      if (game.questionTimer) {
        clearTimeout(game.questionTimer);
        game.questionTimer = null;
      }
      
      if (game.state !== 'question') return;
      
      game.state = 'results';
      const currentQuestion = game.quiz.questions[game.currentQuestion];
      
      const leaderboard = Array.from(game.players.values())
        .map(p => ({
          playerId: p.id,
          username: p.username,
          score: p.score,
          rank: 0
        }))
        .sort((a, b) => b.score - a.score)
        .map((p, idx) => ({ ...p, rank: idx + 1 }));

      io.to(`game:${pin}`).emit('game:results', {
        questionIndex: game.currentQuestion,
        correctAnswer: currentQuestion.correctAnswer,
        leaderboard: leaderboard.slice(0, 10)
      });

      game.answers = new Map();
    }

    function showFinalResults(game, io, pin) {
      if (game.questionTimer) {
        clearTimeout(game.questionTimer);
        game.questionTimer = null;
      }

      const podium = Array.from(game.players.values())
        .map(p => ({
          playerId: p.id,
          username: p.username,
          score: p.score
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((p, idx) => ({ ...p, position: idx + 1 }));

      const allPlayers = Array.from(game.players.values())
        .map(p => ({
          playerId: p.id,
          username: p.username,
          score: p.score
        }))
        .sort((a, b) => b.score - a.score);

      io.to(`game:${pin}`).emit('game:finished', {
        podium,
        leaderboard: allPlayers.slice(0, 20)
      });
    }
  });
};

module.exports = setupSocketHandlers;
