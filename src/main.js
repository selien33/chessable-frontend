import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Import local chessboard styles
import './assets/chessboard/chessboard.css';

console.log('Main.js: Initializing Vue app');

const app = createApp(App);
app.use(router);
app.mount('#app');

console.log('Main.js: Vue app mounted');