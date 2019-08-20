const express = require('express');
const _ = require('lodash');

const app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

const getConfig = require('./lib/getConfig');
const timeBounds = require('./lib/timeBounds');
const assetLocations = require('./lib/fetchAssetLocation');

let PORT = process.env.PORT || 3030;
let vehicles = {};

server.listen(PORT);

app.get('/api/status', function(req, res) {
  getConfig().then(function (data) {
    if (timeBounds(data.schedule)) {
      res.json({
        status: 'running',
        running: true,
        vehicles: vehicles
      })
    } else {
      res.json({
        status: 'out of service',
        running: false,
      })
    }
  });
})
app.use('/', express.static('./public'));

let listener = undefined;

io.on('connection', function (socket) {
  // ensure polling
  if (!listener) {
    console.log('setup polling!');
    pollForLocation();
    listener = setTimeout(pollForLocation, 5000);
  }

  socket.on('disconnect', (reason) => {
    io.of('/').clients((err, clients) => {
      if (err) throw err;
      if (!clients.length) {
        console.log('no more clients');
        listener = undefined;
      }
    })
  });
});

function pollForLocation() {
  io.of('/').clients((err, clients)=>{
    if (err) throw err;
    if (clients.length) {
      console.log(`${clients.length} clients connected`);
      updateVehicleLocations();
    }
  })
}

function updateVehicleLocations() {
  getConfig().then(function (data) {
    console.log('config data', data);
    // in time window?
    if (timeBounds(data.schedule)) {
      // try to get locations (within last 10 min)
      assetLocations(data.org, data.devices)
        .then(function (updates) {
          updates.forEach(function (item) {
            // broadcast most recent ones
            io.emit('vehicleUpdate', item)
          })
        })
        .catch((function (err) {
          console.log('failed to get device info', err)
        }))
    } else {
      listener = setTimeout(pollForLocation, 1000 * 60);
    }
  });
}

if (process.env.FAKE_VEHICLE) {
  const turf = require("@turf/turf");

  nextPoint([-83.045833, 42.331389]);

  function nextPoint(origin) {
    io.emit('vehicleUpdate', {
      name: "Jim Dandy",
      longitude: origin[0], 
      latitude: origin[1]
    })
    setTimeout(function(){
      var center = origin;
      var radius = .1;
      var options = { steps: 10, units: 'kilometers', properties: { foo: 'bar' } };
      var circle = turf.circle(center, radius, options);

      var bbox = turf.bbox(circle);
      var position = turf.randomPosition(bbox)
      nextPoint(position);

    },5000)
  }
}



