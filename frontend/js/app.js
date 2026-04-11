class QuizGame {
  constructor() {
    this.socket = io();
    this.currentScreen = 'landing';
    this.user = null;
    this.isHost = false;
    this.currentPin = null;
    this.playerId = null;
    this.currentQuiz = null;
    this.gameState = null;
    this.timer = null;
    this.timeRemaining = 0;
    this.questionStartTime = 0;
    this.hasAnswered = false;
    this.selectedQuizId = null;

    this.init();
  }

  init() {
    this.setupSocketHandlers();
    this.setupUIHandlers();
    this.setupModals();
    this.checkAuth();
  }

  setupSocketHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.showError('Connection lost. Please refresh the page.');
    });

    this.socket.on('game:playerJoined', (data) => {
      this.addPlayer(data.playerId, data.username);
      this.updatePlayerCount();
    });

    this.socket.on('game:playerLeft', (data) => {
      this.removePlayer(data.playerId);
      this.updatePlayerCount();
    });

    this.socket.on('game:question', (data) => {
      this.showQuestion(data);
    });

    this.socket.on('game:results', (data) => {
      this.showResults(data);
    });

    this.socket.on('game:finished', (data) => {
      this.showFinalResults(data);
    });

    this.socket.on('game:hostLeft', () => {
      this.showError('Host has ended the game');
      setTimeout(() => this.showScreen('landing'), 2000);
    });

    this.socket.on('player:joined', (data) => {
      this.playerId = data.playerId;
    });

    this.socket.on('player:answered', (data) => {
      this.handleAnswerResponse(data);
    });

    this.socket.on('game:kicked', () => {
      this.showError('You have been removed from the game');
      setTimeout(() => this.showScreen('landing'), 2000);
    });
  }

  setupUIHandlers() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    document.getElementById('join-btn').addEventListener('click', () => this.joinGame());
    document.getElementById('game-pin').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinGame();
    });
    document.getElementById('player-name').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinGame();
    });

    document.getElementById('login-btn').addEventListener('click', () => this.openModal('login-modal'));
    document.getElementById('guest-btn').addEventListener('click', () => this.createGuest());
    document.getElementById('host-name').addEventListener('input', (e) => {
      const name = e.target.value.trim();
      document.getElementById('login-btn').disabled = name.length < 2;
      document.getElementById('guest-btn').disabled = name.length < 2;
    });

    document.getElementById('create-quiz-btn').addEventListener('click', () => this.showScreen('quiz-creator'));
    document.getElementById('add-question-btn').addEventListener('click', () => this.addQuestionEditor());
    document.getElementById('save-quiz-btn').addEventListener('click', () => this.saveQuiz());
    document.getElementById('back-to-landing').addEventListener('click', () => this.showScreen('landing'));

    document.getElementById('quiz-select').addEventListener('change', (e) => {
      this.selectedQuizId = e.target.value;
      const startBtn = document.getElementById('host-game-btn');
      if (e.target.value) {
        startBtn.classList.remove('hidden');
        startBtn.textContent = 'Start with Selected Quiz';
      } else {
        startBtn.classList.add('hidden');
      }
    });

    document.getElementById('host-game-btn').addEventListener('click', () => this.startHosting());
    document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
    document.getElementById('end-game-btn').addEventListener('click', () => this.endGame());
    document.getElementById('play-again-btn').addEventListener('click', () => this.playAgain());
  }

  setupModals() {
    document.getElementById('close-login').addEventListener('click', () => this.closeModal('login-modal'));
    document.getElementById('close-register').addEventListener('click', () => this.closeModal('register-modal'));
    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      this.closeModal('login-modal');
      this.openModal('register-modal');
    });
    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      this.closeModal('register-modal');
      this.openModal('login-modal');
    });

    document.getElementById('submit-login').addEventListener('click', () => this.handleLogin());
    document.getElementById('submit-register').addEventListener('click', () => this.handleRegister());

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal(modal.id);
      });
    });
  }

