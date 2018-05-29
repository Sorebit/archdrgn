const http = require('http');
const qs = require('querystring');
const config = require('./config.json');

function botLogin() {
  const loginData = qs.stringify(config.credentials);
  const options = {
    host: 'archdragon.com',
    port: '80',
    path: '/index.php?c=login&a=login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  console.log('Logging in...');
  // Session cookie
  let cookie = undefined;
  // Response html created from chunks
  let html = "";
  // Make request and store cookie
  const req = http.request(options, function(response) {
      response.setEncoding('utf8');
      // console.log('Response:', response);
      console.log('Status:', response.statusCode, response.statusMessage);
      cookie = response.headers['set-cookie'];
      console.log('Cookie:', cookie);

      response.on('data', function (chunk) {
          html += chunk;
      });
      response.on('end', function() {
        console.log('HTML:');
        console.log(html);
      });
  });

  req.on('error', function(e) {
      console.error('Request error:', e.message);
  });

  req.write(loginData);
  req.end();
}

botLogin();