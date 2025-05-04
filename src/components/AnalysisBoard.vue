<template>
  <div class="chess-board-container">
    <div class="player-info">
      <div class="player" :class="{ active: currentTurn === 'black' }">
        <span class="player-name">{{ blackPlayer?.username || 'Black' }}</span>
        <span class="player-color">Black</span>
      </div>
    </div>
    
    <div ref="boardElement" class="chess-board"></div>
    
    <div class="player-info">
      <div class="player" :class="{ active: currentTurn === 'white' }">
        <span class="player-name">{{ whitePlayer?.username || 'White' }}</span>
        <span class="player-color">White</span>
      </div>
    </div>
    
    <button v-if="showEvaluation" @click="requestEvaluation" class="eval-button">
      Evaluate Position
    </button>
  </div>
</template>

<script>
import { Chess } from 'chess.js';
import { Chessboard, COLOR, BORDER_TYPE } from 'cm-chessboard';
import 'cm-chessboard/assets/chessboard.css';
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

export default {
  name: 'AnalysisBoard',
  props: {
    whitePlayer: Object,
    blackPlayer: Object,
    currentTurn: String,
    initialFen: String,
    showEvaluation: {
      type: Boolean,
      default: false
    }
  },
  emits: ['evaluation-request'],
  setup(props, { emit }) {
    const boardElement = ref(null);
    const chess = ref(new Chess());
    const board = ref(null);
    const currentFen = ref(props.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    
    const initializeBoard = () => {
      console.log('Initializing analysis board with FEN:', currentFen.value);
      
      if (currentFen.value) {
        try {
          chess.value.load(currentFen.value);
          console.log('FEN loaded successfully');
        } catch (error) {
          console.error('Error loading FEN:', error);
          chess.value.reset();
        }
      }
      
      // Initialize cm-chessboard for analysis
      board.value = new Chessboard(boardElement.value, {
        position: chess.value.fen(),
        assetsUrl: "/assets/",
        style: {
          borderType: BORDER_TYPE.none, 
          pieces: {file: "pieces/staunty.svg"}, 
          animationDuration: 300
        },
        orientation: COLOR.white
      });
      
      // Analysis board is always read-only
      board.value.disableMoveInput();
    };
    
    const requestEvaluation = () => {
      emit('evaluation-request');
    };
    
    // Watch for FEN changes
    watch(() => props.initialFen, (newFen) => {
      if (newFen && board.value) {
        chess.value.load(newFen);
        board.value.setPosition(newFen, true);
      }
    });
    
    onMounted(() => {
      initializeBoard();
    });
    
    onBeforeUnmount(() => {
      if (board.value) {
        board.value.destroy();
      }
    });
    
    return {
      boardElement,
      requestEvaluation
    };
  }
};
</script>

<style scoped>
.chess-board-container {
  max-width: 600px;
  margin: 0 auto;
}

.chess-board {
  width: 100%;
  max-width: 600px;
  margin: 20px 0;
}

.player-info {
  padding: 10px;
  text-align: center;
}

.player {
  display: inline-block;
  padding: 10px 20px;
  border: 2px solid #ccc;
  border-radius: 5px;
  background-color: #f5f5f5;
}

.player.active {
  border-color: #4CAF50;
  background-color: #e8f5e9;
}

.player-name {
  font-weight: bold;
  margin-right: 10px;
}

.eval-button {
  display: block;
  margin: 20px auto;
  padding: 10px 20px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.eval-button:hover {
  background-color: #1976D2;
}
</style>
