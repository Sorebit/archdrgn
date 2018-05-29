const http = require('http');
const qs = require('querystring');

const Net = function() {}

Net.request = function(method, path, config, callback) {
  const options = {
    host: 'archdragon.com',
    path: path,
    method: method,
    headers: {}
  }
  let data = {};

  if(config.cookie) {
    options.headers['Cookie'] = config.cookie;
  }

  if(config.data && method === 'POST') {
    data = qs.stringify(config.data)
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.headers['Content-Length'] = Buffer.byteLength(data);
  }

  // Make request
  const req = http.request(options, (response) => {
    response.setEncoding('utf8');
    console.log('===', options.method, options.path, '===');
    console.log('Status:', response.statusCode, response.statusMessage);

    // Response html created from chunks
    let html = "";
    response.on('data', (chunk) => { html += chunk; });
    // Whole response is loaded
    response.on('end', () => {
      callback(response, html);
    });
  });

  // Handle response error
  req.on('error', (e) => console.error('Request error:', e.message));
  // Write form data
  if(data &&  method === 'POST') {
    req.write(data);
  }
  // End request
  req.end();
}

Net.get = function(path, config, callback) {
  Net.request('GET', path, config, callback);
}

Net.post = function(path, config, callback) {
  Net.request('POST', path, config, callback);
}

module.exports = Net;