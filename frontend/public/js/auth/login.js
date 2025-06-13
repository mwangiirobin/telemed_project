//login.js
document.addEventListener('DOMContentLoaded', () => {
document.getElementById('loginForm').addEventListener('submit', async function (event) {
  // 1. Prevent the browser from doing a full page reload on form submission.
  event.preventDefault();

  // A helper function to show error messages (make sure you have an element with id="login-error" in your HTML)
  const showError = (message) => {
    const errorElement = document.getElementById('login-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  };

  // Clear previous errors
  showError('');

  try {
    // 2. Send the login data to your backend API.
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // This is crucial for sending your session cookie to the server.
      credentials: 'include',
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      }),
    });

    // 3. Get the JSON response from the server.
    // I've removed the duplicate 'const' declaration here.
    const data = await response.json();

    // 4. Check if the login was successful (HTTP status 200-299).
    if (response.ok) {
      console.log('Redirecting to dashboard...'); // Your log message
      // Add delay to ensure cookie is processed
  setTimeout(() => {
    if (data.redirect) {
      window.location.href = data.redirect;
    }
  }, 500); // 500ms delay
    

      // 5. THE FIX: Read the 'redirect' URL from the server's response
      //    and tell the browser to navigate to that page.
      if (data.redirect) {
        window.location.href = data.redirect;
      }
    } else {
      // If login failed, show the error message from the server.
      showError(data.error || 'Login failed. Please check your credentials.');
    }
  } catch (error) {
    // This catches network errors (e.g., server is down).
    console.error('An error occurred during the login fetch request:', error);
    showError('A network error occurred. Please try again later.');
  }
});
});