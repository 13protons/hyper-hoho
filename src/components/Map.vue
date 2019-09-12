<template>
  <div id="wrapper">
    <div id="map"></div>
  </div>
</template>

<script>
import {mapGetters} from 'vuex';
import PulsingDot from '../lib/dot';

let map;

export default {
  name: 'map',
  data() {
    return {
      map: undefined,
      vehicleLayerName: 'hopOnHopOffTracking',
      selfLayerName: 'whereAmI',
      // mapLoaded: false,
      didZoomToSelf: false
    };
  },
  computed: {
    ...mapGetters(['vehicles', 'inFocus', 'myPosition', 'mapLoaded', 'routes', 'hotels', 'mustHaves', 'niceHaves']),
    vehicleCollection() {
      return this.asPoints(this.vehicles);
    },
    myPositionCollection() {
      return this.asPoints({
        me: { 
          longitude: this.myPosition.longitude, 
          latitude: this.myPosition.latitude 
        }
      });
    }
  },
  watch: {
    vehicleCollection(newVal, oldVal) {
      if (this.mapLoaded) {
        window.requestAnimationFrame(()=>{
          map.getSource(this.vehicleLayerName).setData(newVal);
        })
        
      }
    },
    inFocus(newVal) {
      this.reFocus(newVal);
    },
    myPositionCollection(newVal) {
      if (this.mapLoaded) {
        map.getSource(this.selfLayerName).setData(newVal);
        if (!this.didZoomToSelf && !this.inFocus) {
          this.didZoomToSelf = true;
          console.log('time to zoom', this.myPosition)
          this.reFocus(this.myPosition, 12);
        }
      }
    }
  },
  methods: {
    reFocus(obj, zoom) {
      if (!obj || !obj.longitude) { return }

      let options = {
        duration: 1000,
        center: [
          obj.longitude,
          obj.latitude
        ]
      };
      if (zoom) {
        options.zoom = zoom;
      }
      if (this.mapLoaded) {
        map.easeTo(options);
      }
    },
    asPoints(objs) {
      return {
        type: 'FeatureCollection',
        features: Object.values(objs).map(item => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [item.longitude, item.latitude] },
          properties: { title: item.name, }
        }))
      };
    },
    addDataLayers() {
      this.$store.dispatch('getDataLayers')
        .then((data)=>{
          this.addRouteLayer();
          this.addHotelLayer();
          this.addMustLayer();
          this.addNiceLayer();
        })
    },
    addMustLayer() {
      this.addSourceFromCollection(this.mustHaves);

      map.addLayer({
        id: this.mustHaves.id,
        source: this.mustHaves.id,
        type: 'symbol',
        layout: {
          'icon-image': 'star-15',
          // 'text-field': '{name}',
          // 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          // 'text-offset': [0, 0.6],
          // 'text-anchor': 'top'
          
        }
      });
    },
    addNiceLayer() {
      this.addSourceFromCollection(this.niceHaves);

      map.addLayer({
        id: this.niceHaves.id,
        source: this.niceHaves.id,
        type: 'symbol',
        paint: {
          'icon-opacity': [
            'interpolate', ['linear'], ['zoom'],
            14, ['literal', 0.0],
            15, ['literal', 1.0],
          ]
        },
        layout: {
          'icon-image': 'marker-15',
          // 'text-field': '{name}',
          // 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          // 'text-offset': [0, 0.6],
          // 'text-anchor': 'top'
        }
      });
    },
    addHotelLayer() {
      this.addSourceFromCollection(this.hotels);

      map.addLayer({
        id: this.hotels.id,
        source: this.hotels.id,
        type: 'symbol',
        layout: {
          'icon-image': 'lodging-15',
          // 'text-field': '{name}',
          // 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          // 'text-offset': [0, 0.6],
          // 'text-anchor': 'top'
        },
        paint: {
          // "text-size": 8,
          "icon-color" : "green"
        }
      });
    },
    addRouteLayer() {
      this.routes.forEach((route)=>{
        this.addSourceFromCollection(route);
          
        map.addLayer({
          id: route.id,
          source: route.id,
          type: "line",
          paint: {
            "line-width": 3,
            "line-color": '#33C9EB'
          }
        });
      });
    },
    addSourceFromCollection(collection) {
      map.addSource(collection.id, {
        "type": "geojson",
        "data": collection
      });
    },
    mapDidLoad() {
      map.crossSourceCollisions = false;
      this.$store.commit('mapDidLoad');

      this.addVehiclesLayer();
      this.addMyPositionLayer();
      this.addDataLayers();

      map.on("click", (e) => {
        map.queryRenderedFeatures(e.point).forEach((element) => {
          if (element.source === this.vehicleLayerName) {
            this.$store.commit('setFocus', element.properties.title)
          }
          if (element.source === this.selfLayerName) {
            this.$store.commit('focusOnMe');
          }
        })
      })

      map.on("drag", () => {
        this.$store.commit('clearFocus')
      });
    },
    addMyPositionLayer() {
      const blueDot = PulsingDot(100, map, [26, 118, 186], [121, 154, 201]);

      map.addImage('my-location', blueDot, { pixelRatio: 2 });

      map.addSource(this.selfLayerName, {
        "type": "geojson",
        "data": {type: 'FeatureCollection', 'features': []}
      });

      map.addLayer({
        "id": this.selfLayerName,
        "type": "symbol",
        "source": this.selfLayerName,
        "layout": {
          "icon-image": "my-location",
          'icon-allow-overlap': true,
        }
      });
    },
    addVehiclesLayer() {
      const pulsingDot = PulsingDot(100, map);
      map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });

      map.addSource(this.vehicleLayerName, {
        "type": "geojson",
        "data": this.vehicleCollection
      });
      
      map.addLayer({
        "id": this.vehicleLayerName,
        "type": "symbol",
        "source": this.vehicleLayerName,
        "layout": {
          "icon-image": "pulsing-dot",
          'icon-allow-overlap': true
        },
        "transition": {
          "duration": 100,
          "delay": 0
        }
      });
      // map.addLayer({
      //   "id": this.vehicleLayerName,
      //   "source": this.vehicleLayerName,
      //   "type": "circle",
      //   "paint": {
      //     "circle-radius": 10,
      //     "circle-color": "#ff6464"
      //   }
      // });
    }
  },
  mounted() {
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/basic-v9',
      center: [-83.045833, 42.331389],
      zoom: 10,
      crossSourceCollisions: false

    });

    map.on('load', this.mapDidLoad);
  }
};
</script>

<style scoped>
#map {
  width: 100%;
  height: 100vh;
}
</style>
