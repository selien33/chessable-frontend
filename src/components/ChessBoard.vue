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
import { Chessboard, INPUT_EVENT_TYPE } from 'cm-chessboard';
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
      
      // Initialize cm-chessboard
      board.value = new Chessboard(boardElement.value, {
        position: chess.value.fen(),
        orientation: props.userColor,
        sprite: {
          url: '/assets/pieces/staunty.svg'
        },
        style: {
          cssClass: "default",
          showCoordinates: true,
          borderType: "thin"
        }
      });
      
      currentFen.value = chess.value.fen();
      console.log('Current FEN after initialization:', currentFen.value);
      
      // Enable piece dragging if not read-only
      if (!props.readOnly) {
        board.value.enableMoveInput(inputHandler, props.userColor);
      }
    };
    
    const inputHandler = (event) => {
      console.log('Input event:', event);
      
      // Only process the moveDone event
      if (event.type !== INPUT_EVENT_TYPE.moveDone) {
        return;
      }
      
      // Only allow moves if it's the user's turn
      if (props.currentTurn !== props.userColor) {
        console.log('Not user turn, reverting');
        return false;
      }
      
      // Handle promotion
      let promotion = undefined;
      const piece = chess.value.get(event.squareFrom);
      
      if (piece && piece.type === 'p') {
        const fromRank = event.squareFrom[1];
        const toRank = event.squareTo[1];
        
        // Check if this is a pawn promotion
        if ((piece.color === 'w' && fromRank === '7' && toRank === '8') ||
            (piece.color === 'b' && fromRank === '2' && toRank === '1')) {
          // For now, always promote to queen
          promotion = 'q';
        }
      }
      
      // Try to make the move with chess.js
      try {
        const move = chess.value.move({
          from: event.squareFrom,
          to: event.squareTo,
          promotion: promotion
        });
        
        if (move) {
          console.log('Valid move:', move);
          currentFen.value = chess.value.fen();
          
          // Emit the move to the server
          props.socket.emit('make_move', {
            game_id: props.gameId,
            move: move.from + move.to + (move.promotion || '')
          });
          
          return true; // Accept the move
        } else {
          console.log('Invalid move');
          return false; // Reject the move
        }
      } catch (e) {
        console.error('Error making move:', e);
        return false; // Reject the move
      }
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
      if (!props.readOnly) {
        setupSocketListeners();
      }
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

/* Import cm-chessboard styles */
:deep(.cm-chessboard) {
  width: 100% !important;
  border: 2px solid #333;
  border-radius: 4px;
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