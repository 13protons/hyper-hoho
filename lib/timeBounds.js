var moment = require('moment');

module.exports = function(scheduleList) {
  let now = moment();

  return !!scheduleList.find(function(item) {
    let start = moment(item.startSharing);
    let end = moment(item.endSharing);

    console.log(`start: ${start}, now: ${now}, end: ${end}`);
    return start.isBefore(now) && end.isAfter(now);
  })
}