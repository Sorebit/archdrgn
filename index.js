'use strict';

// Modules and classes
const EventEmitter = require('events');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const Net = require('./modules/net');
const ActionQueue = require('./modules/actionqueue');
const Util = require('./modules/util');
const eventHandler = new EventEmitter();
const queue = new ActionQueue();

// Load configs
if(process.argv.length <= 2) {
  Util.error({header: 'No username specified', fatal: true });
  process.exit(1);
}
const username = process.argv[2];
const config = Util.loadConfig('users/' + username);
config.locations = Util.loadConfig('locations');

// Scheduler setup
let scheduler = {
  lastGold: null,
  lastLevel: {}
};

const currentY = 10;
let questTimes = [];

function schedulerSetup() {    
  const filepath = './config/schedule/' + username + '.json';
  // Check if schedule file exists
  if(fs.existsSync(filepath)) {
    Util.logS('Scheduler file present');
    scheduler = Util.loadConfig('schedule/' + username);
    queue.complete();
  } else {
    Util.logS('Creating new scheduler file');
    updateScheduleFile();
  }
}

function updateScheduleFile() {
  const filepath = './config/schedule/' + username + '.json';
  fs.writeFile(filepath, JSON.stringify(scheduler), (error) => {
    if(error) {
      throw error;
    }
    Util.logS('File write successful');
    queue.complete();
  });
}

// Login and keep cookie for later requests
function login() {
  Util.logA('Logging in to', config.user.login);
  const user = { login: config.user.login, password: config.user.password };
  Net.post({ path: '/index.php?c=login&a=login', data: user }, (response) => {
    // Check if logged in (succesful login redirects to /map/index.html)
    if(response.headers['location'] === '/map/index.html') {
      // Store cookie
      Net.cookie = response.headers['set-cookie'];
      eventHandler.emit('loginSuccess');
    } else {
      Util.error({ header: 'Login failed', response: response, fatal: true});
    }
    // Tell handler that current action has been completed
    queue.complete();
  });
}

// Refresh by requesting index
function refresh() {
  Util.logA('Refreshing');
  Net.get({ path: '/index.php' }, (response) => {
    queue.complete();
  });
}

// Gold requesting and scheduling
function gold() {
  Util.logA('Trying to dig gold');
  Util.log(1, 'Last gold received:', scheduler.lastGold);
  Net.get({ path: '/index.php?c=build&a=collect&place=1' }, (response) => {
    Net.get({ path: '/' + response.headers['location'] }, (response, html) => {
      // Find gold value element
      const dom = new JSDOM(html);
      const msg = dom.window.document.getElementById('messageBar');
      const goldValue = dom.window.document.getElementById('index-gold-value');
      if(msg) {
        Util.log(1, 'Action message:', msg.children[0].textContent);
        // If success, keep time
        if(msg.children[0].textContent === '20 gold recieved!') {
          scheduler.lastGold = new Date();
          Util.log(2, 'Saving latest gold time', Util.dateTime(scheduler.lastGold));
          queue.push(updateScheduleFile);
        }
      } else {
        Util.log(1, 'No action message');
      }
      // Display user's current gold
      if(goldValue) {
        Util.log(1, 'Current gold:', goldValue.textContent.match(/[0-9]+/)[0]);
      } else {
        Util.log(1, 'Gold not found in render');
      }
      
      // If there was a successful gold request schedule next for next hour (+ 1 minute)
      // Otherwise use intervals.gold
      const next = new Date();
      const add = scheduler.lastGold ? 61 * 60 : Math.ceil(config.ints.gold * 60);
      next.setSeconds(next.getSeconds() + add);
      Util.logS('Next gold:', Util.dateTime(next));
      setTimeout(() => queue.push(gold), add * 1000);

      // Tell handler that current action has been completed
      queue.complete();
    });
  });
}

// Returns seconds left to next gold
function leftToGold(last) {
  const now = new Date();
  const sec = Math.round((now - last) / 1000);
  let left = 60 * 60 - sec;
  return left + 5;
}

// Level up dragon with specified id
// TODO: Use leveling result (error, text) to schedule levelling
function levelUpDragon(id)
{
  Util.logA('Trying to level up dragon', id);
  const path = '/index.php?mode=ajax&c=dragons&a=levelUp&dragonId=' + id + '&mode=noItem"';
  Net.post({ path: path, type: 'json' }, (res, data) => {
    data = JSON.parse(data);
    let text = "";
    if(data.error != "NONE") {
      text = data.error;
    } else {
      text = data.text;
    }
    // Util.log(1, 'Leveling result:', text);
    // By default use interval from config
    const next = new Date();
    let add = config.ints.level * 60;
    // Try to find level number in text
    let l = text.match(/[0-9]+/);
    if(l) {
      // If success, get first match
      l = l[0];
      Util.log(1, 'New level:', l);
      scheduler.lastLevel[id] = { date: new Date(), level: l };
      //Util.log(1, 'Last level for dragon', id + ':', Util.dateTime(scheduler.lastLevel[id]));
      queue.push(updateScheduleFile);
      if(config.user.fight) {
        queue.push(fight, [id]);
      }
      // Normally we add 16 hours and 5 seconds
      add = 16*60*60 + 5;
      if(l < 10) {
        // If level is below 10, we add 5 minutes and 5 seconds
        add = 5*60 + 5;
      }
    } else {
      Util.error({ header: 'Leveling not successful. Falling back to interval' });
      Util.log(1, text);
    }
    next.setSeconds(next.getSeconds() + Math.ceil(add));
    // Schedule next leveling for this dragon
    setTimeout(() => queue.push(levelUpDragon, [id]), add * 1000);
    Util.logS('Next leveling:', Util.dateTime(next));
    // Tell handler that current action has been completed
    queue.complete();
  });
}

