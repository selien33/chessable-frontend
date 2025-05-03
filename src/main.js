import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Import chessboard styles
import 'cm-chessboard/assets/chessboard.css';

const app = createApp(App);
app.use(router);
app.mount('#app');