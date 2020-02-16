const moment = require('moment');
const _ = require('lodash');

const negativeMessage = {
  message: 'out of service',
  running: false
}

const positiveMessage = {
  message: 'busses are running',
  running: true
}

module.exports = function(data) {
  let now = moment();

  let start = moment(_.get(data, 'schedule.startSharing'), 0);
  let end = moment(_.get(data, 'schedule.endSharing'), 0);

  // console.log(`active: ${data.active}, start: ${start}, now: ${now}, end: ${end}`);

  if (data.active || (start.isBefore(now) && end.isAfter(now))) {
    return positiveMessage;
  }
  return negativeMessage;
}