<template>
  <div class="game-lobby">
    <div v-if="!gameId" class="waiting">
      <h2>Game Lobby</h2>
      <div v-if="!isWaiting">
        <button @click="joinWaitingList" class="join-button">Find Opponent</button>
      </div>
      <div v-else class="waiting-animation">
        <div class="spinner"></div>
        <p>Waiting for opponent...</p>
        <button @click="leaveWaitingList" class="cancel-button">Cancel</button>
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
        @turn-changed="updateTurn"
        @game-over="handleGameOver"
      />
      <button @click="abandonGame" class="abandon-button">Abandon Game</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, inject } from 'vue';
import { useRouter } from 'vue-router';
import { io } from 'socket.io-client';
import ChessBoard from '../components/ChessBoard.vue';

export default {
  name: 'GameLobby',
  components: {
    ChessBoard
  },
  setup() {
    const router = useRouter();
    const auth = inject('auth');
    
    const isWaiting = ref(false);
    const gameId = ref(null);
    const whitePlayer = ref(null);
    const blackPlayer = ref(null);
    const currentTurn = ref('white');
    const userColor = ref(null);
    const socket = ref(null);
    const initialFen = ref(null);
    let heartbeatInterval = null;

    const connectSocket = () => {
      socket.value = io(import.meta.env.VITE_API_URL, {
        withCredentials: true,
        transports: ['polling', 'websocket'],  // Try polling first, then upgrade to websocket
        path: '/socket.io/',
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socket.value.on('connect', () => {
        console.log('Connected to server');
      });
      
      // Add error handling
      socket.value.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      socket.value.on('error', (error) => {
        console.error('Socket error:', error);
        if (error.message === 'Not authenticated') {
          router.push('/login');
        }
      });
      
      socket.value.on('game_started', (data) => {
        gameId.value = data.game_id;
        whitePlayer.value = data.white;
        blackPlayer.value = data.black;
        userColor.value = data.white.id === auth.currentUser.value.user_id ? 'white' : 'black';
        initialFen.value = data.fen;
        isWaiting.value = false;
        startHeartbeat();
      });
      
      socket.value.on('waiting_for_opponent', () => {
        isWaiting.value = true;
      });
      
      socket.value.on('error', (error) => {
        console.error('Socket error:', error);
      });
    };

    const joinWaitingList = () => {
      if (socket.value) {
        socket.value.emit('join_waiting_list');
      }
    };

    const leaveWaitingList = () => {
      // For now, just set isWaiting to false
      // You might want to implement a proper leave endpoint
      isWaiting.value = false;
    };

    const startHeartbeat = () => {
      heartbeatInterval = setInterval(() => {
        if (socket.value && gameId.value) {
          socket.value.emit('heartbeat', { game_id: gameId.value });
        }
      }, 5000);
    };

    const abandonGame = () => {
      if (socket.value && gameId.value) {
        socket.value.emit('abandon_game', { game_id: gameId.value });
      }
    };

    const updateTurn = (turn) => {
      currentTurn.value = turn;
    };

    const handleGameOver = (data) => {
      let message = 'Game Over! ';
      if (data.winner === auth.currentUser.value.user_id) {
        message += 'You won!';
      } else if (data.winner) {
        message += 'You lost.';
      } else {
        message += 'It\'s a draw!';
      }
      message += ` (${data.reason})`;
      
      alert(message);
      router.push('/');
    };

    onMounted(() => {
      connectSocket();
    });

    onBeforeUnmount(() => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (socket.value) {
        socket.value.disconnect();
      }
    });

    return {
      isWaiting,
      gameId,
      whitePlayer,
      blackPlayer,
      currentTurn,
      userColor,
      socket,
      initialFen,
      joinWaitingList,
      leaveWaitingList,
      abandonGame,
      updateTurn,
      handleGameOver
    };
  }
};
</script>

<style scoped>
.game-lobby {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.waiting {
  text-align: center;
  margin-top: 50px;
}

.waiting h2 {
  margin-bottom: 30px;
}

.join-button {
  padding: 15px 30px;
  font-size: 18px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.join-button:hover {
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

.cancel-button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.cancel-button:hover {
  background-color: #d32f2f;
}

.abandon-button {
  display: block;
  margin: 20px auto;
  padding: 10px 20px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.abandon-button:hover {
  background-color: #d32f2f;
}

.game {
  text-align: center;
}
</style>