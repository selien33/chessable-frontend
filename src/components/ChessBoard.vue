<template>
  <div class="chess-board-container">
    <div class="player-info">
      <div class="player" :class="{ active: currentTurn === 'black' }">
        <span class="player-name">{{ blackPlayer?.username || 'Black' }}</span>
        <span class="player-color">Black</span>
      </div>
    </div>
    
    <div class="chess-board" ref="boardElement"></div>
    
    <div class="player-info">
      <div class="player" :class="{ active: currentTurn === 'white' }">
        <span class="player-name">{{ whitePlayer?.username || 'White' }}</span>
        <span class="player-color">White</span>
      </div>
    </div>
    
    <div v-if="gameStatus" class="game-status">
      {{ gameStatus }}
    </div>
    
    <button v-if="showEvaluation" @click="requestEvaluation" class="eval-button">
      Evaluate Position
    </button>
  </div>
</template>

<script>
import { Chess } from 'chess.js';
// Import the local Chessboard.js file
import { Chessboard, FEN } from '../assets/Chessboard.js';

export default {
  name: 'ChessBoard',
  props: {
    gameId: String,
    whitePlayer: Object,
    blackPlayer: Object,
    currentTurn: String,
    userColor: String,
    socket: Object,
    initialFen: String,
    showEvaluation: {
      type: Boolean,
      default: false
    },
    readOnly: {
      type: Boolean,
      default: false
    }
  },
  emits: ['turn-changed', 'game-over', 'evaluation-request'],
  data() {
    return {
      chessboard: null,
      chess: null,
      gameStatus: null
    };
  },
  mounted() {
    this.initializeBoard();
    if (!this.readOnly) {
      this.setupSocketListeners();
    }
  },
  methods: {
    initializeBoard() {
      console.log('Initializing board with FEN:', this.initialFen);
      
      this.chess = new Chess();
      
      if (this.initialFen) {
        try {
          this.chess.load(this.initialFen);
          console.log('FEN loaded successfully');
        } catch (error) {
          console.error('Error loading FEN:', error);
          this.chess.reset();
        }
      } else {
        this.chess.reset();
      }
      
      const currentFen = this.chess.fen();
      console.log('Current FEN after initialization:', currentFen);
      
      // Use the local assets path
      this.chessboard = new Chessboard(this.$refs.boardElement, {
        position: currentFen,
        orientation: this.userColor || 'white',
        assetsUrl: "/src/assets/",  // Point to your local assets folder
        style: {
          cssClass: "default",
          pieces: {
            file: "staunty"  // This should match your pieces folder structure
          }
        }
      });
      
      if (!this.readOnly) {
        this.chessboard.enableMoveInput((event) => {
          return this.handleMove(event);
        }, this.userColor);
      }
    },
    
    handleMove(event) {
      if (this.currentTurn !== this.userColor) {
        return false;
      }

      if (!event.squareFrom || !event.squareTo) {
        return false;
      }
      
      const move = {
        from: event.squareFrom,
        to: event.squareTo
      };
      
      // Only add promotion if it's a pawn moving to the last rank
      const piece = this.chess.get(event.squareFrom);
      if (piece && piece.type === 'p') {
        if ((piece.color === 'w' && event.squareTo[1] === '8') ||
            (piece.color === 'b' && event.squareTo[1] === '1')) {
          move.promotion = 'q';
        }
      }
      
      try {
        const result = this.chess.move(move);
        if (result) {
          this.socket.emit('make_move', {
            game_id: this.gameId,
            move: result.from + result.to + (result.promotion || '')
          });
          return true;
        }
      } catch (e) {
        console.error('Invalid move:', e);
      }
      
      return false;
    },
    
    setupSocketListeners() {
      this.socket.on('move_made', (data) => {
        console.log('Move made, new FEN:', data.fen);
        this.chess.load(data.fen);
        this.chessboard.setPosition(data.fen);
        this.$emit('turn-changed', data.turn);
      });
      
      this.socket.on('game_over', (data) => {
        if (data.reason === 'checkmate') {
          this.gameStatus = `Checkmate! ${data.winner === this.whitePlayer.id ? 'White' : 'Black'} wins!`;
        } else if (data.reason === 'stalemate') {
          this.gameStatus = 'Stalemate! The game is a draw.';
        } else if (data.reason === 'abandon') {
          this.gameStatus = `Game abandoned. ${data.winner === this.whitePlayer.id ? 'White' : 'Black'} wins!`;
        } else if (data.reason === 'disconnect') {
          this.gameStatus = `Opponent disconnected. ${data.winner === this.whitePlayer.id ? 'White' : 'Black'} wins!`;
        }
        this.$emit('game-over', data);
      });
    },
    
    requestEvaluation() {
      this.$emit('evaluation-request');
    }
  },
  watch: {
    initialFen(newFen) {
      console.log('FEN changed to:', newFen);
      if (newFen && this.chess && this.chessboard) {
        this.chess.load(newFen);
        this.chessboard.setPosition(newFen);
      }
    }
  },
  beforeUnmount() {
    if (this.chessboard) {
      this.chessboard.destroy();
    }
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
  margin: 20px 0;
  min-height: 400px;
  position: relative;
}

/* Ensure the chessboard fills its container */
:deep(.cm-chessboard) {
  width: 100% !important;
  height: 100% !important;
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

.game-status {
  text-align: center;
  font-size: 1.2em;
  font-weight: bold;
  margin: 20px 0;
  padding: 10px;
  background-color: #fff3e0;
  border-radius: 5px;
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