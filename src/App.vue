<template>
  <div id="app">
    <header>
      <h1>Azure Chess Game</h1>
    </header>
    <main>
      <GameLobby />
    </main>
    <footer>
      <p>Created with Azure Services - Bachelor Project</p>
    </footer>
  </div>
</template>

<script>
import GameLobby from './components/GameLobby.vue';

export default {
  name: 'App',
  components: {
    GameLobby
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background-color: #0078d4;
  color: white;
  padding: 20px;
  text-align: center;
}

main {
  flex: 1;
  padding: 20px;
}

footer {
  background-color: #f5f5f5;
  padding: 10px;
  text-align: center;
  border-top: 1px solid #ddd;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
</style>
