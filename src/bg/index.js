'use strict';

// listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url.match(/\/c(ards)?\//i)) {
    // send message to content script

    chrome.tabs.sendMessage(tabId, {
      __ns: 'card_dependency',
      url: tab.url,
    });
  }
});