function leftToLevel(record) {
  const now = new Date();
  const date = new Date(record.date);
  const sec = Math.round((now - date) / 1000);
  let left;
  if(record.level < 10) {
    left = 5*60 - sec;
  } else {
    left = 16*60*60 - sec;
  }
  return left + 5;
}

// Send specified dragon on specified quest for specified count of hours
// TODO: Figure out how to check if dragon was sucessfully sent on quest
function quest(dragon, place, hours) {
  Util.logA('Trying to send dragon', dragon, 'on quest', place, 'for', hours, 'hours');
  const data = { "dragon": dragon, "hours": (60 * hours), "place": place };
  Net.post({ path: '/index.php?c=quests&a=send', data: data }, (res, html) => {
    // console.log(res.headers);
    // console.log(html);
    // Tell handler that current action has been completed
    queue.complete();
  });
}

// Setup quests (find mission for items and send dragons)
function setupQuests() {
  // For each dragon look for different item
  Util.logS('Setting up quests');
  for(let i = 0; i < config.user.items.length && i < config.user.dragons.length; i++) {
    Util.log(1, 'Dragon', config.user.dragons[i], 'Looking for', config.user.items[i]);
    // Look for item
    let found = false;
    for(let location in config.locations) {
      if(config.locations[location].items.indexOf(config.user.items[i]) >= 0) {
        Util.log(2, 'Will be send to', '(' + config.locations[location].id + ')', location);
        queue.push(quest, [config.user.dragons[i], config.locations[location].id, 12]);
        found = true;
        break;
      }
    }
    if(!found) {
      const error = { header: 'Item not found', item: config.user.items[i] };
      Util.error(error);
    }
  } 
}

// Great recursive fishing method
// I basically can't test it because a user can fish 4 times a day
function fishing(points) {
  Util.logA('Trying to fish');
  const data = { fish: "at the age old pond - a frog leaps into water - a deep resonance" };
  Net.post({ path: '/map/fishing.html', data: data }, (res, html) => {
    let data = {};
    if(html.indexOf('Undefined offset: 0') >= 0) {
      // Nothing catched, process error
      const match = html.match(/{.*}/);
      if(match) {
        html = match[0];
      } else {
        Util.error({ header: 'No match', html: html });
      }
    }
    // 
    let text = "";
    data = JSON.parse(html);
    if(data.status === 'NO_POINTS') {
      text = 'You don\'t have any fishing points. Try again tomorrow!';
    } else {
      if(data.item == 0) {
       text = 'You haven\'t found anything!';
      } else {
        text = 'You have found an item: ' + data.item_name;
      }
    }
    Util.log(1, 'Fishing result:', text);
    Util.log(1, 'Points left:', data.points);
    // If there are still points left fish again
    if(data.points != 0) {
      queue.push(fishing);
    }
    // Tell handler that current action has been completed
    queue.complete();
  });
}

// Send selected dragon to fight selected monster untill exhausted
// The code is kind of dirty, but works
// Used for sending dragons after sucessful leveling
function fight(id, mid){
  Util.logA('Dragon', id, 'tries to fight monster', mid);
  Net.get({ path :'/fight/fight/battlemap/' + mid + '-0-' + id + '.html' }, (res, html) => {
    // console.log(html);
    const document = new JSDOM(html).window.document;
    let msg = document.getElementById('fight-div');
    if(msg) {
      msg = msg.getElementsByClassName('fight-row');
      msg = msg[msg.length - 1].getElementsByClassName('fight-damage')[0];
      // queue.push(fight, [id, mid]);
    } else {
      msg = document.getElementsByClassName('message-error')[0];
    }
    Util.log(1, 'Message:', msg.textContent);
    
    queue.complete();
  });
}

function map(id, x, y) {
  Net.get({ path: '/dragons/actionEnd/' + id + '.html' }, (res, html) => {
    Util.logA('Trying to send dragon', id, 'to x:', x, 'y:', y);
    const data = { "dragon": id, "x": x, "y": y };
    Net.post({ path: '/index.php?c=map&a=send', data: data }, (res, html) => {
      Net.get({ path: res.headers['location'] }, (response, html) => {
        // console.log(html);
        const document = new JSDOM(html).window.document;
        const msg = document.getElementsByClassName('barText')[0];
        if(msg) {
          Util.log(1, 'Message:', msg.textContent);
        } else {
          Util.error({ header: 'No message' });
        }
        // queue.setNext(getQuestTimes);
        queue.complete();
      });
    });
  });
}

