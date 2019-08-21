import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

var geoOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0
}

export default new Vuex.Store({
  state: {
    vehicles: {},
    inFocus: '',
    isRunning: false,
    position: {}
  },
  getters: {
    inFocus(state) {
      if (state.inFocus === '__me__') {
        return state.position;
      }
      return Object.values(state.vehicles).find(item => item.name === state.inFocus);
    },
    vehicles(state) {
      return state.vehicles;
    },
    myPosition(state) {
      return state.position
    },
    status(state) {
      return state.isRunning;
    }
  },
  mutations: {
    setStatus(state, data) {
      state.isRunning = !!data;
    },
    updateVehicles(state, data) {
      // console.log('udating vehicle in the store', data);
      // handle single object or array of objects from data
      let vehicles = [].concat.apply([], [data]);
      vehicles.forEach((vehicle)=>{
        Vue.set(state.vehicles, vehicle.id, vehicle);
      })
    },
    setFocus(state, name) {
      state.inFocus = name;
    },
    clearFocus(state) {
      state.inFocus = '';
    },
    focusOnMe(state) {
      state.inFocus = '__me__';
    },
    updateMyPosition(state, pos) {
      Vue.set(state, 'position', pos);
    }
  },
  actions: {
    initializeStore(store) {
      fetch('/api/status')
        .then(function (response) {
          return response.json();
        })
        .then((myJson) => {
          store.commit('setStatus', myJson.running);
          if (myJson.vehicles) { 
            store.commit('updateVehicles', JSON.parse(JSON.stringify(myJson.vehicles)));
          }
        });

      const socket = io.connect('/');
      socket.on('vehicleUpdate', (data) => {
        store.commit('updateVehicles', data);
      });


      function error(err) {
        console.warn(`ERROR(${err.code}): ${err.message}`);
      }
      navigator.geolocation.getCurrentPosition(function (pos) {
        console.log('got first position');
        store.commit('updateMyPosition', pos.coords);
        navigator.geolocation.watchPosition(function (pos) {
          console.log('after watching position');
          store.commit('updateMyPosition', pos.coords);
        }, error, geoOptions);
      }, error, geoOptions); 
    }
  },
});
