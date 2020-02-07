const getConfig = require('./getConfig');
const rp = require('request-promise');
const _ = require('lodash');
const fromKml = require('./fromKml')

const NodeCache = require("node-cache");
const processed = new NodeCache();
const ttl = 60 * 60; //on hour

module.exports = getLayers;

let lastUpdated;
let lastData;

function getLayers(req, res, next) {
  const eventID = req.universalCookies.get('eventID');
  let data = processed.get(`route_${eventID}`);
  if (!_.isUndefined(data)) {
    res.json(data);
  }
  
  getConfig(eventID).then((data) => {
    let url = _.get(data, 'route[0].Attachments[0].url');
    rp(url)
      .then((result) => {
        console.log('results of fetch', result);
        const route = fromKml(result);
        processed.set(`route_${eventID}`, route, ttl)
        res.json(route);
      })
      .catch((e) => {
        res.status(500).send(e);
      });
  })

}