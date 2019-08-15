const express = require('express');
const bodyParser = require('body-parser')
const EventEmitter = require('events')
const _ = require('lodash');

const app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
const eventEmitter = new EventEmitter()

const webhookToCoords = require('./lib/fetchAssetLocation');

let PORT = process.env.PORT || 3030;
let vehicles = {};

server.listen(PORT);

app.get('/api/vehicle/:serial', function(req, res) {
  try {
    event = vehicleData(req.params.serial);
    res.json(vehicleData(event));
  } catch (e) {
    res.status(404).send(`No data for device ${serial}`)
  }
})

app.post('/api/vehicle', bodyParser.json(), function(req, res, next) {
  console.log('got post body for webhook api', req.body);
  // process incoming webhook
  // fetch resource from samsara
  webhookToCoords(req.body)
    .then(function(data) {
      // sync to in-memory store
      vehicles[data.serial] = data;
      // emit gps update locally
      eventEmitter.emit('update', data);
      res.status(200).send('thanks')
    })
    .catch(function(err){
      res.status(500).send(err);
    })
})

app.use('/', express.static('./public'));

io.on('connection', function (socket) {
  eventEmitter.on('update', (data) => {
    try {
      event = vehicleData(data.serial);
      socket.emit(`update`, event);
      socket.emit(`update:${data.serial}`, event);
    } catch(e) {
      console.error(`no data found for ${data.serial}`);
    }
  })
});

function serialClean(serial) {
  return _.lowerCase(_.camelCase(serial));
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



