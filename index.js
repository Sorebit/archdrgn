'use strict';

// Load config
const configFile = (process.argv.length > 2) ? process.argv[2] : './config.json';
console.log('Loading config from', configFile);
const config = require(configFile);
const locations = require('./knowledge/locations.json');
// Modules and classes
const Net = require('./modules/net');
const ActionQueue = require('./modules/actionqueue');
const queue = new ActionQueue();
const EventEmitter = require('events');
const { JSDOM } = require('jsdom');
const Util = require('./modules/util');
// Bot event handler
const eventHandler = new EventEmitter();
let lastGold = null;

function login() {
  console.log('\n[ACTION] Logging in to', config.user.login);
  const user = { login: config.user.login, password: config.user.password };
  Net.post({ path: '/index.php?c=login&a=login', data: user }, (response) => {
    // Check if logged in (succesful login redirects to /map/index.html)
    if(response.headers['location'] === '/map/index.html') {
      // Store cookie
      Net.cookie = response.headers['set-cookie'];
      eventHandler.emit('loginSuccess');
    } else {
      eventHandler.emit('error', { header: 'Login failed', response: response });
    }
    // Tell handler that current action has been completed
    queue.complete();
  });
}

function refresh() {
  console.log('\n[ACTION] Refreshing');
  Net.get({ path: '/index.php' }, (response) => {
    queue.complete();
  });
}

function gold() {
  console.log('\n[ACTION] Requesting gold');
  Util.log(1, 'Last gold received:', lastGold);
  Net.get({ path: '/index.php?c=build&a=collect&place=1' }, (response) => {
    Net.get({ path: '/' + response.headers['location'] }, (response, html) => {
      const dom = new JSDOM(html);
      const msg = dom.window.document.getElementById('messageBar');
      const goldValue = dom.window.document.getElementById('index-gold-value');
      if(msg) {
        Util.log(1, 'Action message:', msg.children[0].textContent);
        // If success, save time
        if(msg.children[0].textContent === '20 gold recieved!') {
          lastGold = new Date();
          Util.log(2, 'Saving latest gold time', Util.dateTime(lastGold));
        }
      } else {
        Util.log(1, 'No action message');
      }
      if(goldValue) {
        Util.log(1, 'Current gold:', goldValue.textContent.match(/[0-9]+/)[0]);
      } else {
        Util.log(1, 'Gold not found in render');
      }
      
      const next = new Date();
      const add = lastGold ? 61 * 60 : Math.ceil(config.goldInterval * 60);
      next.setSeconds(next.getSeconds() + add);
      console.log('[SCHEDULER] Next gold:', Util.dateTime(next));
      setTimeout(() => queue.push(gold), add * 1000);

      // Tell handler that current action has been completed
      queue.complete();
    });
  });
}

function levelUpDragon(id)
{
  console.log('\n[ACTION] Trying to level up dragon', id);
  const path = '/index.php?mode=ajax&c=dragons&a=levelUp&dragonId=' + id + '&mode=noItem"';
  Net.post({ path: path, type: 'json' }, (res, data) => {
    data = JSON.parse(data);
    let text = "";
    if(data.error != "NONE") {
      text = data.error;
    } else {
      text = data.text;
    }
    Util.log(1, 'Leveling result:', text);

    const next = new Date();
    next.setSeconds(next.getSeconds() + Math.ceil(config.levelInterval * 60));
    console.log('[SCHEDULER] Next level:', Util.dateTime(next));
    // Tell handler that current action has been completed
    queue.complete();
  });
}

function quest(dragon, place, hours) {
  console.log('\n[ACTION] Trying to send dragon', dragon, 'on quest', place, 'for', hours, 'hours');
  const data = { "dragon": dragon, "hours": (60 * hours), "place": place };
  Net.post({ path: '/index.php?c=quests&a=send', data: data }, (res, html) => {
    // console.log(res.headers);
    // console.log(html);
    // Tell handler that current action has been completed
    queue.complete();
  });
}

function setupQuests() {
  // For each dragon look for different item
  console.log('\nSetting up quests');
  for(let i = 0; i < config.user.items.length && i < config.user.dragons.length; i++) {
    Util.log(1, 'Dragon', config.user.dragons[i], 'Looking for', config.user.items[i]);
    // Look for item
    let found = false;
    for(let location in locations) {
      if(locations[location].items.indexOf(config.user.items[i]) >= 0) {
        Util.log(2, 'Will be send to', '(' + locations[location].id + ')', location);
        queue.push(quest, [config.user.dragons[i], locations[location].id, 12]);
        found = true;
        break;
      }
    }
    if(!found) {
      const error = { header: 'Item not found', item: config.user.items[i] };
      eventHandler.emit('error', error);
    }
  } 
}

// Great recursive fishing method
// I basically can't test it because a user can fish 4 times a day
function fishing(points) {
  console.log('\n[ACTION] Trying to fish');
  const data = { fish: "at the age old pond - a frog leaps into water - a deep resonance" };
  Net.post({ path: '/map/fishing.html', data: data }, (res, html) => {
    let data = {};
    // === TEST ME ===
    if(html.indexOf('Undefined offset: 0') >= 0) {
      // Nothing catched, process error
      const match = html.match(/{.*}/);
      if(match) {
        console.log('GOOD MATCH', data);
        data = JSON.parse(match[0]);
      } else {
        console.log('NO MATCH, UH', html);
      }
    }
    // ===============
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
      console.log('There are still plenty of fish to catch...');
      queue.push(fishing);
    }
    // Tell handler that current action has been completed
    queue.complete();
  });
}

// Main logic
queue.push(login);

eventHandler.on('loginSuccess', () => {
  // Login successful, proceed to main loop
  Util.log(1, 'Login successful');
  Util.log(1, 'Cookie:', Net.cookie, '\n');

  console.log('[SCHEDULER] Gold interval:', config.goldInterval, 'min (' + Math.ceil(config.goldInterval * 60), 's)');
  console.log('[SCHEDULER] Level interval:', config.levelInterval, 'min (' + Math.ceil(config.levelInterval * 60), 's)');
  console.log('[SCHEDULER] Refresh interval:', config.refreshInterval, 'min (' + Math.ceil(config.refreshInterval * 60), 's)');

  // Setup refresh schedule
  let refreshInt = setInterval(() => {
    queue.push(refresh);
  }, config.refreshInterval * 60 * 1000);

  // Setup gold schedule
  queue.push(gold);

  // Setup leveling schedule
  let levelInt = setInterval(() => {
    for(let id in config.user.dragons) {
      queue.push(levelUpDragon, [config.user.dragons[id]]);
    }
  }, config.levelInterval * 60 * 1000);

  // Setup quests once
  setupQuests();
  // Setup fishing once
  queue.push(fishing);
});

eventHandler.on('error', (error) => {
  console.error('[ERROR]', error.header);
  if(error.header === 'Login failed') {
    console.log('Response:', error.response.headers);
  } else if(error.header === 'Item not found') {
    console.log('Item:', error.item);
  }
  // Close app
  process.exit(1);
});