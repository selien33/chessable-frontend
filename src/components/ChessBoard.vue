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
import chessboardSprite from '@/assets/chessboard/chessboard-sprite.svg';

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
    console.log('ChessBoard mounted with props:', {
      gameId: this.gameId,
      whitePlayer: this.whitePlayer,
      blackPlayer: this.blackPlayer,
      currentTurn: this.currentTurn,
      userColor: this.userColor,
      initialFen: this.initialFen,
      readOnly: this.readOnly
    });
    
    this.initializeBoard();
    
    if (!this.readOnly) {
      this.setupSocketListeners();
    }
  },
  methods: {
    initializeBoard() {
      console.log('=== INITIALIZING BOARD ===');
      console.log('User color:', this.userColor);
      console.log('Initial FEN:', this.initialFen);
      console.log('Board element exists:', !!this.$refs.boardElement);
      console.log('Chessboard sprite path:', chessboardSprite);
      
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
        console.log('No initial FEN provided, using default starting position');
        this.chess.reset();
      }
      
      const currentFen = this.chess.fen();
      console.log('Current FEN after initialization:', currentFen);
      console.log('Board state:', this.chess.ascii());
      
      try {
        // Make sure the board element is ready
        if (!this.$refs.boardElement) {
          console.error('Board element not found!');
          return;
        }
        
        const boardConfig = {
          position: currentFen,
          orientation: this.userColor || 'white',
          style: {
            cssClass: 'default',
            showCoordinates: true,
            borderType: 'thin',
            aspectRatio: 1
          },
          sprite: {
            url: chessboardSprite // Use local asset
          }
        };
        
        console.log('Creating chessboard with config:', boardConfig);
        
        this.chessboard = new Chessboard(this.$refs.boardElement, boardConfig);
        
        console.log('Chessboard created successfully');
        console.log('Board dimensions:', {
          width: this.$refs.boardElement.offsetWidth,
          height: this.$refs.boardElement.offsetHeight
        });
        
        if (!this.readOnly) {
          console.log('Enabling move input for color:', this.userColor);
          this.chessboard.enableMoveInput((event) => {
            console.log('Move input event:', event);
            return this.handleMove(event);
          }, this.userColor);
        }
        
      } catch (error) {
        console.error('Error creating chessboard:', error);
        console.error('Stack trace:', error.stack);
      }
    },
    
    handleMove(event) {
      console.log('=== HANDLE MOVE ===');
      console.log('Move event:', event);
      console.log('Current turn:', this.currentTurn);
      console.log('User color:', this.userColor);
      
      if (this.currentTurn !== this.userColor) {
        console.log('Not user\'s turn, rejecting move');
        return false;
      }
      
      if (!event.squareFrom || !event.squareTo) {
        console.log('Invalid squares:', { from: event.squareFrom, to: event.squareTo });
        return false;
      }
      
      const move = {
        from: event.squareFrom,
        to: event.squareTo
      };
      
      // Check for pawn promotion
      const piece = this.chess.get(event.squareFrom);
      console.log('Piece at source square:', piece);
      
      if (piece && piece.type === 'p') {
        if ((piece.color === 'w' && event.squareTo[1] === '8') ||
            (piece.color === 'b' && event.squareTo[1] === '1')) {
          move.promotion = 'q';
          console.log('Pawn promotion detected');
        }
      }
      
      try {
        console.log('Attempting move:', move);
        const result = this.chess.move(move);
        
        if (result) {
          console.log('Move successful:', result);
          const moveString = result.from + result.to + (result.promotion || '');
          console.log('Emitting move to server:', moveString);
          
          this.socket.emit('make_move', {
            game_id: this.gameId,
            move: moveString
          });
          return true;
        } else {
          console.log('Move rejected by chess.js');
        }
      } catch (e) {
        console.error('Invalid move error:', e);
        console.error('Move details:', move);
      }
      
      return false;
    },
    
    setupSocketListeners() {
      console.log('Setting up socket listeners');
      
      this.socket.on('move_made', (data) => {
        console.log('=== MOVE MADE EVENT ===');
        console.log('Received move data:', data);
        
        try {
          this.chess.load(data.fen);
          this.chessboard.setPosition(data.fen);
          this.$emit('turn-changed', data.turn);
          console.log('Board updated successfully');
        } catch (error) {
          console.error('Error updating board:', error);
        }
      });
      
      this.socket.on('game_over', (data) => {
        console.log('=== GAME OVER EVENT ===');
        console.log('Game over data:', data);
        
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
      console.log('Evaluation requested');
      this.$emit('evaluation-request');
    }
  },
  
  watch: {
    initialFen(newFen) {
      console.log('=== FEN CHANGED ===');
      console.log('New FEN:', newFen);
      
      if (newFen && this.chess && this.chessboard) {
        try {
          this.chess.load(newFen);
          this.chessboard.setPosition(newFen);
          console.log('Board updated with new FEN');
        } catch (error) {
          console.error('Error updating board with new FEN:', error);
        }
      }
    },
    
    userColor(newColor) {
      console.log('=== USER COLOR CHANGED ===');
      console.log('New color:', newColor);
      
      if (this.chessboard && newColor) {
        this.chessboard.setOrientation(newColor);
        console.log('Board orientation updated');
      }
    }
  },
  
  beforeUnmount() {
    console.log('ChessBoard component unmounting');
    
    if (this.chessboard) {
      this.chessboard.destroy();
      console.log('Chessboard destroyed');
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

/* Ensure pieces are visible */
:deep(.cm-chessboard .piece) {
  z-index: 10;
  pointer-events: none;
}

:deep(.cm-chessboard .board) {
  background-color: #f0d9b5;
}

:deep(.cm-chessboard .square.black) {
  background-color: #b58863;
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