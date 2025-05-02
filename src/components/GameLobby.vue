<template>
  <div class="game-lobby">
    <div v-if="!isRegistered" class="registration">
      <h2>Welcome to Azure Chess</h2>
      <input 
        v-model="username" 
        type="text" 
        placeholder="Enter your username"
        @keyup.enter="register"
      />
      <button @click="register" :disabled="!username">Register</button>
    </div>
    
    <div v-else-if="!gameId" class="waiting">
      <h2>Welcome, {{ username }}!</h2>
      <div v-if="!isWaiting">
        <button @click="joinGame" class="join-button">Find Opponent</button>
      </div>
      <div v-else class="waiting-animation">
        <div class="spinner"></div>
        <p>Waiting for opponent...</p>
      </div>
    </div>
    
    <div v-else class="game">
      <ChessBoard
        :game-id="gameId"
        :white-player="whitePlayer"
        :black-player="blackPlayer"
        :current-turn="currentTurn"
        :user-color="userColor"
        :socket="socket"
        :initial-fen="initialFen"
        :show-evaluation="true"
        @turn-changed="updateTurn"
        @game-over="handleGameOver"
      />
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';
import ChessBoard from './ChessBoard.vue';

export default {
  name: 'GameLobby',
  components: {
    ChessBoard
  },
  data() {
    return {
      username: '',
      userId: null,
      isRegistered: false,
      isWaiting: false,
      gameId: null,
      whitePlayer: null,
      blackPlayer: null,
      currentTurn: 'white',
      userColor: null,
      socket: null,
      initialFen: null
    };
  },
  methods: {
    async register() {
      if (!this.username) return;
      
      try {
        const response = await fetch(`${process.env.VUE_APP_API_URL}/api/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: this.username })
        });
        
        const data = await response.json();
        this.userId = data.user_id;
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('username', data.username);
        this.isRegistered = true;
        this.connectSocket();
      } catch (error) {
        console.error('Registration error:', error);
      }
    },
    
    connectSocket() {
      this.socket = io(process.env.VUE_APP_API_URL);
      
      this.socket.on('connect', () => {
        console.log('Connected to server');
      });
      
      this.socket.on('game_started', (data) => {
        this.gameId = data.game_id;
        this.whitePlayer = data.white;
        this.blackPlayer = data.black;
        this.userColor = data.white.id === this.userId ? 'white' : 'black';
        this.initialFen = data.fen;
        this.isWaiting = false;
      });
      
      this.socket.on('waiting_for_opponent', () => {
        this.isWaiting = true;
      });
      
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    },
    
    joinGame() {
      this.socket.emit('join_game', {
        user_id: this.userId,
        username: this.username
      });
    },
    
    updateTurn(turn) {
      this.currentTurn = turn;
    },
    
    handleGameOver(data) {
      // Handle game over logic
      console.log('Game over:', data);
    }
  },
  mounted() {
    // Check if user is already registered
    const storedUserId = localStorage.getItem('user_id');
    const storedUsername = localStorage.getItem('username');
    
    if (storedUserId && storedUsername) {
      this.userId = storedUserId;
      this.username = storedUsername;
      this.isRegistered = true;
      this.connectSocket();
    }
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
};
</script>

<style scoped>
.game-lobby {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.registration, .waiting {
  text-align: center;
  margin-top: 50px;
}

.registration input {
  padding: 10px;
  margin: 10px;
  width: 200px;
  font-size: 16px;
}

.registration button, .join-button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin: 10px;
}

.registration button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.registration button:hover:not(:disabled), .join-button:hover {
  background-color: #45a049;
}

.waiting-animation {
  margin-top: 30px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
