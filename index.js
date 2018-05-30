// Load config
const configFile = (process.argv.length > 2) ? process.argv[2] : './config.json';
console.log('Loading config from', configFile);
const config = require(configFile);

const Net = require('./modules/net')
const EventEmitter = require('events');
const botEmmiter = new EventEmitter();
const { JSDOM } = require('jsdom');
const Util = require('./modules/util');

function login() {
  console.log('[ACTION] Logging in to', config.user.login);
  const user = { login: config.user.login, password: config.user.password };
  Net.post('/index.php?c=login&a=login', { data: user }, (res) => {
    // Check if logged in (succesful login redirects to /map/index.html)
    if(res.headers['location'] === '/map/index.html') {
      // Store cookie
      let cookie = res.headers['set-cookie'];
      botEmmiter.emit('loginSuccess', cookie);
    } else {
      botEmmiter.emit('error', { header: 'Login failed', response: res });
    }
  });
}

function gold(cookie) {
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
      next.setMinutes(next.getMinutes() + config.goldInterval);
      console.log('[SCHEDULER] Next gold  :', Util.dateTime(next), '\n');

    });
  });
}

function levelUpDragon(id, cookie)
{
  console.log('[ACTION] Trying to level up dragon', id);
  const path = '/index.php?mode=ajax&c=dragons&a=levelUp&dragonId=' + id + '&mode=noItem"';
  Net.post(path, { cookie: cookie, type: 'json' }, (response, data) => {
    data = JSON.parse(data);
    console.log('Level up data:', data);
    const next = new Date();
    next.setMinutes(next.getMinutes() + config.levelInterval);
    console.log('[SCHEDULER] Next level :', Util.dateTime(next), '\n');
  });
}

// Main logic
login();

botEmmiter.on('loginSuccess', (cookie) => {
  // Login successful, proceed to main loop
  console.log('Login successful');
  console.log('Cookie:', cookie, '\n');

  console.log('[SCHEDULER] Gold interval:', config.goldInterval, 'minutes');
  console.log('[SCHEDULER] Level interval:', config.levelInterval, 'minutes\n');

  let goldInt = setInterval(() => {
    botEmmiter.emit('gold', cookie);
  }, config.goldInterval * 60 * 1000);

  let levelInt = setInterval(() => {
    botEmmiter.emit('levelUp', cookie);
  }, config.levelInterval * 60 * 1000);
});

botEmmiter.on('gold', (cookie) => {
  gold(cookie);
});

botEmmiter.on('levelUp', (cookie) => {
  for(let id in config.user.dragons) {
    levelUpDragon(config.user.dragons[id], cookie);
  }
});

botEmmiter.on('error', (error) => {
  console.error('[ERROR]', error.header);
  if(error.header === 'Login failed') {
    console.log('Response:', error.response.headers);
  }
  // Close app
  process.exit(1);
});


// action="/index.php?c=quests&a=send"
