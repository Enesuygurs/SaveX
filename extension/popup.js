// SaveX popup logic

document.getElementById('saveBtn').addEventListener('click', async () => {
  chrome.runtime.sendMessage({ action: 'save-current-site' });
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
  chrome.runtime.sendMessage({ action: 'delete-current-site' });
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  // Settings button logic (to be implemented)
  alert('Ayarlar yakında!');
});
