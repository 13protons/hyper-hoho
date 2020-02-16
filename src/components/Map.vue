<template>
  <div id="wrapper">
    <div id="map"></div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { get } from 'lodash';
import PulsingDot from '../lib/dot';
// import * as omnivore from '@mapbox/leaflet-omnivore';

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
    ...mapGetters(['vehicles', 'inFocus', 'myPosition', 'mapLoaded', 'layers', 'overlayStatus', 'bounds', 'primaryLayer', 'otherLayers', 'event']),
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
    },
    focusOffset() {
      const full = window.innerHeight;
      const ratios = {
        full: 1,
        middle: 0.5,
        bottom: 0.25,
        hidden: 0
      };
      return (ratios[this.overlayStatus] * full * -1);
    }
  },
  watch: {
    overlayStatus() {
      this.reFocus();
    },
    vehicleCollection(newVal) {
      if (this.mapLoaded) {
        window.requestAnimationFrame(() => {
          map.getSource(this.vehicleLayerName).setData(newVal);
        });
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
          console.log('time to zoom', this.myPosition);
          // this.reFocus(this.myPosition, 12);
        }
      }
    }
  },
  methods: {
    reFocus(obj, zoom) {
      map.stop();
      let center;

      if (!obj || !obj.longitude) {
        center = map.getCenter();
      } else {
        center = [
          obj.longitude,
          obj.latitude
        ];
      }

      const options = {
        duration: 500,
        center
        // offset: [0, this.focusOffset ]
      };

      if (zoom) {
        options.zoom = zoom;
      }
      if (this.mapLoaded) {
        console.log('options', options);
        map.easeTo(options);
      }
    },
    asPoints(objs) {
      return {
        type: 'FeatureCollection',
        features: Object.values(objs).map(item => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [item.longitude, item.latitude] },
          properties: {
            title: item.name,
            coords: [item.longitude, item.latitude]
          }
        }))
      };
    },
    addDataLayers() {
      this.$store.dispatch('getDataLayers')
        .then(() => {
          this.addPrimaryLayer();
          this.addOtherLayers();
          // this.addHotelLayer();
          // this.addMustLayer();
          // this.addNiceLayer();

          console.log('bounds to fit', JSON.parse(JSON.stringify(this.bounds)));

          map.fitBounds(JSON.parse(JSON.stringify(this.bounds)), {
            padding: {
              top: 0,
              right: 0,
              bottom: 20,
              left: 0
            },
            linear: true
          });
        });
    },
    addPrimaryLayer() {
      // console.log('### primary layer', this.event.icons[0]);
      const images = get(this, 'event.icons', undefined); //'harbor-15')
      const waitForIcons = Promise.all(images.map((imageData, index) => {
        return new Promise((resolve, reject) => {
          map.loadImage(imageData, (err, image)=>{
            if (err) { return reject(err); }
            map.addImage(`icon-${index}`, image);
            resolve(`icon-${index}`);
          });
        });
      }));

      map.addSource('primary', {
        type: 'geojson',
        data: get(this, 'primaryLayer.FeatureCollection', {})
      });

      map.addLayer({
        id: 'route',
        source: 'primary',
        type: 'line',
        paint: {
          'line-width':  ['get', 'stroke-width'],
          'line-color': ['get', 'stroke']
        },
        filter: ['==', '$type', 'LineString']
      });

      waitForIcons.then(() => {
        map.addLayer({
          id: 'primaryPoints',
          type: 'symbol',
          source: 'primary',
          layout: {
            'icon-image': images[0] ? 'icon-0' : 'harbor-15',
            'icon-size': 1,
            'icon-allow-overlap': true
          },
          filter: ['==', '$type', 'Point']
        });
      });
    },
    addOtherLayers() {
      this.otherLayers.forEach((layer, index) => {
        map.addSource(`other-${index}`, {
          type: 'geojson',
          data: get(layer, 'FeatureCollection', {})
        });

        map.addLayer({
          id: `route-${index}`,
          source: `other-${index}`,
          type: 'line',
          paint: {
            'line-width':  ['get', 'stroke-width'],
            'line-color': ['get', 'stroke']
          },
          filter: ['==', '$type', 'LineString']
        });

        map.addLayer({
          id: `points-${index}`,
          type: 'symbol',
          source: `other-${index}`,
          layout: {
            'icon-image': 'harbor-15',
            'icon-size': 1
          },
          filter: ['==', '$type', 'Point']
        });
      });
    },
    mapDidLoad() {
      map.crossSourceCollisions = false;
      this.$store.commit('mapDidLoad');

      this.addVehiclesLayer();
      this.addMyPositionLayer();
      this.addDataLayers();

      map.on('click', (e) => {
        const elements = map.queryRenderedFeatures(e.point);
        elements.forEach((element) => {
          if (element.source === this.vehicleLayerName) {
            this.$store.commit('setFocus', element.properties.title);
          }
          if (element.source === this.selfLayerName) {
            this.$store.commit('focusOnMe');
          }
        });

        this.$store.dispatch('tryFocus', elements).then((subject) => {
          // reFocus
          console.log('props', subject);
          const coords = get(subject, 'properties.center', undefined);

          if (coords) {
            new mapboxgl.Popup({ closeOnClick: true })
              .setLngLat(JSON.parse(coords))
              .setText(subject.properties.name)
              .addTo(map);

            map.easeTo({
              center: JSON.parse(coords)
            });
          }
        }, (err) => {
          console.warn('nothing interesting there...', err);
        });
      });

      map.on('drag', () => {
        this.$store.commit('clearFocus');
      });
    },
    addMyPositionLayer() {
      const blueDot = PulsingDot(100, map, [26, 118, 186], [121, 154, 201]);

      map.addImage('my-location', blueDot, { pixelRatio: 2 });

      map.addSource(this.selfLayerName, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: this.selfLayerName,
        type: 'symbol',
        source: this.selfLayerName,
        layout: {
          'icon-image': 'my-location',
          'icon-allow-overlap': true,
        }
      });
    },
    addVehiclesLayer() {
      const pulsingDot = PulsingDot(100, map);
      map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });

      map.addSource(this.vehicleLayerName, {
        type: 'geojson',
        data: this.vehicleCollection
      });

      map.addLayer({
        id: this.vehicleLayerName,
        type: 'symbol',
        source: this.vehicleLayerName,
        layout: {
          'icon-image': 'pulsing-dot',
          'icon-allow-overlap': true
        },
        transition: {
          duration: 100,
          delay: 0
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
