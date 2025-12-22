// SaveX popup logic


function showModal(message) {
  const modal = document.getElementById('modal');
  const modalMessage = document.getElementById('modalMessage');
  modalMessage.textContent = message;
  modal.style.display = 'flex';
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
  }
});
