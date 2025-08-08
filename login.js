const form = document.getElementById('login-form');
const message = document.getElementById('login-message');

const savedUsername = localStorage.getItem('username');
if (savedUsername) {
    form.style.display = 'none';
    message.textContent = `${savedUsername}`;
} else {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = form.username.value;
        const password = form.password.value;
        try {
            const res = await fetch('https://nicks-games-backend.onrender.com/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                message.textContent = `Logged in as ${data.username}`;
                localStorage.setItem('username', data.username); // Save for later use
                form.style.display = 'none';
            } else {
                message.textContent = data.message || 'Login failed';
            }
        } catch (err) {
            message.textContent = 'Error connecting';
        }
    });
}