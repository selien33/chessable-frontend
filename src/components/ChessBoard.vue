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
    
    <div v-if="!isMyTurn && !gameStatus" class="waiting-for-opponent">
      Waiting for opponent's move...
    </div>
    
    <button v-if="showEvaluation" @click="requestEvaluation" class="eval-button">
      Evaluate Position
    </button>
  </div>
</template>

<script>
import { Chess } from 'chess.js';
import { Chessboard, INPUT_EVENT_TYPE, MARKER_TYPE, COLOR } from 'cm-chessboard';
import { Markers } from 'cm-chessboard/src/extensions/markers/Markers.js';
import { PromotionDialog, PROMOTION_DIALOG_RESULT_TYPE } from 'cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js';
import 'cm-chessboard/assets/chessboard.css';
import 'cm-chessboard/assets/extensions/markers/markers.css';
import 'cm-chessboard/assets/extensions/promotion-dialog/promotion-dialog.css';
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';

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
    
    // Computed property to check if it's the user's turn
    const isMyTurn = computed(() => {
      return props.currentTurn === props.userColor;
    });
    
    // Define inputHandler first
    const inputHandler = (event) => {
      console.log('Input event:', event);
      
      // Ignore moving over square events
      if (event.type === INPUT_EVENT_TYPE.movingOverSquare) {
        return;
      }
      
      // Remove legal move markers on all events except move input finished
      if (event.type !== INPUT_EVENT_TYPE.moveInputFinished) {
        event.chessboard.removeLegalMovesMarkers();
      }
      
      // Handle move input started
      if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
        // Check if it's the player's turn
        if (!isMyTurn.value) {
          console.log('Not my turn');
          return false;
        }
        
        // Check if the player is moving their own piece
        const piece = chess.value.get(event.squareFrom);
        if (!piece || piece.color !== props.userColor.charAt(0)) {
          console.log('Not my piece');
          return false;
        }
        
        // Get legal moves for this piece and add markers
        const moves = chess.value.moves({ square: event.squareFrom, verbose: true });
        event.chessboard.addLegalMovesMarkers(moves);
        return moves.length > 0;
      }
      
      // Handle move validation
      if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
        const move = { from: event.squareFrom, to: event.squareTo };
        let result = chess.value.move(move);
        
        if (result) {
          // Move is valid
          event.chessboard.state.moveInputProcess.then(() => {
            // Send the move to the server
            const moveString = result.from + result.to + (result.promotion || '');
            props.socket.emit('make_move', {
              game_id: props.gameId,
              move: moveString
            });
          });
        } else {
          // Check if this is a promotion move
          const possibleMoves = chess.value.moves({ square: event.squareFrom, verbose: true });
          for (const possibleMove of possibleMoves) {
            if (possibleMove.promotion && possibleMove.to === event.squareTo) {
              // Show promotion dialog
              event.chessboard.showPromotionDialog(event.squareTo, props.userColor, (result) => {
                console.log('Promotion result:', result);
                if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
                  // Make the move with promotion
                  const promotionPiece = result.piece.charAt(1); // Get the piece type (q, r, b, n)
                  const moveResult = chess.value.move({
                    from: event.squareFrom,
                    to: event.squareTo,
                    promotion: promotionPiece
                  });
                  
                  if (moveResult) {
                    // Update the board position
                    event.chessboard.setPosition(chess.value.fen(), true);
                    
                    // Send the move to the server
                    const moveString = moveResult.from + moveResult.to + moveResult.promotion;
                    props.socket.emit('make_move', {
                      game_id: props.gameId,
                      move: moveString
                    });
                  }
                } else {
                  // Promotion cancelled
                  event.chessboard.setPosition(chess.value.fen(), true);
                  event.chessboard.enableMoveInput(inputHandler);
                }
              });
              return true;
            }
          }
        }
        return result;
      }
      
      // Handle move input finished
      if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
        if (event.legalMove) {
          // Disable input while waiting for server response
          event.chessboard.disableMoveInput();
        }
      }
    };
    
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
      
      // Initialize cm-chessboard with markers and promotion dialog extensions
      board.value = new Chessboard(boardElement.value, {
        position: chess.value.fen(),
        orientation: props.userColor,
        sprite: {
          url: '/assets/pieces/staunty.svg'
        },
        style: {
          cssClass: "default",
          showCoordinates: true,
          borderType: "thin",
          animationDuration: 300
        },
        extensions: [
          { class: Markers, props: { autoMarkers: MARKER_TYPE.square } },
          { class: PromotionDialog }
        ]
      });
      
      currentFen.value = chess.value.fen();
      console.log('Current FEN after initialization:', currentFen.value);
      
      // Enable piece dragging if not read-only and it's the user's turn
      if (!props.readOnly && isMyTurn.value) {
        board.value.enableMoveInput(inputHandler);
      }
    };
    
    const setupSocketListeners = () => {
      props.socket.on('move_made', (data) => {
        console.log('Move made, new FEN:', data.fen);
        chess.value.load(data.fen);
        currentFen.value = data.fen;
        board.value.setPosition(currentFen.value, true);
        emit('turn-changed', data.turn);
        
        // Enable input if it's now the user's turn
        if (data.turn === props.userColor) {
          board.value.enableMoveInput(inputHandler);
        } else {
          board.value.disableMoveInput();
        }
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
        board.value.disableMoveInput();
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
          board.value.setPosition(newFen, true);
        }
      }
    });
    
    // Watch for turn changes to enable/disable input
    watch(() => props.currentTurn, (newTurn) => {
      console.log('Turn changed to:', newTurn);
      if (board.value && !props.readOnly) {
        if (newTurn === props.userColor) {
          board.value.enableMoveInput(inputHandler);
        } else {
          board.value.disableMoveInput();
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
      requestEvaluation,
      isMyTurn
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

.waiting-for-opponent {
  text-align: center;
  font-style: italic;
  color: #666;
  margin: 10px 0;
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