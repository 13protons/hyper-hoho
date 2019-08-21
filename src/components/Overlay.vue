<template>
  <div id="overlay">
    <p>{{ statusMessage }}</p>

    <div v-if="displayFocusInfo">
      <p>Following: {{ inFocus.name }}</p>
      <a href="#" @click.prevent="unfollow">clear</a>
    </div>
    
    <div v-if="!displayFocusInfo">
      <p v-for="item in vehicles" v-bind:key="item.name">
        <a href="#" @click.prevent="follow(item.name)">{{item.name}}</a>
      </p>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'overlay',
  data() {
    return {
    };
  },
  computed: {
    ...mapGetters([
      'vehicles', 'inFocus', 'status'
    ]),
    displayFocusInfo() {
      try {
        return !!this.inFocus.name;
      } catch(e) {
        return false;
      }
    },
    statusMessage() {
      if (this.status) {
        return 'Busses are running!'
      }
      return 'Sorry, no busses are running right now :\'('
    }
  },
  methods: {
    follow(name) {
      this.$store.commit('setFocus', name);
    },
    unfollow() {
      this.$store.commit('clearFocus')
    }
  },
  mounted() {
  }
};

</script>

<style scoped>
#overlay {
  z-index: 1000;
  position: absolute;
  top: 1em;
  right: 1em;
  padding: 1em;
  background-color: rgba(255, 255, 255, .95);

  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, .3);
  box-shadow: 0px 5px 10px rgba(0, 0, 0, .1);
  min-width: 100px;
  max-width: 480px;
}
</style>
