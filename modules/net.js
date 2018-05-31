'use strict';

const http = require('http');
const qs = require('querystring');
const Util = require('./util');

const Net = function() {}

Net.request = function(method, path, config, callback) {
  const options = {
    host: 'archdragon.com',
    path: path,
    method: method,
    headers: {}
  }
  let data = undefined;

  if(Net.cookie) {
    options.headers['Cookie'] = Net.cookie;
  }

  if(config.data && method === 'POST') {
    data = qs.stringify(config.data)
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.headers['Content-Length'] = Buffer.byteLength(data);
  }

  if(config.type === 'json') {
    options.headers['Content-Type'] = 'application/json';
    options.headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log('===', options.method, options.path, '===');
  // Make request
  const req = http.request(options, (response) => {
    response.setEncoding('utf8');
    Util.log(1, 'Status:', response.statusCode, response.statusMessage);
    // Response html created from chunks
    let responseData = "";
    response.on('data', (chunk) => { responseData += chunk; });
    // Whole response is loaded
    response.on('end', () => {
      callback(response, responseData);
    });
  });

  // Handle response error
  req.on('error', (e) => console.error('[ERROR] Request error:', e.message));
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