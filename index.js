const config = require('./config.json');
const Net = require('./modules/net')
const EventEmitter = require('events');
const botEmmiter = new EventEmitter();
const { JSDOM } = require('jsdom');

function login() {
  console.log('Logging in...');
  Net.post('/index.php?c=login&a=login', { data: config.credentials }, (res) => {
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
  console.log('Getting gold...');
  Net.get('/index.php?c=build&a=collect&place=1', { cookie: cookie }, (response) => {
    Net.get('/' + response.headers['location'], { cookie: cookie }, (response, html) => {
      const dom = new JSDOM(html);
      const msg = dom.window.document.getElementById('messageBar');
      if(msg) {
        console.log('Action message:', msg.children[0].textContent);
      } else {
        console.log('No action message');
      }
    });
  });
}

// Main logic
login();

botEmmiter.on('loginSuccess', (cookie) => {
  // Login successful, proceed to main loop
  console.log('Login successful');
  console.log('Cookie:', cookie);
  gold(cookie);
});

botEmmiter.on('error', (error) => {
  console.error('Bot error:', error.header);
  if(error.header === 'Login failed') {
    console.log('Response:', error.response.headers);
  }
  // Close app
  process.exit(1);
});