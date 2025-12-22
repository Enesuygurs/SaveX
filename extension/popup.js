// SaveX popup logic


function showModal(message) {
  const modal = document.getElementById('modal');
  const modalMessage = document.getElementById('modalMessage');
  modalMessage.textContent = message;
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
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

document.getElementById('settingsBtn').addEventListener('click', () => {
  showModal('Ayarlar yakında!');
});
 
// Listen for background confirmations and update modal message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;
  if (message.action === 'site-saved') {
    showModal('Kaydedildi');
  } else if (message.action === 'site-deleted') {
    showModal('Silindi');
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
  }
});

// On popup open, check if current tab was loaded from saved data
document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.url) return;
    const key = 'loaded_from_saved_' + tab.url;
    chrome.storage.local.get(key, (res) => {
      if (res && res[key]) {
        showModal('Site kayıttan yüklendi');
        // clear the flag so message shows only once
        chrome.storage.local.remove(key);
      }
    });
  });
});
