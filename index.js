const http = require('http');
const qs = require('querystring');
const config = require('./config.json');
const EventEmitter = require('events');
const botEmmiter = new EventEmitter();
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

function botLogin() {
  const loginData = qs.stringify(config.credentials);
  const options = {
    host: 'archdragon.com',
    path: '/index.php?c=login&a=login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  console.log('Logging in...');
  let loggedIn = false;
  // Session cookie
  let cookie = undefined;

  // Make request and store cookie
  const req = http.request(options, (response) => {
      response.setEncoding('utf8');
      console.log('===', options.method, options.path, '===');
      //console.log('Status:', response.statusCode, response.statusMessage);
      loggedIn = (response.headers['location'] === '/map/index.html');
      cookie = response.headers['set-cookie'];

      // Response html created from chunks
      let html = "";
      response.on('data', (chunk) => { html += chunk; });

      response.on('end', () => {
        if(loggedIn) {
          botEmmiter.emit('loginSuccess', cookie);
        } else {
          botEmmiter.emit('error', { header: 'Login failed', response: response });
        }
      });
  });

  req.on('error', function(e) {
      console.error('Request error:', e.message);
  });

  req.write(loginData);
  req.end();
}

function botGold(cookie) {
  let options = {
    host: 'archdragon.com',
    path: '/index.php?c=build&a=collect&place=1',
    method: 'GET',
    headers: { 'Cookie': cookie }
  }

  const req = http.request(options, (response) => {
    response.setEncoding('utf8');
    console.log('===', options.method, options.path, '===');
    console.log('Status:', response.statusCode, response.statusMessage);
    
    options.path = '/' + response.headers['location'];

    let html = ""
    response.on('data', (chunk) => { html += chunk; });

    response.on('end', () => {
        //console.log("HTML: ", html);
        options.path = '/index.php';
        // Follow redirect to index
        const followReq = http.request(options, (response) => {
          console.log('===', options.method, options.path, '===');
          response.setEncoding('utf8');
          console.log('Status:', response.statusCode, response.statusMessage);

          let html = ""
          response.on('data', (chunk) => { html += chunk; });
          response.on('end', () => {
            const dom = new JSDOM(html);
            const msg = dom.window.document.getElementById('messageBar');
            if(msg) {
              console.log('Action message:', msg.children[0].textContent);
            } else {
              console.log('No action message');
            }
          });
        });

        followReq.on('error', function(e) { console.error('Request error:', e.message); });

        followReq.end();
    });
  });

  req.on('error', function(e) { console.error('Request error:', e.message); });

  req.end();
}

// Main logic
botLogin();

botEmmiter.on('loginSuccess', (cookie) => {
  // Login successfull, proceed to main loop
  console.log('Login successful');
  console.log('Cookie:', cookie);

  botGold(cookie);
});

botEmmiter.on('error', (error) => {
  console.error('Bot error:', error.header);
  if(error.header === 'Login failed') {
    console.log('Response:', error.response.headers);
  }
  // Close app
  process.exit(1);
});