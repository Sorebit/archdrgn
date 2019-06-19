'use strict';

// Action queue
// Make sure not more than one request is being processed

const ActionQueue = function() {
  let queue = [];
  let processing = false;
  
  // Every function that is pushed to queue has to call complete to enable it to move on to next actions
  this.complete = function() {
    // console.log('[QUEUE]', 'Action complete, size:', queue.length);
    if(queue.length) {
      queue.shift();
    }
    this.perform();
  }

  // Start processing queue actions
  this.start = function() {
    processing = true;
    this.perform();
  }

  // Push action to queue args is an array
  this.push = function(fun, args) {
    args = args || [];
    // console.log('[QUEUE]', 'Push:', { fun: fun, args: args });
    queue.push({ fun: fun, args: args });
    if(!processing) {
      this.start();
    }
  }

  // Perform current task at the front of queue
  this.perform = function() {
    if(queue.length) {
      // console.log('[QUEUE]', 'perform:', queue[0]);
      queue[0].fun.apply(null, queue[0].args);
    } else {
      processing = false;
      // console.log('[QUEUE]', 'Empty queue');
    }
  }
}


module.exports = ActionQueue;