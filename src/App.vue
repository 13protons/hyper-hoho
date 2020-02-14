<template>
  <div id="app">
    <div id="logo">
      <img src="./assets/DBC-Logo_RGB@2x.png" alt="The Detroit Bus Company">
    </div>
    <Overlay v-if="mapLoaded" />
    <Map/>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

import Map from './components/Map.vue';
import Overlay from './components/Overlay.vue';

mapboxgl.accessToken = 'pk.eyJ1IjoiMTNwcm90b25zIiwiYSI6ImViN2ZiYTgxN2Y2MDRiZDY0ZDM5MGVhODM4M2Y0MDU2In0._FjwlF00n_W_k2GBaUnCHQ';

export default {
  name: 'app',
  components: {
    Map,
    Overlay
  },
  computed: {
    ...mapGetters(['mapLoaded']),
  },
  mounted() {
    this.$store.dispatch('initializeStore');
  }
};
</script>

<style lang="scss">
* {
  box-sizing: border-box;
}
body {
  padding: 0;
  margin: 0;
  font-family: sans-serif;
}
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  width: 100%;
}
#logo {
  position: fixed;
  top: 1em;
  left: 1em;
  background-color: transparent;
  z-index: 1000;
  img {
    width: 180px;
  }
}
</style>
