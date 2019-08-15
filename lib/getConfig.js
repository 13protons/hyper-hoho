const base = require('airtable').base('appRV0O2xc6xPBD8N');


Promise.all([
  allTableRows('org'),
  allTableRows('activeDevices'),
  allTableRows('schedule')
]).then((data)=>{
  return {
    org: data[0][0],
    devices: data[1].filter((item)=>item.track),
    schedule: data[2].filter((item)=>item.active)
  }
}).then((data)=>{
  console.log(new Date());
  console.log('all data for this base: ');
  console.log(data);
});

function allTableRows(tableName) {
  return new Promise(function (resolve, reject) {
    base(tableName).select({
      view: "Grid view"
    }).firstPage(function (err, records) {
      if (err) {
        console.error(err);
        return reject(err);
      }
      resolve(records.map((record) => record.fields));
    });
  });
}