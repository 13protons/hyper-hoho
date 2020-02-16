import Vue from 'vue';
import Vuex from 'vuex';
import { get } from 'lodash';

Vue.use(Vuex);

const geoOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0
};

const overlays = {
  0: 'hidden',
  1: 'bottom',
  2: 'middle',
  3: 'full'
};

function contains(text, search) {
  return text.indexOf(search) > -1;
}

let fetchLayers;

export default new Vuex.Store({
  state: {
    vehicles: {},
    inFocus: '',
    isRunning: undefined,
    position: {},
    layers: [],
    mapLoaded: false,
    tooltipVisible: false,
    tooltipContent: '',
    overlayis: 1,
    bounds: undefined,
    event: {},
    knownIds: []
  },
  getters: {
    inFocus(state) {
      if (state.inFocus === '__me__') {
        return state.position;
      }
      return Object.values(state.vehicles).find(item => item.name === state.inFocus);
    },
    mapLoaded(state) { return state.mapLoaded; },
    vehicles(state) { return state.vehicles; },
    myPosition(state) { return state.position; },
    status(state) { return state.isRunning; },
    layers(state) { return state.layers; },
    overlayStatus(state) { return overlays[state.overlayis]; },
    bounds(state) { return state.bounds; },
    event(state) { return state.event; },
    primaryLayer(state) {
      return state.layers[0];
    },
    otherLayers(state) { return state.layers.slice(1); }
  },
  mutations: {
    mapDidLoad(state) {
      state.mapLoaded = true;
    },
    setLayers(state, data) {
      state.layers = data;
      state.knownIds = [];

      data.forEach((layer) => {
        const features = get(layer, 'FeatureCollection.features');
        features.forEach(feature => state.knownIds.push(get(feature, 'properties.id')));
      });
      console.log('knownIds', state.knownIds);
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
        state.overlayis += 1;
      }
    },
    overlayDown(state) {
      if (state.overlayis > 0) {
        state.overlayis -= 1;
      }
    },
    setBounds(state, data) { state.bounds = data; },
    setEvent(state, data) { state.event = data; },
  },
  actions: {
    tryFocus(store, data) {
      console.log('trying to focus on elements', data);
      const knownItem = data.find(item => contains(store.state.knownIds, get(item, 'properties.id')));

      if (knownItem) {
        return Promise.resolve(knownItem);
      }
      return Promise.reject(new Error('no items found'));
    },
    getDataLayers(store) {
      if (!fetchLayers) {
        fetchLayers = new Promise((resolve, reject) => {
          if (store.layers) {
            return resolve(store.layers);
          }

          return fetch('/api/layers')
            .then(response => response.json())
            .then((data) => {
              console.log('got layers data', data);
              store.commit('setLayers', data.layers);
              store.commit('setBounds', data.extents);
              resolve(data);
            })
            .catch(reject);
        });
      }
      return fetchLayers;
    },
    initializeStore(store) {
      fetch('/api/status')
        .then(response => response.json())
        .then((myJson) => {
          console.log('get json', myJson);
          store.commit('setStatus', myJson.status);
          store.commit('setEvent', myJson.event);

          console.log('trying to connect to socket: ', `/${myJson.event.eventID}`);
          const socket = io.connect(`/${myJson.event.eventID}`);
          socket.on('vehicleUpdate', (data) => {
            store.commit('updateVehicles', data);
          });
        });

      function error(err) {
        console.warn(`ERROR(${err.code}): ${err.message}`);
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        console.log('got first position');
        store.commit('updateMyPosition', pos.coords);
        navigator.geolocation.watchPosition((position) => {
          console.log('after watching position');
          store.commit('updateMyPosition', position.coords);
        }, error, geoOptions);
      }, error, geoOptions);
    }
  },
});
