<template>
  <div class="game-history">
    <h1>Game History</h1>
    
    <div v-if="loading" class="loading">Loading...</div>
    
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else-if="games.length === 0" class="no-games">
      You haven't played any games yet.
    </div>
    
    <div v-else class="games-list">
      <div v-for="game in games" :key="game.RowKey" class="game-card" @click="analyzeGame(game.RowKey)">
        <div class="game-info">
          <div class="players">
            <span :class="{ 'winner': game.winner === game.white_player }">
              White: {{ game.white_username }}
            </span>
            vs
            <span :class="{ 'winner': game.winner === game.black_player }">
              Black: {{ game.black_username }}
            </span>
          </div>
          <div class="game-result">
            {{ getGameResult(game) }}
          </div>
          <div class="game-date">
            {{ formatDate(game.completed_at) }}
          </div>
        </div>
        <div class="analyze-button">
          Analyze →
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'GameHistory',
  setup() {
    const router = useRouter();
    const auth = inject('auth');
    const games = ref([]);
    const loading = ref(true);
    const error = ref('');

    const fetchGameHistory = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/games/history`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch game history');
        }

        const data = await response.json();
        games.value = data.games;
      } catch (err) {
        error.value = 'Failed to load game history';
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const getGameResult = (game) => {
      if (!game.winner) {
        return `Draw (${game.end_reason})`;
      }
      
      const userId = auth.currentUser.value.user_id;
      if (game.winner === userId) {
        return `You won (${game.end_reason})`;
      } else {
        return `You lost (${game.end_reason})`;
      }
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const analyzeGame = (gameId) => {
      router.push(`/analysis/${gameId}`);
    };

    onMounted(() => {
      fetchGameHistory();
    });

    return {
      games,
      loading,
      error,
      getGameResult,
      formatDate,
      analyzeGame
    };
  }
};
</script>

<style scoped>
.game-history {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}

.loading, .error, .no-games {
  text-align: center;
  padding: 20px;
  font-size: 18px;
}

.error {
  color: #f44336;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.game-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: box-shadow 0.3s;
}

.game-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.game-info {
  flex: 1;
}

.players {
  font-size: 16px;
  margin-bottom: 5px;
}

.winner {
  font-weight: bold;
  color: #4CAF50;
}

.game-result {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.game-date {
  font-size: 12px;
  color: #999;
}

.analyze-button {
  color: #2196F3;
  font-weight: bold;
}
</style>