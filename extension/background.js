chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'save-current-site') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id || !tab.url) return;
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }, () => {
        chrome.tabs.sendMessage(tab.id, { action: 'get-page-content' }, (response) => {
          if (response && response.html) {
            chrome.storage.local.set({ ['site_' + tab.url]: response.html }, () => {
              chrome.runtime.sendMessage({ action: 'site-saved', url: tab.url });
            });
          }
        });
      });
    });
  }
  if (msg.action === 'delete-current-site') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url) return;
      chrome.storage.local.remove('site_' + tab.url, () => {
        chrome.runtime.sendMessage({ action: 'site-deleted', url: tab.url });
      });
    });
  }
});
// Service worker for SaveX extension


chrome.runtime.onInstalled.addListener(() => {
  // Initialization logic if needed
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'save-current-site') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id || !tab.url) return;
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }, () => {
        chrome.tabs.sendMessage(tab.id, { action: 'get-page-content' }, (response) => {
          if (response && response.html) {
            chrome.storage.local.set({ ['site_' + tab.url]: response.html }, () => {
              chrome.runtime.sendMessage({ action: 'site-saved', url: tab.url });
            });
          }
        });
      });
    });
  }
});
