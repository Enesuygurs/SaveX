// SaveX popup logic


function showModal(message) {
  const modal = document.getElementById('modal');
  const modalMessage = document.getElementById('modalMessage');
  modalMessage.textContent = message;
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
}

function showStatusMessage(message, timestamp = null, timeout = 5000, type = 'success') {
  const el = document.getElementById('statusMessage');
  if (!el) return;
  // Remove previous type classes
  el.classList.remove('success', 'error');
  el.classList.add(type);
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
  const modal = document.getElementById('modal');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  // hide any inline status message (e.g. "Bu site kaydedilmemiş")
  hideStatusMessage();
  chrome.runtime.sendMessage({ action: 'save-current-site' });
  showModal('Kaydediliyor');
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
  // hide any inline status message (e.g. "Site kayıttan yüklendi")
  hideStatusMessage();
  chrome.runtime.sendMessage({ action: 'delete-current-site' });
  showModal('Siliniyor');
});

function setDeleteEnabled(enabled) {
  const del = document.getElementById('deleteBtn');
  if (!del) return;
  del.disabled = !enabled;
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  const mainView = document.getElementById('mainView');
  const settingsView = document.getElementById('settingsView');
  const titleEl = document.querySelector('.topbar .title');
  const iconEl = document.querySelector('#settingsBtn .icon');
  if (!mainView || !settingsView || !titleEl || !iconEl) {
    showModal('Ayarlar yakında!');
    return;
  }
  const showingSettings = settingsView.style.display === 'block';
  if (showingSettings) {
    // go back to main: remove inline display so CSS (.content) controls layout
    settingsView.style.display = 'none';
    mainView.style.display = '';
    titleEl.textContent = 'SaveX';
    iconEl.textContent = '⚙'; // change icon back to settings gear
    iconEl.style.color = 'white';
  } else {
    // show settings view
    mainView.style.display = 'none';
    settingsView.style.display = 'block';
    titleEl.textContent = 'SaveX';
    iconEl.textContent = '◀'; // left arrow (text, renders white)
    iconEl.style.color = 'white';
    // wire up export/import handlers (idempotent)
    setupImportExportHandlers();
  }
});

// (no back button - settings toggles with the settings button)
 
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

// Setup import/export handlers used by settings
function setupImportExportHandlers() {
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const deleteAllBtn = document.getElementById('deleteAllBtn');
  const importFile = document.getElementById('importFile');
  if (exportBtn && !exportBtn._wired) {
    exportBtn.addEventListener('click', exportAll);
    exportBtn._wired = true;
  }
  if (importBtn && !importBtn._wired) {
    importBtn.addEventListener('click', () => {
      if (importFile && importFile.files && importFile.files[0]) {
        importAllFromFile(importFile.files[0]);
      } else {
        showModal('Lütfen bir JSON dosyası seçin');
      }
    });
    importBtn._wired = true;
  }
  if (deleteAllBtn && !deleteAllBtn._wired) {
    deleteAllBtn.addEventListener('click', deleteAllRecords);
    deleteAllBtn._wired = true;
  }
}

function exportAll() {
  // gather all site_ keys and download as JSON
  chrome.storage.local.get(null, (items) => {
    if (chrome.runtime.lastError) {
      showModal('Dışa aktarma sırasında hata');
      return;
    }
    const exportObj = {};
    for (const k in items) {
      if (Object.prototype.hasOwnProperty.call(items, k) && k.startsWith('site_')) {
        exportObj[k] = items[k];
      }
    }
    if (Object.keys(exportObj).length === 0) {
      showModal('Dışa aktarılacak kayıt bulunamadı');
      return;
    }
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `savex-export-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showModal('Dışa aktarma tamamlandı');
  });
}

function deleteAllRecords() {
  // confirm with user
  const ok = confirm('Tüm kayıtlar kalıcı olarak silinecek. Devam edilsin mi?');
  if (!ok) return;
  showModal('Tüm kayıtlar siliniyor...');
  // collect all keys that are site_ or loaded_from_saved_
  chrome.storage.local.get(null, (items) => {
    if (chrome.runtime.lastError) {
      showModal('Silme sırasında hata: ' + chrome.runtime.lastError.message);
      return;
    }
    const keysToRemove = [];
    for (const k in items) {
      if (!Object.prototype.hasOwnProperty.call(items, k)) continue;
      if (k.startsWith('site_') || k.startsWith('loaded_from_saved_')) keysToRemove.push(k);
    }
    if (keysToRemove.length === 0) {
      showModal('Silinecek kayıt bulunamadı');
      return;
    }
    chrome.storage.local.remove(keysToRemove, () => {
      if (chrome.runtime.lastError) {
        showModal('Silme başarısız: ' + chrome.runtime.lastError.message);
      } else {
        showModal('Tüm kayıtlar silindi');
        // update UI state
        setDeleteEnabled(false);
      }
    });
  });
}

function importAllFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON');
      // Filter and prepare entries to set
      const toSet = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (k.startsWith('site_')) {
          // basic validation: must be object with html or string
          if (v && (v.html || typeof v === 'string')) {
            toSet[k] = v;
          }
        } else {
          // if key looks like url or raw, store as site_<key> if structure is valid
          if (v && (v.html || typeof v === 'string')) {
            toSet['site_' + k] = v;
          }
        }
      }
      if (Object.keys(toSet).length === 0) {
        showModal('İçe aktarılacak geçerli kayıt yok');
        return;
      }
      chrome.storage.local.set(toSet, () => {
        if (chrome.runtime.lastError) {
          showModal('İçe aktarma başarısız: ' + chrome.runtime.lastError.message);
        } else {
          showModal('İçe aktarma başarılı');
          // clear file input
          const importFile = document.getElementById('importFile');
          if (importFile) importFile.value = '';
        }
      });
    } catch (err) {
      showModal('Dosya okunamadı: Geçersiz JSON');
    }
  };
  reader.onerror = () => {
    showModal('Dosya okunamadı');
  };
  reader.readAsText(file);
}

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
          // keep the loaded flag so the message persists across popup opens
      }
    });
    // check if a saved site exists for this URL to enable delete button
    chrome.storage.local.get(siteKey, (res) => {
      if (res && res[siteKey]) {
        setDeleteEnabled(true);
      } else {
        setDeleteEnabled(false);
        // Show red message if site is not saved
        showStatusMessage('Bu site kaydedilmemiş', null, 0, 'error');
      }
    });
  });
});
