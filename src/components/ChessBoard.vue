<template>
  <div class="chess-board-container">
    <div class="player-info">
      <div class="player" :class="{ active: currentTurn === 'black' }">
        <span class="player-name">{{ blackPlayer?.username || 'Black' }}</span>
        <span class="player-color">Black</span>
      </div>
    </div>
    <img src="/node_modules/cm-chessboard/assets/pieces/staunty.svg" alt="Chessboard" class="chessboard-image" />
    <div ref="boardElement" class="chess-board"></div>
    
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
import { Chessboard, MARKER_TYPE } from 'cm-chessboard';
import 'cm-chessboard/assets/chessboard.css';
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

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
  setup(props, { emit }) {
    const boardElement = ref(null);
    const chess = ref(null);
    const board = ref(null);
    const gameStatus = ref(null);
    const currentFen = ref(props.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    
    const initializeBoard = () => {
      console.log('Initializing board with FEN:', currentFen.value);
      
      chess.value = new Chess();
      
      if (currentFen.value) {
        try {
          chess.value.load(currentFen.value);
          console.log('FEN loaded successfully');
        } catch (error) {
          console.error('Error loading FEN:', error);
          chess.value.reset();
        }
      } else {
        chess.value.reset();
      }
      
      // Use the public directory path
      board.value = new Chessboard(boardElement.value, {
        position: chess.value.fen(),
        orientation: props.userColor,
        sprite: {
          url: '/assets/pieces/staunty.svg'  // Changed from node_modules path
        },
        style: {
          cssClass: "default",
          showCoordinates: true,
          borderType: "thin"
        }
      });
      
      currentFen.value = chess.value.fen();
      console.log('Current FEN after initialization:', currentFen.value);
      
      if (!props.readOnly) {
        board.value.enableMoveInput(handleMoveInput);
      }
    };
    
    const moveInputHandler = (event) => {
      // Only allow moves if it's the user's turn
      if (props.currentTurn !== props.userColor) {
        return false;
      }
      
      const move = {
        from: event.squareFrom,
        to: event.squareTo,
        promotion: event.piece ? event.piece.charAt(1) : undefined
      };
      
      // Check if promotion is needed
      const piece = chess.value.get(move.from);
      if (piece && piece.type === 'p') {
        const toRank = move.to[1];
        if ((piece.color === 'w' && toRank === '8') || 
            (piece.color === 'b' && toRank === '1')) {
          move.promotion = 'q'; // Default to queen promotion
        }
      }
      
      try {
        const result = chess.value.move(move);
        if (result) {
          currentFen.value = chess.value.fen();
          
          props.socket.emit('make_move', {
            game_id: props.gameId,
            move: result.from + result.to + (result.promotion || '')
          });
          
          return true;
        }
      } catch (e) {
        console.error('Invalid move:', e);
      }
      
      return false;
    };
    
    const setupSocketListeners = () => {
      props.socket.on('move_made', (data) => {
        console.log('Move made, new FEN:', data.fen);
        chess.value.load(data.fen);
        currentFen.value = data.fen;
        board.value.setPosition(currentFen.value);
        emit('turn-changed', data.turn);
      });
      
      props.socket.on('game_over', (data) => {
        if (data.reason === 'checkmate') {
          gameStatus.value = `Checkmate! ${data.winner === props.whitePlayer.id ? 'White' : 'Black'} wins!`;
        } else if (data.reason === 'stalemate') {
          gameStatus.value = 'Stalemate! The game is a draw.';
        } else if (data.reason === 'abandon') {
          gameStatus.value = `Game abandoned. ${data.winner === props.whitePlayer.id ? 'White' : 'Black'} wins!`;
        } else if (data.reason === 'disconnect') {
          gameStatus.value = `Opponent disconnected. ${data.winner === props.whitePlayer.id ? 'White' : 'Black'} wins!`;
        }
        emit('game-over', data);
      });
    };
    
    const requestEvaluation = () => {
      emit('evaluation-request');
    };
    
    // Watch for initialFen changes
    watch(() => props.initialFen, (newFen) => {
      console.log('FEN changed to:', newFen);
      if (newFen && chess.value) {
        chess.value.load(newFen);
        currentFen.value = newFen;
        if (board.value) {
          board.value.setPosition(newFen);
        }
      }
    });
    
    onMounted(() => {
      initializeBoard();
      
      // Debug shadow DOM
      setTimeout(() => {
        const boardElement = document.querySelector('.cm-chessboard');
        console.log('Board element:', boardElement);
        
        const pieces = boardElement?.querySelectorAll('.piece');
        console.log('Pieces found:', pieces?.length);
        
        pieces?.forEach((piece, index) => {
          console.log(`Piece ${index}:`, piece);
          console.log(`Has shadow root:`, piece.shadowRoot);
          console.log(`Inner HTML:`, piece.innerHTML);
        });
      }, 1000);
    });
    
    onBeforeUnmount(() => {
      if (board.value) {
        board.value.destroy();
      }
    });
    
    return {
      boardElement,
      gameStatus,
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

/* Some additional styles for proper rendering */
.chess-board :deep(.cm-chessboard) {
  width: 100% !important;
  border: 2px solid #333;
  border-radius: 4px;
}

.chess-board :deep(.cm-chessboard .board) {
  width: 100%;
}

.chess-board :deep(.cm-chessboard .board .square) {
  float: left;
  position: relative;
  width: 12.5%;
  height: 12.5%;
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