// Load config
const configFile = (process.argv.length > 2) ? process.argv[2] : './config.json';
console.log('Loading config from', configFile);
const config = require(configFile);
const locations = require('./knowledge/locations.json');
// Modules and classes
const Net = require('./modules/net')
const EventEmitter = require('events');
const { JSDOM } = require('jsdom');
const Util = require('./modules/util');
// Bot event handler
const eventHandler = new EventEmitter();
// Global cookie
let cookie = undefined;

// Action queue idea
// Push actions to queue and when pushed check if there is currently an action ongoing
// If Empty just do it
// When finishing an action finish a promise which triggers next action

function login() {
  console.log('[ACTION] Logging in to', config.user.login);
  const user = { login: config.user.login, password: config.user.password };
  Net.post('/index.php?c=login&a=login', { data: user }, (response) => {
    // Check if logged in (succesful login redirects to /map/index.html)
    if(response.headers['location'] === '/map/index.html') {
      // Store cookie
      cookie = response.headers['set-cookie'];
      eventHandler.emit('loginSuccess');
    } else {
      eventHandler.emit('error', { header: 'Login failed', response: response });
    }
  });
}

function gold() {
  console.log('[ACTION] Requesting gold');
  Net.get('/index.php?c=build&a=collect&place=1', { cookie: cookie }, (response) => {
    Net.get('/' + response.headers['location'], { cookie: cookie }, (response, html) => {
      const dom = new JSDOM(html);
      const msg = dom.window.document.getElementById('messageBar');
      const goldValue = dom.window.document.getElementById('index-gold-value');
      if(msg) {
        console.log('Action message:', msg.children[0].textContent);
      } else {
        console.log('No action message');
      }
      if(goldValue) {
        console.log('>> Current gold:', goldValue.textContent.match(/[0-9]+/)[0]);
      } else {
        console.log('Gold not found in render');
      }
      const next = new Date();
      next.setSeconds(next.getSeconds() + Math.ceil(config.goldInterval * 60));
      console.log('[SCHEDULER] Next gold  :', Util.dateTime(next), '\n');

    });
  });
}

function levelUpDragon(id)
{
  console.log('[ACTION] Trying to level up dragon', id);
  const path = '/index.php?mode=ajax&c=dragons&a=levelUp&dragonId=' + id + '&mode=noItem"';
  Net.post(path, { cookie: cookie, type: 'json' }, (res, data) => {
    data = JSON.parse(data);
    console.log('Level up data:', data);
    const next = new Date();
    next.setSeconds(next.getSeconds() + Math.ceil(config.levelInterval * 60));
    console.log('[SCHEDULER] Next level :', Util.dateTime(next), '\n');
  });
}

function quest(dragon, place, hours) {
  console.log('[ACTION] Trying to send dragon', dragon, 'on quest', place, 'for', hours, 'hours');
  const data = { "dragon": dragon, "hours": (60 * hours), "place": place };
  Net.post('/index.php?c=quests&a=send', { cookie: cookie, data: data }, (res, html) => {
    console.log(res.headers);
    console.log(html);
  });
}

function setupQuests() {
  // For each dragon look for different item
  for(let i = 0; i < config.user.items.length && i < config.user.dragons.length; i++) {
    console.log('For dragon', config.user.dragons[i]);
    console.log('Looking for', config.user.items[i]);
    // Look for item
    let found = false;
    for(let location in locations) {
      if(locations[location].items.indexOf(config.user.items[i]) >= 0) {
        console.log('Found in', location);
        quest(config.user.dragons[i], locations[location].id, 12, cookie);
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

// Main logic
login();

eventHandler.on('loginSuccess', () => {
  // Login successful, proceed to main loop
  console.log('Login successful');
  console.log('Cookie:', cookie, '\n');

  console.log('[SCHEDULER] Gold interval:', config.goldInterval, 'min (' + Math.ceil(config.goldInterval * 60), 's)');
  console.log('[SCHEDULER] Level interval:', config.levelInterval, 'min (' + Math.ceil(config.levelInterval * 60), 's)');

  let goldInt = setInterval(() => {
    eventHandler.emit('gold');
  }, config.goldInterval * 60 * 1000);

  let levelInt = setInterval(() => {
    eventHandler.emit('levelUp');
  }, config.levelInterval * 60 * 1000);

  setupQuests();
});

eventHandler.on('gold', () => {
  gold();
});

eventHandler.on('levelUp', () => {
  for(let id in config.user.dragons) {
    levelUpDragon(config.user.dragons[id]);
  }
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
