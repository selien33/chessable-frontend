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
import { Chessboard } from 'cm-chessboard';

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
      this.chess = new Chess();
      
      if (this.initialFen) {
        this.chess.load(this.initialFen);
      }
      
      this.chessboard = new Chessboard(this.$refs.boardElement, {
        position: this.chess.fen(),
        orientation: this.userColor || 'white',
        style: {
          borderType: 'thin',
          aspectRatio: 1
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
      
      const move = {
        from: event.squareFrom,
        to: event.squareTo,
        promotion: 'q'
      };
      
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