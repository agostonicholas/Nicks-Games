const form = document.getElementById('login-form');
const registerBtn = document.getElementById('registerBtn');
const message = document.getElementById('login-message');
const API = 'https://nicks-games-backend.onrender.com';


const logoutButton = document.createElement('button');
logoutButton.textContent = 'Logout';
logoutButton.style.display = 'none';
logoutButton.addEventListener('click', () => {
  localStorage.removeItem('username');  // later: remove session token too
  message.textContent = '';
  logoutButton.style.display = 'none';
  form.style.display = 'block';
});
message.after(logoutButton);

// If already logged in
const savedUsername = localStorage.getItem('username');
if (savedUsername) {
  form.style.display = 'none';
  message.textContent = `${savedUsername}`;
  logoutButton.style.display = 'inline-block';
}

// LOGIN
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = form.username.value.trim();
  const password = form.password.value.trim();
  if (!username || !password) {
    message.textContent = 'Enter username and password';
    return;
  }
  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      message.textContent = data.message || 'Login failed';
      return;
    }
    message.textContent = `Logged in as ${data.username}`;
    localStorage.setItem('username', data.username); // FIX ME: STORE SESSION TOKEN INSTEAD
    form.style.display = 'none';
    logoutButton.style.display = 'inline-block';
  } catch {
    message.textContent = 'Error connecting to backend';
  }
});

// REGISTER
registerBtn.addEventListener('click', async () => {
  const username = form.username.value.trim();
  const password = form.password.value.trim();
  if (!username || !password) {
    message.textContent = 'Enter username and password';
    return;
  }
  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      message.textContent = data.message || 'Registration failed';
      return;
    }
    message.textContent = `Registered as ${data.username}`;
    localStorage.setItem('username', data.username);
    form.style.display = 'none';
    logoutButton.style.display = 'inline-block';
  } catch {
    message.textContent = 'Error connecting to backend';
  }
});