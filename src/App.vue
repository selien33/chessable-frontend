<template>
  <div id="app">
    <NavBar v-if="isAuthenticated" @logout="handleLogout" />
    <RouterView :key="$route.fullPath" />
  </div>
</template>

<script>
import { ref, onMounted, provide } from 'vue';
import { RouterView } from 'vue-router';
import NavBar from './components/NavBar.vue';

export default {
  name: 'App',
  components: {
    NavBar,
    RouterView
  },
  setup() {
    const isAuthenticated = ref(false);
    const currentUser = ref(null);

    const checkAuth = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/check-auth`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          isAuthenticated.value = data.authenticated;
          currentUser.value = data;
        } else {
          isAuthenticated.value = false;
          currentUser.value = null;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        isAuthenticated.value = false;
        currentUser.value = null;
      }
    };

    const handleLogout = async () => {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/logout`, {
          method: 'POST',
          credentials: 'include'
        });
        isAuthenticated.value = false;
        currentUser.value = null;
        window.location.href = '/login';
      } catch (error) {
        console.error('Logout failed:', error);
      }
    };

    onMounted(() => {
      checkAuth();
    });

    provide('auth', {
      isAuthenticated,
      currentUser,
      checkAuth
    });

    return {
      isAuthenticated,
      handleLogout
    };
  }
};
</script>

<style>
#app {
  font-family: Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
</style>