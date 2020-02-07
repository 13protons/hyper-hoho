const base = require('airtable').base('appRV0O2xc6xPBD8N');
const _ = require('lodash');

const NodeCache = require("node-cache");

const marked = require('marked');
const sanitizeHtml = require('sanitize-html');

const tableName = process.env.AIRTABLE_MAIN_TABLE;

const configData = new NodeCache();
const ttl = 60 * 10;

module.exports = function(eventID) {
  if (eventID) {
    console.log('getting evnet data for ', eventID)
    return getEventById(eventID);
  }
  return Promise.reject('event id is required');
}

function getEventById(id) {
  let data = configData.get(`event_${id}`);
  if (_.isUndefined(data)) {
    console.log('......rebuilding event cache for ', id, '......');
    return getBaseData()
      .then((data)=>{
        const item = _.find(data, (item) => {
          return _.includes(item.urls, id)
        });
        if (_.isUndefined(item)) {
          throw new ReferenceError(`no events found with the ID '${id}'`);
        }
        return item;
      })
      .then((item)=>{
        return resolveLinkedItems(item).then((data)=>{
          configData.set(`event_${id}`, data, ttl);
          return data
        })
      })
  }
  return Promise.resolve(data);
}

function resolveLinkedItems(event) {
  console.log('..........resolving linked items in event...........')
  // get paths to everything that looks like a database id
  const idMap = _.reduce(event, (result, val, key)=>{
    if (_.isArray(val)) {
      _.forEach(val, (maybeKey, i)=>{
        if (isRecord(maybeKey)) {
          result.paths.push([key, i]);
          result.ids.push(maybeKey);
        }
      })
    }
    return result;
  }, {paths: [], ids: []});

  // lookup all linked records at once
  return Promise.all(idMap.ids.map(lookupRecord))
    .then((data)=>{
      let result = _.cloneDeep(event);
      // reapply fetched data to cloned object by path
      data.forEach((val, i)=>{
        _.set(result, idMap.paths[i], val);
      })
      return result;
    })
}

function getBaseData() {
  const ttl = 60 * 10;

  let data = configData.get('allEvents');
  if (_.isUndefined(data)) {
    console.log('......rebuilding base cache......');
    return allTableRows(tableName)
      .then(processEventSchedules)
      .then((data) => {
        configData.set('allEvents', data, ttl);
        return data;
      })
  }
  return Promise.resolve(data);
}

function processEventSchedules(items) {
  // console.log('processing event schedules', items);
  return _.chain(items)
    .map((item) => {
      // console.log('item', item);
      if (item.startSharing) {
        item.startSharing = new Date(item.startSharing);
      }
      if (item.endSharing) {
        item.endSharing = new Date(item.endSharing);
      }

      item.urls = _.compact([item.uid, _.get(item, 'vanityUrl', false)]);
      item.description = sanitizeHtml(marked(_.get(item, 'customerMessage', '')));
      item.title = _.trim(_.get(item, 'eventName', ''));
      
      return item;
    })
    .sortBy(['updated'])
    .value();  
}

function isRecord(str) {
  // looks something like: `recwPaF8ef6ajKQ36`
  if (!_.isString(str)) { return false; }

  console.log('is it a record?: ', str);
  const expr = /^(rec\S{8,32})$/;
  const results = str.match(expr);
  return !_.isNull(results);
}

function lookupRecord(id) {
  return new Promise(function (resolve, reject) {
    base(tableName).find(id, function(err, record) {
      if (err) {
        return reject(err);
      }
      return resolve(record.fields);
    })
  });
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