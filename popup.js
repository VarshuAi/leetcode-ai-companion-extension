document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const statusMsg = document.getElementById('status-msg');

  // Load existing key
  chrome.storage.local.get(['gemini_api_key'], (result) => {
    if (result.gemini_api_key) {
      apiKeyInput.value = result.gemini_api_key;
    }
  });

  // Save key
  saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      statusMsg.textContent = 'Please enter a valid API Key.';
      statusMsg.className = 'status error';
      return;
    }

    chrome.storage.local.set({ 'gemini_api_key': key }, () => {
      statusMsg.textContent = 'Configurations saved successfully!';
      statusMsg.className = 'status success';
      setTimeout(() => {
        statusMsg.textContent = '';
        statusMsg.className = 'status';
      }, 2000);
    });
  });
});
