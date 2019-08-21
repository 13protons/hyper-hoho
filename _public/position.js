function Locator(afterFix, update) {
  if (typeof(afterFix) !== 'function') {
    // turn non-function values into noop
    afterFix = function(){};
  }
  if (typeof (update) !== 'function') {
    // turn non-function values into noop
    update = function () { };
  }

  var options = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  }

  function error(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`);
  }
  navigator.geolocation.getCurrentPosition(function(pos){
    console.log('got first position');
    afterFix(pos.coords);
    navigator.geolocation.watchPosition(function(pos) {
      console.log('after watching position');
      update(pos.coords);
    }, error, options);
  }, error, options); 
}
