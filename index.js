const express = require('express');
const _ = require('lodash');
const cookiesMiddleware = require('universal-cookie-express');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const getConfig = require('./lib/getConfig');
const timeBounds = require('./lib/timeBounds');
const assetLocations = require('./lib/fetchAssetLocation');

const dataLayers = require('./lib/dataLayers');

const PORT = process.env.PORT || 3030;
const vehicles = [];

server.listen(PORT);

app
  .use(cookiesMiddleware())
  .use(function (req, res, next) {
    const eventID = _.get(req, 'query.e', null);
    if (!_.isNull(eventID)) {
      console.log('event id', eventID);
      // console.log('session: ', req.session);
      req.universalCookies.set('eventID', eventID, {
        path: '/',
        httpOnly: true,
        sameSite: true
      });
    }
    next();
  });

app.get('/api/layers', dataLayers);

app.get('/api/status', (req, res) => {
  getConfig(req.universalCookies.get('eventID')).then((data) => {
    try {
      if (timeBounds(data.schedule)) {
        res.json({
          status: 'running',
          running: true,
          vehicles
        });
      } else if (process.env.FAKE_VEHICLE) {
        res.json({
          status: 'running',
          running: true,
          vehicles: [{
            name: 'Jim Dandy',
            longitude: -83.045833,
            latitude: 42.331389
          }]
        });
      } 
    } catch(e) {
      res.json({
        status: 'out of service',
        running: false,
      });
    }
  });
});

app.use('/', express.static('./dist'));



let listener;

io.on('connection', (socket) => {
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
    });
  });
});

function pollForLocation() {
  io.of('/').clients((err, clients) => {
    if (err) throw err;
    if (clients.length) {
      console.log(`${clients.length} clients connected`);
      // updateVehicleLocations();
    }
  });
}

function updateVehicleLocations() {
  getConfig().then((data) => {
    // console.log('config data', data);
    // in time window?
    if (timeBounds(data.schedule)) {
      // try to get locations (within last 10 min)
      assetLocations(data.org, data.devices)
        .then((updates) => {
          vehicles = _.uniqBy(vehicles.concat(updates), 'id');

          updates.forEach((item) => {
            // broadcast most recent ones
            io.emit('vehicleUpdate', item);
          });
        })
        .catch(((err) => {
          console.log('failed to get device info', err);
        }));
    } else {
      listener = setTimeout(pollForLocation, 1000 * 60);
    }
  });
}

if (process.env.FAKE_VEHICLE) {
  const turf = require('@turf/turf');

  nextPoint([-83.045833, 42.331389]);

  function nextPoint(origin) {
    io.emit('vehicleUpdate', {
      name: 'Jim Dandy',
      longitude: origin[0],
      latitude: origin[1]
    });
    setTimeout(() => {
      const center = origin;
      const radius = 0.1; 
      const options = { steps: 10, units: 'kilometers', properties: { foo: 'bar' } };
      const circle = turf.circle(center, radius, options);

      const bbox = turf.bbox(circle);
      const position = turf.randomPosition(bbox);
      nextPoint(position);
    }, 5000);
  }
}
