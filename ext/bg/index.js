'use strict';

// listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url.match(/trello\.com\/c(ards)?\//i)) {
    // send message to content script

    var parts = tab.url.replace(/https?:\/\//, '').split('/');

    chrome.tabs.sendMessage(tabId, {
      __ns: 'card_dependency',
      url: tab.url,
      parts: parts,
      shortlink: parts[2],
    });
  }
});
