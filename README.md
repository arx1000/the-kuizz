# QuizBlitz - Real-time Kahoot-Style Quiz Game

A complete real-time quiz application with player-host interaction, live scoring, and leaderboards.

## Features

- **Multiple Choice Questions**: Create quizzes with up to 4 options per question
- **Real-time Gameplay**: WebSocket-based instant updates for all players
- **Timed Questions**: Configurable timer (5-30 seconds) per question
- **Speed-based Scoring**: Faster answers earn more points
- **Live Leaderboards**: See rankings after each question
- **Final Podium**: 1st, 2nd, 3rd place celebration
- **User Accounts**: Register/Login or play as guest
- **Quiz Management**: Create, edit, and delete quizzes
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB with Mongoose
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Real-time**: Socket.io for WebSocket communication

## Quick Start (Docker)

```bash
# Clone or navigate to the project directory
cd quiz-app

# Start all services
docker-compose up -d

# Access the app at http://localhost:3000
```

## Manual Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (see .env.example)
cp .env.example .env

# Start the server
npm start
# Or for development with auto-reload
npm run dev
```

### Frontend Setup

For development, you can simply open `frontend/index.html` in a browser, but Socket.io needs a server.

To serve with a simple HTTP server:

```bash
# Using Python
cd frontend
python -m http.server 3000

# Or using Node
npx serve frontend -p 3000
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create new account |
| POST | /api/auth/login | Login to account |
| POST | /api/auth/guest | Create guest session |
| GET | /api/auth/me | Get current user |

### Quizzes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/quiz | List public quizzes |
| GET | /api/quiz/my | List user's quizzes |
| GET | /api/quiz/:id | Get quiz by ID |
| POST | /api/quiz | Create new quiz |
| PUT | /api/quiz/:id | Update quiz |
| DELETE | /api/quiz/:id | Delete quiz |

## WebSocket Events

### Host Events

| Event | Payload | Description |
|-------|---------|-------------|
| host:create | {quiz, userId} | Create new game |
| host:start | {pin} | Start the game |
| host:next | {pin} | Next question |
| host:end | {pin} | End game |
| host:kick | {pin, playerId} | Remove player |

### Player Events

| Event | Payload | Description |
|-------|---------|-------------|
| player:join | {pin, username} | Join game |
| player:answer | {pin, playerId, answer, timeRemaining} | Submit answer |

### Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| game:question | {questionIndex, question, options, timeLimit} | New question |
| game:results | {correctAnswer, leaderboard} | Question results |
| game:finished | {podium, leaderboard} | Game over |
| game:playerJoined | {playerId, username} | Player joined |
| game:playerLeft | {playerId} | Player left |

## Deployment Options

### Render.com (Free Tier)

1. Create a new Web Service
2. Connect your GitHub repository
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`
5. Add environment variables from `.env`
6. Deploy MongoDB on Atlas or use Render's free MongoDB

### Railway.app (Free Tier)

1. Create new project
2. Add MongoDB plugin
3. Add your GitHub repo
4. Set root directory: `backend`
5. Add environment variables
6. Deploy

### Docker (Recommended)

```bash
docker-compose up -d
```

This starts:
- MongoDB on port 27017
- Backend on port 3001
- Frontend on port 3000

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| MONGODB_URI | mongodb://localhost:27017/quizgame | MongoDB connection string |
| FRONTEND_URL | http://localhost:3000 | Frontend URL for CORS |
| JWT_SECRET | (required) | Secret for JWT tokens |

## Project Structure

```
quiz-app/
├── backend/
│   ├── models/
│   │   ├── User.js       # User model
│   │   └── Quiz.js       # Quiz model
│   ├── routes/
│   │   ├── auth.js       # Auth endpoints
│   │   └── quiz.js       # Quiz endpoints
│   ├── socket/
│   │   └── game.js       # Socket.io handlers
│   ├── server.js         # Main server
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── index.html        # Main HTML
│   ├── css/
│   │   └── styles.css    # All styles
│   ├── js/
│   │   ├── config.js     # API config
│   │   ├── api.js        # API wrapper
│   │   └── app.js         # Main app logic
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

## How to Play

### As a Host

1. Go to "Host Game" tab
2. Login or play as guest
3. Select a quiz or create a new one
4. Share the 6-digit PIN with players
5. Click "Start Game" when ready
6. Click "Next" after each question
7. Game ends automatically after last question

### As a Player

1. Go to "Join Game" tab
2. Enter the 6-digit PIN
3. Enter your name
4. Click "Join Game"
5. Wait for the host to start
6. Answer questions before time runs out
7. Faster correct answers = more points!

## License

MIT
