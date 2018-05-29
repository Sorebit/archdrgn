const Util = function() {}

// Prepend '0' if @a is less than @lt
Util.prepZero = function(a, lt) {
  if(!isNaN(a) && a < lt)
    return '0' + a.toString();
  return a.toString();
}

// Date / time string (DD/MM HH:MM:SS)
Util.dateTime = function() {
  var d = new Date(Date.now() + 1*60*60*1000);
  var date = Util.prepZero(d.getDate(), 10);
  var month = Util.prepZero(d.getUTCMonth() + 1, 10);
  var hour = Util.prepZero(d.getUTCHours(), 10);
  var minute = Util.prepZero(d.getUTCMinutes(), 10);
  var second = Util.prepZero(d.getUTCSeconds(), 10);
  return date + '/' + month + ' ' + hour + ':' + minute + ':' + second;
};

module.exports = Util;