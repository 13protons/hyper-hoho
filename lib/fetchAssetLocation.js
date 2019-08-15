const rp = require('request-promise');
const _ = require('lodash');

module.exports = function(webHookData) {
  let alertType = _.get(webHookData, 'event.alertConditionId', '');
  if (alertType !== 'DeviceMovement') {
    return Promise.reject('Can only handle `DeviceMovement` events at this time.');
  }

  let deviceId = _.get(webHookData, 'event.device.id');

  var options = {
    uri: `https://api.samsara.com/v1/fleet/assets/${deviceId}/locations`,
    qs: {
      groupId: _.get(webHookData, 'event.orgId'),
      endMs: parseInt(_.get(webHookData, 'event.startMs')) + 1000,
      startMs: parseInt(_.get(webHookData, 'event.startMs')) - 1000
    },
    headers: {
      'Authorization': `Bearer ${process.env.SAMSARA_TOKEN}`
    },
    json: true // Automatically parses the JSON string in the response
  };

  return rp(options)
    .then(function (data) {
      return _.assign(
                _.get(webHookData, 'event.device'), 
                _.get(data, 'locations[0]')
              );
    })
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