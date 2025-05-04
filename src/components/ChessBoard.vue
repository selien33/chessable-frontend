<template>
  <div class="chess-board-container">
    <!-- Top player (depends on user's color) -->
    <div class="player-info">
      <div class="player" :class="{ active: currentTurn === topPlayer.color }">
        <span class="player-name">{{ topPlayer.username }}</span>
        <span class="player-color">{{ topPlayer.colorText }}</span>
      </div>
    </div>
    
    <div ref="boardElement" class="chess-board"></div>
    
    <!-- Bottom player (always the user) -->
    <div class="player-info">
      <div class="player" :class="{ active: currentTurn === bottomPlayer.color }">
        <span class="player-name">{{ bottomPlayer.username }}</span>
        <span class="player-color">{{ bottomPlayer.colorText }}</span>
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
import { Chessboard, INPUT_EVENT_TYPE, COLOR, BORDER_TYPE } from 'cm-chessboard';
import { Markers, MARKER_TYPE} from 'cm-chessboard/src/extensions/markers/Markers.js';
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
    const chess = ref(new Chess());
    const board = ref(null);
    const gameStatus = ref(null);
    const currentFen = ref(props.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    
    // Computed property to check if it's the user's turn
    const isMyTurn = computed(() => {
      return props.currentTurn === props.userColor;
    });
    
    // Computed properties for player positions based on board orientation
    const topPlayer = computed(() => {
      if (props.userColor === 'white') {
        // User is white, so black is on top
        return {
          username: props.blackPlayer?.username || 'Black',
          color: 'black',
          colorText: 'Black'
        };
      } else {
        // User is black, so white is on top
        return {
          username: props.whitePlayer?.username || 'White',
          color: 'white',
          colorText: 'White'
        };
      }
    });
    
    const bottomPlayer = computed(() => {
      if (props.userColor === 'white') {
        // User is white, so white is on bottom
        return {
          username: props.whitePlayer?.username || 'White',
          color: 'white',
          colorText: 'White'
        };
      } else {
        // User is black, so black is on bottom
        return {
          username: props.blackPlayer?.username || 'Black',
          color: 'black',
          colorText: 'Black'
        };
      }
    });
    
    // Following the example exactly
    function inputHandler(event) {
      console.log("inputHandler", event);
      
      if (event.type === INPUT_EVENT_TYPE.movingOverSquare) {
        return; // ignore this event
      }
      
      if (event.type !== INPUT_EVENT_TYPE.moveInputFinished) {
        event.chessboard.removeLegalMovesMarkers();
      }
      
      if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
        // Check if it's the player's turn BEFORE checking moves
        if (!isMyTurn.value) {
          console.log('Not my turn');
          return false;
        }
        
        // mark legal moves
        const moves = chess.value.moves({square: event.squareFrom, verbose: true});
        event.chessboard.addLegalMovesMarkers(moves);
        return moves.length > 0;
      } else if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
        // First check if this is a promotion move
        let possibleMoves = chess.value.moves({square: event.squareFrom, verbose: true});
        let isPromotionMove = false;
        
        for (const possibleMove of possibleMoves) {
          if (possibleMove.from === event.squareFrom && 
              possibleMove.to === event.squareTo && 
              possibleMove.promotion) {
            isPromotionMove = true;
            break;
          }
        }
        
        if (isPromotionMove) {
          // Show promotion dialog
          event.chessboard.showPromotionDialog(event.squareTo, COLOR[props.userColor], (result) => {
            console.log("promotion result", result);
            if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
              // Convert piece to proper format (e.g., 'wq' -> 'q')
              const promotionPiece = result.piece.charAt(1).toLowerCase();
              
              const promotionMove = chess.value.move({
                from: event.squareFrom, 
                to: event.squareTo, 
                promotion: promotionPiece
              });
              
              if (promotionMove) {
                event.chessboard.setPosition(chess.value.fen(), true);
                
                // Send move to server
                const moveString = promotionMove.from + promotionMove.to + promotionMove.promotion;
                props.socket.emit('make_move', {
                  game_id: props.gameId,
                  move: moveString
                });
              }
            } else {
              // promotion canceled
              event.chessboard.setPosition(chess.value.fen(), true);
            }
          });
          return true;
        } else {
          // Regular move
          const move = {from: event.squareFrom, to: event.squareTo};
          const result = chess.value.move(move);
          
          if (result) {
            event.chessboard.state.moveInputProcess.then(() => {
              event.chessboard.setPosition(chess.value.fen(), true).then(() => {
                // Send move to server
                const moveString = result.from + result.to + (result.promotion || '');
                props.socket.emit('make_move', {
                  game_id: props.gameId,
                  move: moveString
                });
              });
            });
            return true;
          } else {
            return false;
          }
        }
      } else if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
        if (event.legalMove) {
          event.chessboard.disableMoveInput();
        }
      }
    }
    
    const initializeBoard = () => {
      console.log('Initializing board with FEN:', currentFen.value);
      
      if (currentFen.value) {
        try {
          chess.value.load(currentFen.value);
          console.log('FEN loaded successfully');
        } catch (error) {
          console.error('Error loading FEN:', error);
          chess.value.reset();
        }
      }
      
      // Initialize cm-chessboard following the example
      board.value = new Chessboard(boardElement.value, {
        position: chess.value.fen(),
        assetsUrl: "/assets/",  // Note: adjusted path
        style: {
          borderType: BORDER_TYPE.none, 
          pieces: {file: "pieces/staunty.svg"}, 
          animationDuration: 300
        },
        orientation: COLOR[props.userColor],
        extensions: [
          {class: Markers, props: {autoMarkers: MARKER_TYPE.square}},
          {class: PromotionDialog}
        ]
      });
      
      // Enable input if it's the user's turn
      if (!props.readOnly && isMyTurn.value) {
        board.value.enableMoveInput(inputHandler, COLOR[props.userColor]);
      }
    };
    
    const setupSocketListeners = () => {
      props.socket.on('move_made', (data) => {
        console.log('Move made, new FEN:', data.fen);
        chess.value.load(data.fen);
        board.value.setPosition(chess.value.fen(), true);
        emit('turn-changed', data.turn);
        
        // Enable/disable input based on turn
        if (data.turn === props.userColor) {
          board.value.enableMoveInput(inputHandler, COLOR[props.userColor]);
        } else {
          board.value.disableMoveInput();
        }
      });
      
      props.socket.on('game_over', (data) => {
        // Set game status message
        if (data.reason === 'checkmate') {
          gameStatus.value = `Checkmate! ${data.winner === props.whitePlayer.id ? 'White' : 'Black'} wins!`;
        } else if (data.reason === 'stalemate') {
          gameStatus.value = 'Stalemate! The game is a draw.';
        } else if (data.reason === 'abandon') {
          gameStatus.value = `Game abandoned. ${data.winner === props.whitePlayer.id ? 'White' : 'Black'} wins!`;
        } else if (data.reason === 'disconnect') {
          gameStatus.value = `Opponent disconnected. ${data.winner === props.whitePlayer.id ? 'White' : 'Black'} wins!`;
        }
        
        // Disable input immediately
        board.value.disableMoveInput();
        
        // Wait for the board animation to complete and give users time to see the final position
        setTimeout(() => {
          emit('game-over', data);
        }, 2000); // 2 second delay to see the checkmate position
      });
    };
    
    const requestEvaluation = () => {
      emit('evaluation-request');
    };
    
    // Watch for turn changes
    watch(() => props.currentTurn, (newTurn) => {
      console.log('Turn changed to:', newTurn);
      if (board.value && !props.readOnly) {
        if (newTurn === props.userColor) {
          board.value.enableMoveInput(inputHandler, COLOR[props.userColor]);
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
      isMyTurn,
      topPlayer,
      bottomPlayer
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