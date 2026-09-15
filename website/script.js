const button = document.querySelector('#copy-message');
const message = document.querySelector('#setup-message');
const status = document.querySelector('#copy-status');

button.hidden = false;
button.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(message.value);
    button.textContent = 'Message copied ✓';
    status.textContent = 'Ready to paste into a ChatGPT Work session.';
  } catch {
    message.focus();
    message.select();
    status.textContent = 'Copy the selected message using your device’s copy command, then paste it into ChatGPT.';
  }
});
