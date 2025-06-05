document.addEventListener('DOMContentLoaded', () => {
  // REMOVED: The immediate localStorage check that was causing premature redirection.
  
  // This fetch will now act as one of the initial checks for an active session.
  fetch('/api/patients/me', {
    credentials: 'include' // Ensures cookies (like session ID) are sent
  })
  .then(response => response.json())
  .then(data => {
    // If this block is reached, the user is authenticated for this request.
    document.getElementById('userDetails').innerHTML = `
      <p>Name: ${data.name}</p>
      <p>Email: ${data.email}</p>
      <p>Age: ${data.age}</p>
      <p>Gender: ${data.gender}</p>
      <p>Country: ${data.country}</p>
    `;
  })
  .catch(error => {
    // This catch will handle errors from fetch itself, or errors thrown by handleResponse
    // (including the one for 401, though redirection would have already happened).
   console.error('Error:', error);
  });

  // Fetch appointments
  // This also relies on handleResponse to manage authentication.
  function loadAppointments() { // Encapsulated in a function to call it after booking too
    fetch('/api/appointments', {
      credentials: 'include'
    })
    .then(handleResponse)
    .then(appointments => {
      const tbody = document.getElementById('appointmentDetails');
      // Clear previous appointments to avoid duplication if reloaded
      tbody.innerHTML = ''; 
      if (appointments && appointments.length > 0) {
        appointments.forEach(appt => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${appt.doctor_name || 'N/A'}</td> 
            <td>${new Date(appt.appointment_date).toLocaleDateString()}</td>
            <td>${appt.appointment_time || 'N/A'}</td> 
            <td>${appt.status || 'N/A'}</td>
          `; // Added appt.appointment_time
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="4">No appointments found.</td></tr>';
      }
    })
    .catch(error => {
        // If handleResponse already redirected due to 401, this might not execute
        // or error handling might be on a page that's already navigating away.
        handleError(error); 
        const tbody = document.getElementById('appointmentDetails');
        if (tbody) { // Check if tbody exists, in case of race conditions with page navigation
            tbody.innerHTML = '<tr><td colspan="4">Could not load appointments.</td></tr>';
        }
    });
  }
  loadAppointments(); // Initial load of appointments

  // Handle logout
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include' // Important for session cookies
        });
        
        // Regardless of server response for logout, clear client-side and redirect
        localStorage.clear(); // Clear any other potential client-side storage
        window.location.href = '/frontend/views/login.html';

        // You might choose to only redirect if response.ok, but often for logout,
        // you want to ensure the client acts as if logged out even if server fails.
        // if (!response.ok) {
        //   // alert('Logout failed on server, but you are logged out locally.');
        // }
      } catch (error) {
        console.error('Logout error:', error);
        // Still clear client-side and redirect even if network error
        localStorage.clear();
        window.location.href = '/frontend/views/login.html';
        // alert('Logout failed. Please check your connection.');
      }
    });
  }

  // Show booking form
  const bookButton = document.getElementById('bookButton');
  if (bookButton) {
    bookButton.addEventListener('click', () => {
      const bookingForm = document.getElementById('bookingForm');
      if (bookingForm) {
        bookingForm.style.display = 'block';
      }
    });
  }
  
  // Handle actual booking submission
  const bookingFormElement = document.getElementById('bookingForm');
  if (bookingFormElement) {
      bookingFormElement.addEventListener('submit', async (e) => {
          e.preventDefault();
          const doctorId = document.getElementById('doctorSelect').value;
          const date = document.getElementById('appointmentDate').value;
          // Assuming you add an input for time with id 'appointmentTime'
          const time = document.getElementById('appointmentTime') ? document.getElementById('appointmentTime').value : null;

          const datetime = `${date}T${time}`;


          if (!doctorId || !date || !time) {
              alert('Please select a doctor, date, and time.');
              return;
          }
          const selectedDate = new Date(`${date}T${time}`);
if (selectedDate < new Date()) {
  alert('Cannot book appointments in the past.');
  return;
}
          
          const formData = { doctorId, date, time };
          await handleBooking({
      doctorId: document.getElementById('doctorSelect').value,
      datetime // Send combined datetime
    });
    
    bookingFormElement.style.display = 'none';
    bookingFormElement.reset();
  });
}


  // Load doctors into select dropdown
  async function loadDoctors() {
  try {
    const response = await fetch('/api/doctors');
    const doctors = await handleResponse(response);
    const select = document.getElementById('doctorSelect');
    
    // Clear previous options
    select.innerHTML = '<option value="">Select Doctor</option>';
    
    doctors.forEach(doctor => {
      const option = document.createElement('option');
      option.value = doctor.id;
      option.textContent = `${doctor.name} - ${doctor.specialization} (Available: ${doctor.available_days.join(', ')})`;
      select.appendChild(option);
    });
    
    // Add event listener for doctor selection
    select.addEventListener('change', updateDateTimeConstraints);

  } catch (error) {
    handleError(error);
  }
}

function updateDateTimeConstraints() {
  const doctorId = this.value;
  const dateInput = document.getElementById('appointmentDate');
  const timeInput = document.getElementById('appointmentTime');
  
  if (!doctorId) {
    dateInput.disabled = timeInput.disabled = true;
    return;
  }

  // Fetch doctor details and set constraints
  fetch(`/api/doctors/${doctorId}`)
    .then(handleResponse)
    .then(doctor => {
      // Set date constraints
      dateInput.min = new Date().toISOString().split('T')[0];
      dateInput.disabled = false;

      // Set time constraints
      timeInput.min = doctor.start_time;
      timeInput.max = doctor.end_time;
      timeInput.disabled = false;
      
      // Add day validation
      dateInput.addEventListener('change', () => {
        const selectedDate = new Date(dateInput.value);
        const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        if (!doctor.available_days.includes(dayName)) {
          alert(`Doctor not available on ${dayName}s`);
          dateInput.value = '';
        }
      });
    })
    .catch(handleError);
}
  loadDoctors();


  async function handleBooking(formData) {
    try {

      const doctorId = document.getElementById('doctorSelect').value;
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;

    // Validate inputs before sending
    if (!doctorId || !date || !time) {
      alert('Please fill all fields');
      return;
    }

    // Create ISO datetime string (e.g., "2025-05-27T14:30")
    const datetime = `${date}T${time}`;

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            doctorId: doctorId, // Must match backend expectation
        datetime: datetime  // Must match backend expectation
      })
      });

      // Use handleResponse to check for errors and parse JSON
      const result = await handleResponse(response); 
      console.log('Booking successful:', result); // Or handle success message from server
      alert('Appointment booked successfully!');
      loadAppointments(); // Refresh appointments list
    } catch (error) {
      // handleError will be called by handleResponse if there's a 401 or other HTTP error
      // Or it will be called here for network errors etc.
      // handleError(error); // This might be redundant if handleResponse throws
      console.error('Booking failed:', error.message);
      alert(`Booking failed: ${error.message}`);
    }
  }

  // Generic response handler
  function handleResponse(response) {
    if (response.status === 401) { // Unauthorized
      // Clear any sensitive client-side storage if you were using it
      localStorage.clear(); 
      window.location.href = '/frontend/views/login.html'; // Redirect to login
      // It's important to stop further processing by rejecting the promise
      return Promise.reject(new Error('Unauthorized: Session expired or invalid. Redirecting to login.'));
    }
    if (!response.ok) {
      // Try to parse error message from server, otherwise use status text
      return response.json()
        .catch(() => { 
          // If response.json() fails (e.g. not valid JSON), create a generic error
          throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        })
        .then(errorData => {
          // Throw an error with the message from the server's JSON response or a generic one
          throw new Error(errorData.message || errorData.error || `Request failed: ${response.status} ${response.statusText}`);
        });
    }
    // If response is OK and content type is JSON (common case)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    } else {
        return response.text(); // Or handle other content types as needed
    }
  }

  // Generic error handler
  function handleError(error) {
    console.error('Error:', error.message); // Log the error message
    // You could display a generic error message to the user on the page if desired,
    // but avoid showing raw error objects or stack traces.
    // Example: document.getElementById('errorMessageDisplay').textContent = 'An error occurred: ' + error.message;
    // Note: If redirection due to 401 already happened, UI updates here might not be visible.
  }
});

