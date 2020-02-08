const util = require('util');

const express = require('express');
const _ = require('lodash');
const cookiesMiddleware = require('universal-cookie-express');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const getConfig = require('./lib/getConfig');
const getStatus = require('./lib/getStatus');
const assetLocations = require('./lib/fetchAssetLocation');

const dataLayers = require('./lib/dataLayers');

const PORT = process.env.PORT || 3030;
const vehicles = [];

const sockets = {};

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
  const eventID = req.universalCookies.get('eventID');
  getConfig(eventID).then((data) => {
    // console.log(`data for ${eventID}`, data);

    res.json({
      status: getStatus(data),
      event: _.pick(data, ['description', 'title', 'eventID'])
    });
  })
  .catch((err)=>{
    console.log('bad status request', err);
    res.json({
      status: {
        running: false,
        message: err
      },
      event: undefined
    })
  })

  if (eventID && !sockets.eventID) {
    const nsp = io.of(`/${eventID}`);
    _.set(sockets, eventID, nsp);
    nsp.on('connection', (socket) => {
      console.log(`there's a guest in the ${eventID} room.`)
      nsp.clients((err, clients) => {
        if (!err) { console.log(`there are now ${clients.length} clients`); }
      });
      updateVehicleLocations(eventID)

      socket.on('disconnect', (reason) => {
        console.log(`disconnected because of`, reason)
        nsp.clients((err, clients) => {
          if (err) throw err;
          if (!clients.length) {
            console.log(`no more clients in ${eventID}`);
            _.unset(sockets, eventID);
          }
        });
      });

    })
  }
});

app.use('/', express.static('./dist'));


// let listener;

// io.on('connection', (socket) => {
//   // ensure polling
//   // console.log(util.inspect(socket, {colors: true, depth: 4}));
//   if (!listener) {
//     console.log('setup polling!');
//     pollForLocation();
//     listener = setTimeout(pollForLocation, 5000);
//   }

//   socket.on('disconnect', (reason) => {
//     io.of('/').clients((err, clients) => {
//       if (err) throw err;
//       if (!clients.length) {
//         console.log('no more clients');
//         listener = undefined;
//       }
//     });
//   });
// });

// function pollForLocation() {
//   io.of('/').clients((err, clients) => {
//     if (err) throw err;
//     if (clients.length) {
//       console.log(`${clients.length} clients connected`);
//       // updateVehicleLocations();
//     }
//   });
// }

function updateVehicleLocations(eventID) {
  assetLocations(eventID)
    .then((updates) => {
      const nsp = _.get(sockets, eventID)
      updates.forEach((item) => {
        // broadcast most recent ones
        nsp.emit('vehicleUpdate', item);
      });
      setTimeout(updateVehicleLocations.bind(null, eventID), 5000);
    })
    .catch(((err) => {
      console.log('No device updates for id', eventID, err);
    }));
}
