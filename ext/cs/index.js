'use strict';

// inject the dependency treat into the current web page context

(function() {
  var script = window.document.createElement('script');
  script.src = '//code.jquery.com/jquery-1.7.1.min.js';
  document.body.appendChild(script);
}());

(function() {
  var s = window.document.createElement('script');
  s.src = chrome.extension.getURL('cs/dependency.js') + '?' + Date.now();
  s.id = 'trello_treat_dependency';
  document.body.appendChild(s);
}());

// listens for messages from the background script
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
  if (typeof message === 'object' && message.__ns && message.__ns === 'card_dependency') {

    // send message to dependency.js
    window.postMessage(message, '*');
  }
});
