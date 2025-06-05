document.addEventListener('DOMContentLoaded', () => { // Ensure DOM is ready
  const registrationForm = document.getElementById('registrationForm');

  if (registrationForm) {
    registrationForm.addEventListener('submit', async function (e) {
      e.preventDefault(); // Prevent default HTML form submission

      // Clear previous errors displayed by this script
      clearErrors();

      // Get current form values INSIDE the submit handler
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const age = document.getElementById('age').value.trim();
      const genderRadio = document.querySelector('input[name="gender"]:checked');
      const gender = genderRadio ? genderRadio.value : ''; // Get value if a gender is selected
      const country = document.getElementById('country').value;

      let isValid = true; // Flag to track validation status

      // --- Client-side Validation ---

      // Name validation (example: not empty)
      if (!name) {
        showError('Name is required!', 'name');
        isValid = false;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showError('Please enter a valid email address!', 'email');
        isValid = false;
      }

      // Password presence (example)
      if (!password) {
          showError('Password is required!', 'password');
          isValid = false;
      }

      // Password confirmation validation
      if (password !== confirmPassword) {
        showError('Passwords do not match!', 'confirmPassword');
        isValid = false;
      }

      // Age validation (example: is a number)
      if (age && isNaN(parseInt(age))) {
        showError('Age must be a number!', 'age');
        isValid = false;
      }
      
      // Gender validation (example: one must be selected)
      if (!gender) {
        // Assuming you have an element near the gender radios to show the error
        // For now, prepending to form. You might need a specific div for gender errors.
        showError('Please select a gender.', null); // or target a specific element
        isValid = false;
      }

      // Country validation (example: not empty)
      if (!country) {
        showError('Country is required!', 'country');
        isValid = false;
      }


      // If any validation failed, stop here
      if (!isValid) {
        return;
      }

      // --- If validations pass, submit form data ---
      try {
        const formDataForServer = {
          name: name,
          email: email,
          password: password,
          confirmPassword: confirmPassword,
          age: age ? parseInt(age) : undefined, // Send age as number if present
          gender: gender,
          country: country
        };

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formDataForServer)
        });

        const result = await response.json(); // Try to parse JSON regardless of response.ok for error messages

        if (!response.ok) {
          // Use error message from server if available, otherwise a default
          throw new Error(result.error || result.message || 'Registration failed due to a server error.');
        }

        alert("Registration successful!");
        // Redirect to the correct login page path based on your server setup
        // Based on previous discussions, your server serves login at /frontend/views/login.html
        window.location.href = '/frontend/views/login.html';

      } catch (error) {
        // Display network errors or errors from the `throw new Error` line above
        showError(error.message || 'An unexpected error occurred. Please try again.', null);
      }
    });
  }

  // Helper functions (use the more detailed versions)
  function showError(message, fieldId = null) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message'; // Good for styling all error messages
    errorDiv.style.color = 'red';
    errorDiv.style.fontSize = '0.9em';
    errorDiv.style.marginTop = '5px';
    errorDiv.textContent = message;

    const targetElement = fieldId ? document.getElementById(fieldId) : null;

    if (targetElement && targetElement.parentNode) {
      // Insert after the input field or its direct container
      targetElement.parentNode.insertBefore(errorDiv, targetElement.nextSibling);
    } else if (registrationForm) {
      // If no specific field or field not found, prepend to the form
      registrationForm.prepend(errorDiv);
    }
    // No auto-remove, rely on clearErrors()
  }

  function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.remove());
  }
});