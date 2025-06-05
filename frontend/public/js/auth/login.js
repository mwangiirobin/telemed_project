document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      })
    });

   const data = await response.json();
    
    if (response.ok) {
      console.log('Redirecting to dashboard...');
      window.location.href = data.redirect; // Use server-provided redirect
    } else {
      showError(data.error || 'Login failed');
    }
  } catch (error) {
    showError('Network error. Please try again.');
  }
});