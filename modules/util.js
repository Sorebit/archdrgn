'use strict';

const Util = function() {}

// Prepend '0' if @a is less than @lt
Util.prepZero = function(a, lt) {
  if(!isNaN(a) && a < lt)
    return '0' + a.toString();
  return a.toString();
}

// Date / time string (DD/MM HH:MM:SS)
Util.dateTime = function(d) {
  const date = Util.prepZero(d.getDate(), 10);
  const month = Util.prepZero(d.getMonth() + 1, 10);
  const hour = Util.prepZero(d.getHours(), 10);
  const minute = Util.prepZero(d.getMinutes(), 10);
  const second = Util.prepZero(d.getSeconds(), 10);
  return date + '/' + month + ' ' + hour + ':' + minute + ':' + second;
};

Util.log = function(level) {
  let text = Array(level * 4).join(' ').replace(' ', '-');
  for(let i = 1; i < arguments.length; i++) {
    text += ' ' + arguments[i];
  }
  console.log(text);
  // Just because this is very serious
  // console.log.apply(null, [Array(level * 4).join(' ').replace(' ', '-')].concat(Object.keys(arguments).map(i => (i == 0 ? '' : arguments[i]))));
}

Util.logA = function() {
  // let text = '';
  // for(let i = 0; i < arguments.length; i++) {
  //   text += (i != 0 ? ' ' : '')  + arguments[i];
  // }
  // Just because I can
  console.log.apply(null, ['\n[ACTION]'].concat(Object.keys(arguments).map(i => arguments[i])));
}

Util.loadConfig = function(file) {
  const filepath = '../config/' + file + '.json';
  console.log('Loading config from', filepath.substr(2));
  return require(filepath);
}

module.exports = Util;