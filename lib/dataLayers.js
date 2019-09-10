const getConfig = require('./getConfig');
const rp = require('request-promise');
const _ = require('lodash');
const fromKml = require('./fromKml')

module.exports = getLayers;

let lastUpdated;
let lastData;

function getLayers(req, res, next) {
  getConfig().then((data) => {
    if (data.route) {
      // mem cache
      if (data.route.updated == lastUpdated && lastData) {
        return res.json(lastData);
      }

      let url = _.get(data, 'route.Attachments[0].url');
      rp(url)
        .then((result)=>{
          console.log('results of fetch', result);
          lastData = fromKml(result);
          lastUpdated = data.route.updated;
          res.json(lastData);
        })
        .catch((e)=>{
          res.status(500).send(e);
        })     
    }
  })
}