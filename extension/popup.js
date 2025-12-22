// SaveX popup logic


function showModal(message) {
  const modal = document.getElementById('modal');
  const modalMessage = document.getElementById('modalMessage');
  modalMessage.textContent = message;
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
}

function showStatusMessage(message, timestamp = null, timeout = 5000) {
  const el = document.getElementById('statusMessage');
  if (!el) return;
  if (timestamp) {
    el.innerHTML = `<div class="msg-line">${message}</div><div class="timestamp">${timestamp}</div>`;
  } else {
    el.textContent = message;
  }
  el.style.display = 'block';
  el.setAttribute('aria-hidden', 'false');
  if (timeout > 0) {
    clearTimeout(showStatusMessage._timer);
    showStatusMessage._timer = setTimeout(() => {
      hideStatusMessage();
    }, timeout);
  }
}

function hideStatusMessage() {
  const el = document.getElementById('statusMessage');
  if (!el) return;
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');
}

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  chrome.runtime.sendMessage({ action: 'save-current-site' });
  showModal('Kaydediliyor');
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
  chrome.runtime.sendMessage({ action: 'delete-current-site' });
  showModal('Siliniyor');
});

function setDeleteEnabled(enabled) {
  const del = document.getElementById('deleteBtn');
  if (!del) return;
  del.disabled = !enabled;
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  showModal('Ayarlar yakında!');
});
 
// Listen for background confirmations and update modal message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;
  if (message.action === 'site-saved') {
    showModal('Kaydedildi');
    setDeleteEnabled(true);
  } else if (message.action === 'site-deleted') {
    showModal('Silindi');
    setDeleteEnabled(false);
  } else if (message.action === 'site-error') {
    // Map common reasons to user-friendly messages
    const reason = message.reason || '';
    if (reason === 'unsupported_url') {
      showModal('Bu sayfa kaydedilemez');
    } else if (reason === 'no_content_script') {
      showModal('Sayfa içeriğine erişilemiyor');
    } else if (reason === 'storage_error') {
      showModal('Depolama hatası');
    } else {
      showModal(message.message || 'Bir hata oluştu');
    }
    // if the error relates to unsupported url or storage, ensure delete disabled
    if (message.reason === 'unsupported_url' || message.reason === 'storage_error') {
      setDeleteEnabled(false);
    }
  }
});

// On popup open, check if current tab was loaded from saved data
document.addEventListener('DOMContentLoaded', () => {
  // disable delete by default until we check storage
  setTimeout(() => setDeleteEnabled(false), 0);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.url) return;
    const siteKey = 'site_' + tab.url;
    const key = 'loaded_from_saved_' + tab.url;
    // check if loaded from saved (key stores ISO timestamp)
    chrome.storage.local.get(key, (res) => {
      const ts = res && res[key];
      if (ts) {
        // format timestamp to DD.MM.YYYY HH:MM
        try {
          const d = new Date(ts);
          const pad = (n) => String(n).padStart(2, '0');
            const formatted = `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            // show message with timestamp on next line and keep it persistent (timeout=0)
            showStatusMessage('Site kayıttan yüklendi', `${formatted}`, 0);
        } catch (e) {
            showStatusMessage('Site kayıttan yüklendi', null, 0);
        }
        // clear the flag so message shows only once
        chrome.storage.local.remove(key);
      }
    });
    // check if a saved site exists for this URL to enable delete button
    chrome.storage.local.get(siteKey, (res) => {
      if (res && res[siteKey]) setDeleteEnabled(true);
      else setDeleteEnabled(false);
    });
  });
});
