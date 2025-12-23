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
            const savedAt = new Date().toISOString();
            const payload = { html: response.html, savedAt };
            chrome.storage.local.set({ ['site_' + tab.url]: payload }, () => {
              chrome.runtime.sendMessage({ action: 'site-saved', url: tab.url, savedAt });
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
      chrome.storage.local.remove(['site_' + tab.url, 'loaded_from_saved_' + tab.url], () => {
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
    const saved = result && result['site_' + url];
    // saved may be an object { html, savedAt } or a plain HTML string (backcompat)
    const html = saved && saved.html ? saved.html : saved;
    if (html) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: (htmlStr) => {
          document.open();
          document.write(htmlStr);
          document.close();
        },
        args: [html]
        }).then(() => {
          // mark that this tab was loaded from saved data so popup can show a message
          try {
            // read savedAt from storage and store it on the loaded flag
            chrome.storage.local.get('site_' + url, (res) => {
              const site = res && res['site_' + url];
              const savedAt = site && site.savedAt ? site.savedAt : new Date().toISOString();
              chrome.storage.local.set({ ['loaded_from_saved_' + url]: savedAt });
            });
          } catch (e) {
            // ignore storage errors in service worker
          }
        }).catch((err) => {
          // ignore injection errors for restricted pages
          console.warn('SaveX: could not inject saved HTML', err && err.message);
        });
    }
  });
});

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'savex-save-page',
    title: 'SaveX ile kaydet',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'savex-save-page' && tab && tab.id) {
    // Directly trigger save logic for the tab
    saveCurrentSiteForTab(tab);
  }
});

// Function to save current site for a given tab
function saveCurrentSiteForTab(tab) {
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
        const savedAt = new Date().toISOString();
        const payload = { html: response.html, savedAt };
        chrome.storage.local.set({ ['site_' + tab.url]: payload }, () => {
          chrome.runtime.sendMessage({ action: 'site-saved', url: tab.url, savedAt });
        });
      } else {
        chrome.runtime.sendMessage({ action: 'site-error', reason: 'empty_response', url: tab.url });
      }
    });
  });
}
