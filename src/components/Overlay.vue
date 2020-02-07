<template>
  <div id="overlay" v-touch:swipe="swipeUpHandler" :class="overlayStatus">
    <div class="overlay-content">
      <p>{{ statusMessage }}</p>
 
      <div class="control">
        <input class="input" type="text" placeholder="Search Interesting Places...">
      </div>


      <div v-if="displayFocusInfo">
        <p>Following: {{ inFocus.name }}</p>
        <a href="#" @click.prevent="unfollow">clear</a>
      </div>
      <div v-if="!displayFocusInfo">
        <p v-for="item in vehicles" v-bind:key="item.name">
          <a href="#" @click.prevent="follow(item.name)">{{item.name}}</a>
        </p>
      </div>
      <div>
        <label class="checkbox" v-if="hotels">
          <input type="checkbox" v-model="showHotels" @change="syncHotelToggle" />
          Hotels
        </label>
        <p>Position: {{overlayStatus}}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'overlay',
  data() {
    return {
      showHotels: false,
    };
  },
  computed: {
    ...mapGetters(['vehicles', 'inFocus', 'status', 'hotels', 'mustHaves', 'niceHaves', 'mapLoaded', 'overlayStatus']),
    displayFocusInfo() {
      try {
        return !!this.inFocus.name;
      } catch (e) {
        return false;
      }
    },
    statusMessage() {
      if (this.status) {
        return 'Busses are running!';
      }
      return 'Sorry, no busses are running right now :\'(';
    }
  },
  methods: {
    swipeUpHandler(direction) {
      console.log('did swipe', direction);
      if (direction === 'top') {
        this.$store.commit('overlayUp');
      } else if (direction === 'bottom') {
        this.$store.commit('overlayDown');
      }
    },
    contains(text, search) {
      return text.indexOf(search) > -1;
    },
    follow(name) {
      this.$store.commit('setFocus', name);
    },
    unfollow() {
      this.$store.commit('clearFocus');
    },
    syncHotelToggle() {
      console.log('sync hotel toggle', this.showHotels);
      this.$store.commit('setShowHotels', this.showHotels);
    },
    addDataLayers() {
      this.$store.dispatch('getDataLayers').then((data) => {
        console.log('got some layers overlay', data);
        // add them to the map
      });
    }
  },
  mounted() {
    // this.addDataLayers();
  }
};
</script>

<style scoped lang="scss">
  #overlay {
    z-index: 1000;
    position: absolute;
    bottom: 0em;
    margin: 0;
    width: 100%;
    padding: 0 .5em;
    transition: all .3s ease-in-out;
    overflow: hidden;


    &.hidden {
      height: 1em;
    }

    &.bottom {
      height: 25vh;
    }

    &.middle {
      height: 50vh;
    }
    
    &.full {
      height: 100vh;
      padding: 0;
    }
  }

  .overlay-content {
    width: 100%;
    height: 100%;

    padding: 1em;
    background-color: rgba(255, 255, 255, 0.95);

    border-top-left-radius: 8px;
    border-top-right-radius: 8px;

    border: 1px solid rgba(0, 0, 0, 0.3);
    box-shadow: 0px 5px 10px rgba(0, 0, 0, 0.1);

  }

  #overlay.full .overlay-content {
    border-radius: 0;
    border: none;
    box-sizing: none;
  }
</style>
