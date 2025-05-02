import { createApp } from 'vue';
import App from './App.vue';

// Import chessboard styles
import 'cm-chessboard/assets/chessboard.css';
import 'cm-chessboard/assets/pieces/staunty.css';
import 'cm-chessboard/assets/extensions/markers/markers.css';
import 'cm-chessboard/assets/extensions/arrows/arrows.css';

createApp(App).mount('#app');
