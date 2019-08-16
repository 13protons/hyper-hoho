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

app.use('/', express.static('./public'));

io.on('connection', function (socket) {
  // ensure polling
});

setInterval(pollForLocation, 5000);

function pollForLocation() {
  getConfig().then(function (data) {
    console.log('config data', data);
    // in time window?
    if (timeBounds(data.schedule)) {
      // try to get locations (within last 10 min)
      assetLocations(data.org, data.devices)
        .then(function(updates){
          updates.forEach(function(item) {
            // broadcast most recent ones
            io.emit('vehicleUpdate', item)
          })
        })
        .catch((function(err){
          console.log('failed to get device info', err)
        }))
    }
  })
}



function vehicleData(serial) {
  let data = vehicles[serial];
  if (!data) {
    throw `No data for device ${serial}`;
  }

  return {
    coords: {
      lng: data.longitude,
      lat: data.latitude
    },
    name: data.name,
    serial: data.serial,
    updated: data.time
  }
}



