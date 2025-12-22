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
  showModal('Site başarıyla kaydediliyor...');
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
  chrome.runtime.sendMessage({ action: 'delete-current-site' });
  showModal('Kaydedilmiş site siliniyor...');
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  showModal('Ayarlar yakında!');
});
