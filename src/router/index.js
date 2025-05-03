import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Home from '../views/Home.vue';
import GameLobby from '../views/GameLobby.vue';
import GameHistory from '../views/GameHistory.vue';
import GameAnalysis from '../views/GameAnalysis.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/game',
    name: 'GameLobby',
    component: GameLobby,
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    name: 'GameHistory',
    component: GameHistory,
    meta: { requiresAuth: true }
  },
  {
    path: '/analysis/:gameId',
    name: 'GameAnalysis',
    component: GameAnalysis,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/check-auth`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        next();
      } else {
        next('/login');
      }
    } catch (error) {
      next('/login');
    }
  } else {
    next();
  }
});

export default router;