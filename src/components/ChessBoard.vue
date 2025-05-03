<template>
  <div class="chess-board-container">
    <div class="player-info">
      <div class="player" :class="{ active: currentTurn === 'black' }">
        <span class="player-name">{{ blackPlayer?.username || 'Black' }}</span>
        <span class="player-color">Black</span>
      </div>
    </div>
    
    <chessboard 
      :fen="currentFen"
      :orientation="userColor"
      @onMove="handleMove"
      :key="boardKey"
      class="chess-board"
    />
    
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
import { chessboard } from 'vue-chessboard';
import 'vue-chessboard/dist/vue-chessboard.css';

export default {
  name: 'ChessBoard',
  components: {
    chessboard
  },
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
      chess: null,
      gameStatus: null,
      currentFen: null,
      boardKey: 0 // Used to force re-render of the board if needed
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
      
      this.currentFen = this.chess.fen();
      console.log('Current FEN after initialization:', this.currentFen);
    },
    
    handleMove(move) {
      if (this.currentTurn !== this.userColor) {
        return;
      }

      if (this.readOnly) {
        return;
      }

      // move format from vue-chessboard is {from: 'e2', to: 'e4', promotion: 'q'}
      const chessMove = {
        from: move.from,
        to: move.to,
        promotion: move.promotion || undefined
      };
      
      // Check if we need promotion
      const piece = this.chess.get(move.from);
      if (piece && piece.type === 'p') {
        const fromRank = move.from[1];
        const toRank = move.to[1];
        if ((piece.color === 'w' && fromRank === '7' && toRank === '8') ||
            (piece.color === 'b' && fromRank === '2' && toRank === '1')) {
          chessMove.promotion = 'q'; // Default to queen promotion
        }
      }
      
      try {
        const result = this.chess.move(chessMove);
        if (result) {
          this.currentFen = this.chess.fen();
          this.socket.emit('make_move', {
            game_id: this.gameId,
            move: result.from + result.to + (result.promotion || '')
          });
        } else {
          // Invalid move, reset to current position
          this.boardKey++;
        }
      } catch (e) {
        console.error('Invalid move:', e);
        // Reset board to current position
        this.boardKey++;
      }
    },
    
    setupSocketListeners() {
      this.socket.on('move_made', (data) => {
        console.log('Move made, new FEN:', data.fen);
        this.chess.load(data.fen);
        this.currentFen = data.fen;
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
      if (newFen && this.chess) {
        this.chess.load(newFen);
        this.currentFen = newFen;
      }
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