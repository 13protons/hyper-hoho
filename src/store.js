import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const geoOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0
};

let fetchLayers;

export default new Vuex.Store({
  state: {
    vehicles: {},
    inFocus: '',
    isRunning: undefined,
    position: {},
    layers: [],
    mapLoaded: false,
    showHotels: false,
    tooltipVisible: false,
    tooltipContent: '',
    overlayis: 1,
    bounds: undefined
  },
  getters: {
    inFocus(state) {
      if (state.inFocus === '__me__') {
        return state.position;
      }
      return Object.values(state.vehicles).find(item => item.name === state.inFocus);
    },
    showHotels(state) { return state.showHotels; },
    showMustHaves(state) { return state.showMustHaves; },
    showNiceHaves(state) { return state.showNiceHaves; },
    mapLoaded(state) {
      return state.mapLoaded;
    },
    vehicles(state) {
      return state.vehicles;
    },
    myPosition(state) {
      return state.position;
    },
    status(state) {
      return state.isRunning;
    },
    layers(state) {
      return state.layers;
    },
    routes(state) {
      return state.layers.filter(item => contains(item.id, 'directions'));
    },
    hotels(state) {
      return state.layers.find(item => contains(item.id, 'hotel'));
    },
    mustHaves(state) {
      return state.layers.find(item => contains(item.id, 'must'));
    },
    niceHaves(state) {
      return state.layers.find(item => contains(item.id, 'nice'));
    },
    overlayStatus(state) {
      let overlays = {
        '0': 'hidden',
        '1': 'bottom',
        '2': 'middle',
        '3': 'full'
      }
      return overlays[state.overlayis];
    },
    bounds(state) {
      return state.bounds;
    }
  },
  mutations: {
    setShowHotels(state, data) { state.showHotels = data; },
    setShowMustHaves(state, data) { state.showMustHaves = data; },
    setShowNiceHaves(state, data) { state.showNiceHaves = data; },
    mapDidLoad(state) {
      state.mapLoaded = true;
    },
    setLayers(state, data) {
      state.layers = data;
    },
    setStatus(state, data) {
      state.isRunning = !!data;
    },
    updateVehicles(state, data) {
      // console.log('udating vehicle in the store', data);
      // handle single object or array of objects from data
      const vehicles = [].concat.apply([], [data]);
      vehicles.forEach((vehicle) => {
        Vue.set(state.vehicles, vehicle.id, vehicle);
      });
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
    },
    overlayUp(state) {
      if (state.overlayis < 3) {
        state.overlayis++;
      }
    },
    overlayDown(state) {
      if (state.overlayis > 0) {
        state.overlayis--;
      }
    },
    setBounds(state, data) {
      state.bounds = data
    }
  },
  actions: {
    tryFocus(store, data) {
      const knownItem = data.find(item => store.state.layers.find((layer) => {
        if (contains(item.source, 'directions')) {
          return false;
        }
        return layer.id === item.source;
      }));

      console.log('trying to focus on elements', data);
      if (knownItem) {
        return Promise.resolve(knownItem);
      }
      return Promise.reject('no items found');


      // return mustHave || hotel || niceHave || undefined;
    },
    getDataLayers(store) {
      if (fetchLayers) {
        return fetchLayers;
      }
      return fetchLayers = new Promise((resolve, reject) => {
        if (store.layers) {
          return resolve(store.layers);
        }

        fetch('/api/layers')
          .then(response => response.json())
          .then((data) => {
            store.commit('setLayers', data.layers);
            store.commit('setBounds', data.extents);
            resolve(data);
          });
      });
    },
    initializeStore(store) {
      fetch('/api/status')
        .then(response => response.json())
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
      navigator.geolocation.getCurrentPosition((pos) => {
        console.log('got first position');
        store.commit('updateMyPosition', pos.coords);
        navigator.geolocation.watchPosition((pos) => {
          console.log('after watching position');
          store.commit('updateMyPosition', pos.coords);
        }, error, geoOptions);
      }, error, geoOptions);
    }
  },
});

function contains(text, search) {
  return text.indexOf(search) > -1;
}
