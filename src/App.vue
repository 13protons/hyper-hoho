<template>
  <div id="app">
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
</style>
