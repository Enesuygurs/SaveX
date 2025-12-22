chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'save-current-site') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id || !tab.url) return;
      // Only allow http/https pages
      if (!/^https?:\/\//i.test(tab.url)) {
        chrome.runtime.sendMessage({ action: 'site-error', reason: 'unsupported_url', url: tab.url });
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }, () => {
        chrome.tabs.sendMessage(tab.id, { action: 'get-page-content' }, (response) => {
          if (chrome.runtime.lastError) {
            chrome.runtime.sendMessage({ action: 'site-error', reason: 'no_content_script', message: chrome.runtime.lastError.message, url: tab.url });
            return;
          }
          if (response && response.html) {
            chrome.storage.local.set({ ['site_' + tab.url]: response.html }, () => {
              chrome.runtime.sendMessage({ action: 'site-saved', url: tab.url });
            });
          } else {
            chrome.runtime.sendMessage({ action: 'site-error', reason: 'empty_response', url: tab.url });
          }
        });
      });
    });
  }
  if (msg.action === 'delete-current-site') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url) return;
      if (!/^https?:\/\//i.test(tab.url)) {
        chrome.runtime.sendMessage({ action: 'site-error', reason: 'unsupported_url', url: tab.url });
        return;
      }
      chrome.storage.local.remove('site_' + tab.url, () => {
        if (chrome.runtime.lastError) {
          chrome.runtime.sendMessage({ action: 'site-error', reason: 'storage_error', message: chrome.runtime.lastError.message, url: tab.url });
        } else {
          chrome.runtime.sendMessage({ action: 'site-deleted', url: tab.url });
        }
      });
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  // Initialization logic if needed
});

// Intercept navigation and show saved site if exists
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only main frame
  const url = details.url;
  // Only act on http(s) pages
  if (!/^https?:\/\//i.test(url)) return;
  chrome.storage.local.get('site_' + url, (result) => {
    const html = result && result['site_' + url];
    if (html) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: (htmlStr) => {
          document.open();
          document.write(htmlStr);
          document.close();
        },
        args: [html]
      }).catch((err) => {
        // ignore injection errors for restricted pages
        console.warn('SaveX: could not inject saved HTML', err && err.message);
      });
    }
  });
});
