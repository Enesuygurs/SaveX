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
