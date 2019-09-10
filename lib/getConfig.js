const base = require('airtable').base('appRV0O2xc6xPBD8N');
const _ = require('lodash');

let cache = {
  data: undefined,
  ttl: 1000 * 60 * 10,
  updated: 0
}

module.exports = function() {
  if (Date.now() - cache.updated < cache.ttl) {
    console.log('returning from cache');
    return Promise.resolve(cache.data);
  }

  return Promise.all([
    allTableRows('org'),
    allTableRows('activeDevices'),
    allTableRows('schedule'),
    allTableRows('route')
  ]).then((data)=>{
    return {
      org: data[0][0],
      devices: data[1].filter((item)=>item.track),
      schedule: processSchedules(data[2]),
      route: getLatest(data[3])
    }
  }).then((data)=> {
    console.log('all data for this base: ');
    console.log(JSON.stringify(data));

    cache.data = data;
    cache.updated = Date.now();

    return data;
  });
}

function getLatest(routes) {
  return _.chain(routes)
    .map((item)=>{
      let date = new Date(_.get(item, 'updated', 0));
      item.updated = date.getTime()
      return item;
    })
    .sortBy(['updated'])
    .reverse()
    .first()
    .value();
}

function processSchedules(items) {
  return items.filter((item)=>item.active).map((item)=>{
    return {
      endSharing: new Date(item.endSharing),
      startSharing: new Date(item.startSharing)
    };
  })
}

function allTableRows(tableName) {
  return new Promise(function (resolve, reject) {
    // delay table request on purpose to avoid rate limits in scaled dyno environments
    setTimeout(function(){
      base(tableName).select({
        maxRecords: 20,
        view: "Grid view"
      }).firstPage(function (err, records) {
        if (err) {
          console.error(err);
          return reject(err);
        }
        resolve(records.map((record) => record.fields));
      });
    }, Math.floor(Math.random() * 2000));
  });
}