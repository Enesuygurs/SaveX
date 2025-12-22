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

// Intercept navigation and show saved site if exists
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only main frame
  const url = details.url;
  chrome.storage.local.get('site_' + url, (result) => {
    if (result && result['site_' + url]) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: (html) => {
          document.open();
          document.write(html);
          document.close();
        },
        args: [result['site_' + url]]
      });
    }
  });
});
