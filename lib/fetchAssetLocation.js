const rp = require('request-promise');
const _ = require('lodash');
const moment = require('moment');

const getConfig = require('./getConfig');
const getStatus = require('./getStatus');

const NodeCache = require("node-cache");
const vehicles = new NodeCache({
  stdTTL: 4
});

const FAKE_ID = 'FAKE_FAKE';

let turf;

const getNextFakePoint = (function () {
  let origin = [-83.045833, 42.331389]
  return function () {
    if (!turf) {
      turf = require('@turf/turf');
    }

    const radius = 0.1;
    const options = {
      steps: 10,
      units: 'kilometers',
      properties: { foo: 'bar' }
    };

    const circle = turf.circle(origin, radius, options);

    const bbox = turf.bbox(circle);
    origin = turf.randomPosition(bbox);
    return origin;
  }
})()

module.exports = function (eventID) {
  return getConfig(eventID).then((data) => {
    let status = getStatus(data);
    if (!status.running) {
      throw new Error(status.message);
    }

    return Promise.all(data.vehicles.map((item)=>{
      const aVehicle = vehicles.get(item.id);
      if (_.isUndefined(aVehicle)) { 
        // rebuild cache for item and return it
        if (item.id === FAKE_ID) {
          const origin = getNextFakePoint();
          const fakeVehicle = _.assign(item, {
            longitude: origin[0],
            latitude: origin[1]
          });
          vehicles.set(item.id, fakeVehicle);
          return Promise.resolve(fakeVehicle);
        }

        return fetchDevice(item)
          .then((result)=>{
            // console.log('result of fetching new vehicle data', result);
            vehicles.set(item.id, result);
            return result;
          })
      }
      return Promise.resolve(aVehicle);
    }));
  });

  function fetchDevice(item) {
    let now = moment();

    var options = {
      uri: `https://api.samsara.com/v1/fleet/assets/${item.id}/locations`,
      qs: {
        groupId: process.env.SAMSARA_ORDID,
        endMs: now.valueOf(),
        startMs: now.subtract({ minutes: 10 }).valueOf()
      },
      headers: {
        'Authorization': `Bearer ${process.env.SAMSARA_TOKEN}`
      },
      json: true // Automatically parses the JSON string in the response
    };

    return rp(options)
      .then(function (data) {
        return _.assign(
          item,
          _.get(data, 'locations[0]')
        );
      });
  }
}



// {
//   "locations": [
//     {
//       "latitude": 42.32744398,
//       "location": "Bagley Street, Detroit, MI",
//       "longitude": -83.07234375,
//       "speedMilesPerHour": 0.6260240197248071,
//       "time": 1565177616060
//     }
//   ]
// }

// got a post. data: 
// const eventData = {
//   eventId: '65232802-c8c7-4cd4-80e7-a211ea2d7e94',
//   eventMs: 1565177665428,
//   eventType: 'Alert',
//   event:
//   {
//     alertEventUrl:
//       'https://cloud.samsara.com/o/2554/groups/3368/alerts/incidents/v2/17027/1/212014918110840/1565177616060',
//     alertConditionDescription: 'Vehicle movement',
//     alertConditionId: 'DeviceMovement',
//     details: '\'Dr. Sweet \' is moving.',
//     device:
//     {
//       id: 212014918110840,
//       name: 'Dr. Sweet ',
//       serial: 'GCWYNM9BHC',
//       vin: '4UZAAXDC45CN05569'
//     },
//     orgId: 2554,
//     resolved: false,
//     startMs: 1565177616060,
//     summary: '\'Dr. Sweet \' is moving.'
//   }
// } 