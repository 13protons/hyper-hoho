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
      vehicleLayerName: 'hopOnHopOnTracking',
      selfLayerName: 'whereAmI',
      mapLoaded: false,
      didZoomToSelf: false
    };
  },
  computed: {
    ...mapGetters(['vehicles', 'inFocus', 'myPosition']),
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
        map.getSource(this.vehicleLayerName).setData(newVal);
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
    mapDidLoad() {
      this.mapLoaded = true;
      this.addVehiclesLayer();
      this.addMyPositionLayer()

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
          "icon-image": "my-location"
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
          "icon-image": "pulsing-dot"
        }
      });
    }
  },
  mounted() {
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v9',
      center: [-83.045833, 42.331389],
      zoom: 10
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
