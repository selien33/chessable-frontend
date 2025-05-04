<template>
  <div class="game-analysis">
    <h1>Game Analysis</h1>
    
    <div v-if="loading" class="loading">Loading game...</div>
    
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else class="analysis-container">
      <div class="game-info">
        <h2>{{ game.white_username }} vs {{ game.black_username }}</h2>
        <p>Result: {{ getGameResult() }}</p>
        <p>Date: {{ formatDate(game.completed_at) }}</p>
      </div>
      
      <div class="board-container">
        <ChessBoard
          :initial-fen="currentFen"
          :read-only="true"
          :show-evaluation="true"
          user-color="white"
          @evaluation-request="requestEvaluation"
        />
      </div>
      
      <div class="controls">
        <button @click="goToStart" :disabled="currentMoveIndex === 0">⏮ Start</button>
        <button @click="previousMove" :disabled="currentMoveIndex === 0">◀ Previous</button>
        <button @click="nextMove" :disabled="currentMoveIndex === moves.length">Next ▶</button>
        <button @click="goToEnd" :disabled="currentMoveIndex === moves.length">End ⏭</button>
      </div>
      
      <div class="move-list">
        <h3>Moves</h3>
        <div class="moves">
          <span 
            v-for="(move, index) in moves" 
            :key="index"
            :class="{ 'current-move': index === currentMoveIndex - 1 }"
            @click="goToMove(index + 1)"
          >
            {{ Math.floor(index / 2) + 1 }}. {{ index % 2 === 0 ? '' : '...' }}{{ move }}
          </span>
        </div>
      </div>
      
      <div v-if="evaluation" class="evaluation">
        <h3>Position Evaluation</h3>
        <p>Score: {{ evaluation.evaluation }}</p>
        <p v-if="evaluation.best_move">Best Move: {{ evaluation.best_move }}</p>
        <p v-if="evaluation.mate_in">Mate in {{ evaluation.mate_in }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, inject, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Chess } from 'chess.js';
import ChessBoard from '../components/ChessBoard.vue';

export default {
  name: 'GameAnalysis',
  components: {
    ChessBoard
  },
  setup() {
    const route = useRoute();
    const auth = inject('auth');
    const game = ref(null);
    const loading = ref(true);
    const error = ref('');
    const chess = ref(new Chess());
    const moves = ref([]);
    const currentMoveIndex = ref(0);
    const currentFen = ref('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const evaluation = ref(null);

    const fetchGame = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/games/${route.params.gameId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch game');
        }

        const data = await response.json();
        game.value = data;
        
        // Parse moves
        if (data.moves) {
          moves.value = data.moves.split(',');
        }
        
        // Initialize board
        chess.value.reset();
        currentFen.value = chess.value.fen();
        
      } catch (err) {
        error.value = 'Failed to load game';
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const getGameResult = () => {
      if (!game.value) return '';
      
      if (!game.value.winner) {
        return `Draw (${game.value.end_reason})`;
      }
      
      const winnerId = game.value.winner;
      const winnerName = winnerId === game.value.white_player ? 
        game.value.white_username : 
        game.value.black_username;
      
      return `${winnerName} won (${game.value.end_reason})`;
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const goToStart = () => {
      chess.value.reset();
      currentMoveIndex.value = 0;
      currentFen.value = chess.value.fen();
      evaluation.value = null;
    };

    const previousMove = () => {
      if (currentMoveIndex.value > 0) {
        // Rebuild the position from the start
        chess.value.reset();
        for (let i = 0; i < currentMoveIndex.value - 1; i++) {
          chess.value.move(moves.value[i]);
        }
        currentMoveIndex.value--;
        currentFen.value = chess.value.fen();
        evaluation.value = null;
      }
    };

    const nextMove = () => {
      if (currentMoveIndex.value < moves.value.length) {
        chess.value.move(moves.value[currentMoveIndex.value]);
        currentMoveIndex.value++;
        currentFen.value = chess.value.fen();
        evaluation.value = null;
      }
    };

    const goToEnd = () => {
      while (currentMoveIndex.value < moves.value.length) {
        chess.value.move(moves.value[currentMoveIndex.value]);
        currentMoveIndex.value++;
      }
      currentFen.value = chess.value.fen();
      evaluation.value = null;
    };

    const goToMove = (index) => {
      chess.value.reset();
      currentMoveIndex.value = 0;
      
      for (let i = 0; i < index; i++) {
        chess.value.move(moves.value[i]);
        currentMoveIndex.value++;
      }
      
      currentFen.value = chess.value.fen();
      evaluation.value = null;
    };

    const requestEvaluation = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            fen: currentFen.value,
            depth: 15
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get evaluation');
        }

        evaluation.value = await response.json();
      } catch (err) {
        console.error('Evaluation error:', err);
      }
    };

    onMounted(() => {
      fetchGame();
    });

    return {
      game,
      loading,
      error,
      currentFen,
      moves,
      currentMoveIndex,
      evaluation,
      getGameResult,
      formatDate,
      goToStart,
      previousMove,
      nextMove,
      goToEnd,
      goToMove,
      requestEvaluation
    };
  }
};
</script>

<style scoped>
.game-analysis {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}

.loading, .error {
  text-align: center;
  padding: 20px;
  font-size: 18px;
}

.error {
  color: #f44336;
}

.analysis-container {
  display: grid;
  gap: 20px;
}

.game-info {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.board-container {
  display: flex;
  justify-content: center;
}

.controls {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.controls button {
  padding: 10px 20px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.controls button:hover:not(:disabled) {
  background-color: #1976D2;
}

.controls button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.move-list {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.moves {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.moves span {
  cursor: pointer;
  padding: 5px;
  border-radius: 3px;
}

.moves span:hover {
  background-color: #f0f0f0;
}

.current-move {
  background-color: #2196F3;
  color: white;
}

.evaluation {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>