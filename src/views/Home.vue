<template>
  <div class="home-container">
    <div class="welcome-section">
      <h1>Welcome to Chess Game</h1>
      <p>Choose an option to get started</p>
    </div>
    
    <div class="options-grid">
      <div class="option-card" @click="startNewGame">
        <div class="option-icon">♟️</div>
        <h2>Start New Game</h2>
        <p>Find an opponent and play chess</p>
      </div>
      
      <div class="option-card" @click="viewGameHistory">
        <div class="option-icon">📊</div>
        <h2>Analyze Past Games</h2>
        <p>Review and analyze your previous games</p>
      </div>
    </div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router';

export default {
  name: 'Home',
  setup() {
    const router = useRouter();

    const startNewGame = () => {
      router.push('/game');
    };

    const viewGameHistory = () => {
      router.push('/history');
    };

    return {
      startNewGame,
      viewGameHistory
    };
  }
};
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.welcome-section {
  text-align: center;
  margin-bottom: 3rem;
}

.welcome-section h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.welcome-section p {
  font-size: 1.2rem;
  color: #666;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.option-card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.option-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.option-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.option-card h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.option-card p {
  color: #666;
}
</style>