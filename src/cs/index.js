'use strict';

// inject the dependency script into the current web page context

(function() {
  var s = window.document.createElement('script');
  s.src = chrome.extension.getURL('cs/dependency.js') + '?' + Date.now();
  s.id = 'card_dependency';
  s.setAttribute('data-logo', chrome.extension.getURL('logo-gray.png'));
  document.body.appendChild(s);
}());

// listens for messages from the background script
chrome.extension.onMessage.addListener(function(message /*, sender, sendResponse*/) {
  if (typeof message === 'object' && message.__ns && message.__ns === 'card_dependency') {

    // send message to cs/dependency.js
    window.postMessage(message, '*');
  }
});