// Returns seconds left to timestamp
function timeLeft(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const sec = Math.round((date - now) / 1000);
  return sec;
}

function getQuestTimes() {
  Util.logA('Updating quest times');
  Net.get({ path: '/map/index.html' }, (response, html) => {
    const document = new JSDOM(html).window.document;

    const stops = document.getElementById('index-dragonList').getElementsByTagName('tr');
    
    for(let i = 0; i < stops.length; i++) {
      const stop = stops[i].getElementsByClassName('countdown-stop');
      if(stop.length) {
        const timestamp = stop[0].textContent * 1000;
        questTimes[i] = timestamp;
        Util.log(1, i, '=>', Util.dateTime(new Date(timestamp)));
      }
    }
    queue.complete();
  }); 
}

// Single dragon map explorer
// Explores row y starting at column x 
function mapExplorer(index, x, y) {
  // Update quest times
  queue.push(getQuestTimes);
  // Try to explore
  queue.push(() => {
    Util.logA('Trying explore with dragon', config.user.dragons[index]);
    Util.log(1, 'x:', x);
    Util.log(1, 'line (y):', y);
    // If line finished, don't continue
    if(x < 0) {
      Util.error({ header: 'Dragon already explored this line' });
    } else if(!questTimes[index] || timeLeft(questTimes[index]) <= 0) {
      queue.push(map, [config.user.dragons[index], x, y, true]);
      queue.push(getQuestTimes);
      queue.push(() => {      
      // Shedule next coordinates
        Util.logS('Scheduling next exploration to', Util.dateTime(new Date(questTimes[index] + 5)));
        if(x < 27) {
          setTimeout(() => {
            queue.push(mapExplorer, [index, x + 1, y]);
          }, (timeLeft(questTimes[index]) + 5) * 1000);
        } else {
          Util.log(1, 'END OF LINE');
        }
        queue.complete();
      });
    } else {
      Util.error({ header: 'Dragon still on quest.' });
      // Shedule the same coordinates
      queue.push(() => {
        Util.logS('Scheduling next exploration to', Util.dateTime(new Date(questTimes[index] + 5)));
        if(x < 27) {
          setTimeout(() => {
            queue.push(mapExplorer, [index, x, y]);
          }, (timeLeft(questTimes[index]) + 5) * 1000);
        } else {
          Util.log(1, 'END OF LINE');
        }
        queue.complete();
      });
    }
    queue.complete();
  });
  queue.complete();
}

// Main logic
queue.push(schedulerSetup);
queue.push(login);

eventHandler.on('loginSuccess', () => {
  // Login successful, proceed to main loop
  Util.log(1, 'Login successful');
  Util.log(1, 'Cookie:', Net.cookie);

  Util.logS('Intervals:');
  Util.log(1, 'Gold:', config.ints.gold, 'min (' + Math.ceil(config.ints.gold * 60), 's)');
  Util.log(1, 'Level:', config.ints.level, 'min (' + Math.ceil(config.ints.level * 60), 's)');
  Util.log(1, 'Refresh:', config.ints.refresh, 'min (' + Math.ceil(config.ints.refresh * 60), 's)');

  // Setup refresh schedule
  let refreshInt = setInterval(() => {
    queue.push(refresh);
  }, config.ints.refresh * 60 * 1000);

  // Setup gold schedule
  if(scheduler.lastGold) {
    const last = new Date(scheduler.lastGold);
    Util.logS('Last gold', Util.dateTime(last));

    const left = leftToGold(last);
    const next = new Date();
    next.setSeconds(next.getSeconds() + left);
    Util.log(1, 'Next gold:', Util.dateTime(next));
    setTimeout(() => {
      queue.push(gold);
    }, left * 1000);
  } else {
    Util.logS('No record of last successful gold');
    Util.log(1, 'Next gold: now');
    queue.push(gold);
  }

  // Setup leveling schedule
  for(let i in config.user.dragons) {
    const id = config.user.dragons[i];
    if(scheduler.lastLevel[id]) {
      const left = leftToLevel(scheduler.lastLevel[id]);
      const next = new Date();
      const date = new Date(scheduler.lastLevel[id].date);
      const level = scheduler.lastLevel[id].level;
      next.setSeconds(next.getSeconds() + left);
      Util.logS('Dragon', id, 'had last leveling at', Util.dateTime(date), 'to level', level);
      Util.log(1, 'Next leveling:', Util.dateTime(next));
      setTimeout(() => {
        queue.push(levelUpDragon, [id]);
      }, left * 1000);
    } else {
      Util.logS('Dragon', id, 'has no record of leveling');
      Util.log(1, 'Next leveling: now');
      queue.push(levelUpDragon, [id]);
    }
  }

  // Setup quests once
  // setupQuests();
  // Setup fishing once
  queue.push(fishing);
  // for(let i = 0; i < 10; i++) {
  //   queue.push(fight, [config.user.dragons[3], 5]);
  // }
  // mapExplorer(0, 14, 12);
  // mapExplorer(1, 12, 13);
  // mapExplorer(2, 12, 14);
  // mapExplorer(3, 12, 15);
});
