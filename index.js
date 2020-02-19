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
const updateHandlers = {}

let sockets = {};

server.listen(PORT);

io.of((name, query, next) => {
  console.log('got a dynamic client connecting to...', name);
  getConfig(eventIDForNamespace(name)).then((data) => {
    console.log('event id ok - forwarding to connection handler');
    next(null, true);
  })
  .catch((err)=>{
    console.log('bad event id', err);
    next(null, false);
  })
}).on('connect', (socket) => {
  console.log('after socket connect', socket.nsp.name);
  updateVehicleLocations(socket.nsp.name)

  socket.on('disconnect', (reason) => {
    console.log(`disconnecting from ${socket.nsp.name} due to: ${reason}`)
    socket.nsp.clients((error, clients) => {
      if (error) throw error;
      if (!clients.length) {
        console.log(`no more connection for ${socket.nsp.name} - clearing interval`)
        clearInterval(updateHandlers[socket.nsp.name]);
      }
      console.log(clients); // => [PZDoMHjiu8PYfRiKAAAF, Anw2LatarvGVVXEIAAAD]
    });
  })
})


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
      event: _.pick(data, ['description', 'title', 'eventID', 'icons'])
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
});

app.use('/', express.static('./dist'));

function updateVehicleLocations(name) {
  if (updateHandlers[name]) { return; }
  console.log('watching vehicles for ', name);
  const eventID = eventIDForNamespace(name);

  const updatr = _.throttle(function(updates) {
    const nsp = io.of(name);
    console.log('sending updates to ', name)
    updates.forEach((item) => {
      // broadcast most recent ones
      nsp.emit('vehicleUpdate', item);
    });
  }, 5000, { 'trailing': true });
  
  updateHandlers[name] = setInterval(function() {
    assetLocations(eventID)
      .then(updatr)
      .catch(((err) => {
        console.log('No device updates for id', eventID, err);
      }));
  }, 5000);
}

function eventIDForNamespace(str) {
  return str.replace(/\//g, '');
}