'use strict';

const chalk = require('chalk');
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
}

// Log with tag
Util.logWith = function(tag, args) {
  console.log.apply(null, ['\n[' + tag + ']'].concat(Object.keys(args).map(i => args[i])));
}

// Action log
Util.logA = function() {
  Util.logWith(chalk.blue('ACTION'), arguments);
}

// Scheduler log
Util.logS = function() {
  Util.logWith(chalk.magenta('SCHEDULER'), arguments);
}

Util.error = function(error) {
  console.error('[' + chalk.red('ERROR') + ']', chalk.red(error.header));
  if(error.header === 'Login failed') {
    console.error(chalk.red('Response:', error.response.headers));
  } else if(error.header === 'Item not found') {
    console.error(chalk.red('Item:', error.item));
  } else if(error.header === 'No match') {
    console.error(chalk.red('HTML:', error.html));
  }
  // Close app if fatal error
  if(error.fatal) {
    process.exit(1);
  }
}

Util.loadConfig = function(file) {
  const filepath = '../config/' + file + '.json';
  console.log('Loading config from', filepath.substr(2));
  return require(filepath);
}

module.exports = Util;