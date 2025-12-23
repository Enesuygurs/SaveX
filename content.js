// Content script for SaveX

function getFullPageContent() {
  // Get full HTML content including doctype
  let doctype = document.doctype ? `<!DOCTYPE ${document.doctype.name}>` : '';
  let html = document.documentElement.outerHTML;
  return doctype + html;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'get-page-content') {
    sendResponse({ html: getFullPageContent() });
  }
});