async checkAuth() {
  api.setToken(null);
  localStorage.removeItem('quizToken');
  console.log('Ready to login');
}

  showAuthenticatedState(username) {
    document.querySelector('.auth-section').classList.add('hidden');
    document.getElementById('host-authenticated').classList.remove('hidden');
    document.getElementById('host-username').textContent = username;
    this.loadMyQuizzes();
  }

  async loadMyQuizzes() {
    try {
      const quizzes = await api.getMyQuizzes();
      const select = document.getElementById('quiz-select');
      select.innerHTML = '<option value="">Create New Quiz</option>';
      quizzes.forEach(quiz => {
        const option = document.createElement('option');
        option.value = quiz._id;
        option.textContent = `${quiz.title} (${quiz.questions.length} questions)`;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    }
  }

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tab}-tab`);
    });
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    this.currentScreen = screenId;
  }

  openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  showError(message) {
    const toast = document.getElementById('error-toast');
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
  }

  showSuccess(message) {
    const toast = document.getElementById('success-toast');
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
  }

  async joinGame() {
    const pin = document.getElementById('game-pin').value.trim();
    const name = document.getElementById('player-name').value.trim();

    if (!pin || pin.length !== 6) {
      this.showError('Please enter a valid 6-digit PIN');
      return;
    }

    if (!name || name.length < 2) {
      this.showError('Please enter your name (min 2 characters)');
      return;
    }

    this.socket.emit('player:join', { pin, username: name }, (response) => {
      if (response.success) {
        this.isHost = false;
        this.currentPin = pin;
        this.showScreen('player-waiting');
        document.getElementById('waiting-pin').textContent = pin;
      } else {
        this.showError(response.message);
      }
    });
  }

  async createGuest() {
    const name = document.getElementById('host-name').value.trim();
    if (!name || name.length < 2) {
      this.showError('Please enter your name');
      return;
    }

    try {
      const data = await api.createGuest(name);
      this.user = data.user;
      this.showAuthenticatedState(name);
      this.showSuccess('Playing as guest!');
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      this.showError('Please fill in all fields');
      return;
    }

    try {
      const data = await api.login(email, password);
      this.user = data.user;
      this.closeModal('login-modal');
      this.showAuthenticatedState(data.user.username);
      this.showSuccess('Welcome back!');
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!username || !email || !password) {
      this.showError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      this.showError('Password must be at least 6 characters');
      return;
    }

    try {
      const data = await api.register(username, email, password);
      this.user = data.user;
      this.closeModal('register-modal');
      this.showAuthenticatedState(data.user.username);
      this.showSuccess('Account created successfully!');
    } catch (error) {
      this.showError(error.message);
    }
  }

  async startHosting() {
    if (this.selectedQuizId) {
      try {
        this.currentQuiz = await api.getQuiz(this.selectedQuizId);
      } catch (error) {
        this.showError('Failed to load quiz');
        return;
      }
    }

    if (!this.currentQuiz || !this.currentQuiz.questions || this.currentQuiz.questions.length === 0) {
      this.showScreen('quiz-creator');
      this.addQuestionEditor();
      return;
    }

    this.createGame(this.currentQuiz);
  }

  createGame(quiz) {
    this.socket.emit('host:create', { quiz, userId: this.user?._id }, (response) => {
      if (response.success) {
        this.isHost = true;
        this.currentPin = response.pin;
        this.showScreen('lobby');
        document.getElementById('display-pin').textContent = response.pin;
        document.getElementById('start-game-btn').disabled = true;
        document.getElementById('start-game-btn').textContent = 'Waiting for players...';
      } else {
        this.showError(response.message);
      }
    });
  }

  addQuestionEditor(question = null) {
    const container = document.getElementById('questions-container');
    const index = container.children.length;
    
    const editor = document.createElement('div');
    editor.className = 'question-editor';
    editor.dataset.index = index;
    editor.innerHTML = `
      <h4>Question ${index + 1}</h4>
      <div class="form-group">
        <input type="text" class="question-text" placeholder="Enter your question" 
               value="${question?.questionText || ''}" maxlength="200">
      </div>
      <div class="options-grid-editor">
        ${[0, 1, 2, 3].map(i => `
          <div class="option-input">
            <input type="radio" name="correct-${index}" value="${i}" 
                   ${question?.correctAnswer === i ? 'checked' : ''}>
            <input type="text" class="option-text" placeholder="Option ${i + 1}" 
                   value="${question?.options?.[i] || ''}" maxlength="100">
          </div>
        `).join('')}
      </div>
      <div class="time-limit-group">
        <label>Time Limit:</label>
        <input type="number" class="time-limit" min="5" max="30" value="${question?.timeLimit || 10}">
        <span>seconds</span>
      </div>
      <button class="btn btn-danger delete-question">Delete</button>
    `;

    editor.querySelector('.delete-question').addEventListener('click', () => {
      if (container.children.length > 1) {
        editor.remove();
        this.reorderQuestions();
      } else {
        this.showError('Quiz must have at least one question');
      }
    });

    container.appendChild(editor);
  }

  reorderQuestions() {
    document.querySelectorAll('.question-editor').forEach((editor, idx) => {
      editor.dataset.index = idx;
      editor.querySelector('h4').textContent = `Question ${idx + 1}`;
      editor.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.name = `correct-${idx}`;
      });
    });
  }

  collectQuizData() {
    const title = document.getElementById('quiz-title').value.trim();
    const description = document.getElementById('quiz-description').value.trim();
    const questions = [];

    if (!title) {
      this.showError('Please enter a quiz title');
      return null;
    }

    document.querySelectorAll('.question-editor').forEach((editor, idx) => {
      const questionText = editor.querySelector('.question-text').value.trim();
      const options = Array.from(editor.querySelectorAll('.option-text')).map(i => i.value.trim());
      const correctRadio = editor.querySelector('input[type="radio"]:checked');
      const timeLimit = parseInt(editor.querySelector('.time-limit').value) || 10;

      if (!questionText) {
        this.showError(`Question ${idx + 1} is missing text`);
        return;
      }

      if (options.some(o => !o)) {
        this.showError(`Question ${idx + 1} is missing options`);
        return;
      }

      if (!correctRadio) {
        this.showError(`Question ${idx + 1} doesn't have a correct answer selected`);
        return;
      }

      questions.push({
        questionText,
        options,
        correctAnswer: parseInt(correctRadio.value),
        timeLimit: Math.min(30, Math.max(5, timeLimit))
      });
    });

    if (questions.length === 0) {
      this.showError('Quiz must have at least one question');
      return null;
    }

    return { title, description, questions };
  }

  async saveQuiz() {
    if (!this.user || this.user.isGuest) {
      this.showError('Please login to save quizzes');
      return;
    }

    const quizData = this.collectQuizData();
    if (!quizData) return;

    try {
      const quiz = await api.createQuiz(quizData);
      this.currentQuiz = quiz;
      this.showSuccess('Quiz saved!');
      this.showScreen('lobby');
      this.createGame(quiz);
    } catch (error) {
      this.showError(error.message);
    }
  }

  addPlayer(playerId, username) {
    const list = document.getElementById('players-list');
    const li = document.createElement('li');
    li.dataset.playerId = playerId;
    li.innerHTML = `
      <div class="avatar-small">${username.charAt(0).toUpperCase()}</div>
      <span class="player-name">${username}</span>
    `;
    list.appendChild(li);

    if (this.isHost && list.children.length > 0) {
      document.getElementById('start-game-btn').disabled = false;
      document.getElementById('start-game-btn').textContent = 'Start Game';
    }
  }

  removePlayer(playerId) {
    const player = document.querySelector(`[data-player-id="${playerId}"]`);
    if (player) player.remove();

    if (this.isHost && document.getElementById('players-list').children.length === 0) {
      document.getElementById('start-game-btn').disabled = true;
      document.getElementById('start-game-btn').textContent = 'Waiting for players...';
    }
  }

  updatePlayerCount() {
    const count = document.getElementById('players-list').children.length;
    document.getElementById('player-count').textContent = `${count} player${count !== 1 ? 's' : ''}`;
  }

  startGame() {
    this.socket.emit('host:start', { pin: this.currentPin }, (response) => {
      if (!response.success) {
        this.showError(response.message);
      }
    });
  }

  endGame() {
    this.socket.emit('host:end', { pin: this.currentPin }, () => {
      this.showScreen('landing');
      this.resetGameState();
    });
  }

  showQuestion(data) {
    this.showScreen('question-screen');
    this.hasAnswered = false;
    
    document.getElementById('question-number').textContent = data.questionIndex + 1;
    document.getElementById('total-questions').textContent = data.totalQuestions;
    document.getElementById('question-text').textContent = data.question;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    const colors = ['#5c2d91', '#00b894', '#f39c12', '#e74c3c'];
    data.options.forEach((option, index) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.style.borderLeftColor = colors[index];
      btn.textContent = option;
      btn.dataset.index = index;
      btn.addEventListener('click', () => this.selectAnswer(index));
      optionsContainer.appendChild(btn);
    });

    this.timeRemaining = data.timeLimit;
    this.questionStartTime = Date.now();
    this.startTimer(data.timeLimit);
  }

  startTimer(seconds) {
    const timerEl = document.getElementById('timer');
    timerEl.textContent = seconds;
    timerEl.className = 'timer';

    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.timeRemaining -= 0.1;
      
      if (this.timeRemaining <= 0) {
        clearInterval(this.timer);
        this.timeRemaining = 0;
        timerEl.textContent = '0';
        timerEl.className = 'timer danger';
      } else {
        timerEl.textContent = Math.ceil(this.timeRemaining);
        
        if (this.timeRemaining <= 3) {
          timerEl.className = 'timer danger';
        } else if (this.timeRemaining <= 5) {
          timerEl.className = 'timer warning';
        }
      }
    }, 100);
  }

  selectAnswer(index) {
    if (this.hasAnswered) return;
    this.hasAnswered = true;

    if (this.timer) clearInterval(this.timer);

    document.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.disabled = true;
      if (i === index) {
        btn.classList.add('selected');
      }
    });

    this.socket.emit('player:answer', {
      pin: this.currentPin,
      playerId: this.playerId,
      answer: index,
      timeRemaining: Math.max(0, this.timeRemaining)
    }, () => {});
  }

  handleAnswerResponse(data) {
    const feedbackEl = document.getElementById('answer-feedback');
    
    if (data.isCorrect) {
      feedbackEl.innerHTML = `Correct! +${data.score} points`;
      feedbackEl.style.color = '#00b894';
    } else {
      feedbackEl.innerHTML = 'Wrong answer';
      feedbackEl.style.color = '#e74c3c';
    }
  }

  showResults(data) {
    this.showScreen('results-screen');

    document.getElementById('correctness-display').textContent = data.correctAnswer !== undefined ? '' : '';
    document.getElementById('answer-feedback').textContent = '';

    const leaderboard = document.getElementById('results-leaderboard');
    leaderboard.innerHTML = '';

    data.leaderboard.forEach((player, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="rank ${idx === 0 ? 'first' : ''}">${player.rank}</span>
        <div class="player-info">
          <div class="name">${player.username}</div>
          <div class="score">${player.score.toLocaleString()} pts</div>
        </div>
      `;
      leaderboard.appendChild(li);
    });

    if (!this.isHost) {
      setTimeout(() => {
        this.socket.emit('player:next', { pin: this.currentPin, playerId: this.playerId });
      }, 5000);
    }
  }

  showFinalResults(data) {
    this.showScreen('final-screen');

    const positions = ['first-place', 'second-place', 'third-place'];
    const placeholders = [
      { name: 'No one', score: 0 },
      { name: 'No one', score: 0 },
      { name: 'No one', score: 0 }
    ];

    const podiumData = data.podium?.length > 0 ? data.podium : placeholders;

    positions.forEach((posId, idx) => {
      const el = document.getElementById(posId);
      const dataItem = podiumData[idx] || placeholders[idx];
      
      el.querySelector('.player-name').textContent = dataItem.username;
      el.querySelector('.player-score').textContent = `${(dataItem.score || 0).toLocaleString()} pts`;
    });

    const fullLeaderboard = document.getElementById('full-leaderboard');
    fullLeaderboard.innerHTML = '';

    data.leaderboard?.forEach((player, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="rank">${idx + 1}</span>
        <span class="name">${player.username}</span>
        <span class="score">${player.score.toLocaleString()}</span>
      `;
      fullLeaderboard.appendChild(li);
    });

    this.showSuccess('Game Over!');
  }

  playAgain() {
    if (this.isHost) {
      this.showScreen('landing');
    } else {
      this.showScreen('landing');
    }
    this.resetGameState();
  }

  resetGameState() {
    this.currentPin = null;
    this.playerId = null;
    this.currentQuiz = null;
    this.isHost = false;
    this.hasAnswered = false;
    this.selectedQuizId = null;
    this.currentQuiz = null;

    if (this.timer) clearInterval(this.timer);

    document.getElementById('players-list').innerHTML = '';
    document.getElementById('questions-container').innerHTML = '';
    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-description').value = '';
    document.getElementById('game-pin').value = '';
    document.getElementById('player-name').value = '';
  }
}

const game = new QuizGame();
