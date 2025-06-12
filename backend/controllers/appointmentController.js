import Appointment from '../models/appointmentModel.js';
import pool from '../config/db.js';

export const bookAppointment = async (req, res) => {
  const { doctorId, datetime } = req.body;
  const patientId = req.session.userId;
  
  // Get a client from the pool
  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    if (!doctorId || !datetime) {
      // No need to rollback here since no changes have been made yet
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ... (Your validation for datetime format and past appointments is fine) ...
    const [date, time] = datetime.split('T');
    const appointmentDate = new Date(datetime);
    
    // Prevent past appointments (unchanged)
    if (appointmentDate < new Date()) {
      await connection.query('ROLLBACK');
      transactionActive = false;
      return res.status(400).json({ error: 'Cannot book appointments in the past' });
    }

    // Get doctor availability using PostgreSQL placeholder syntax ($1)
    const doctorResult = await client.query(
      `SELECT available_days, start_time, end_time 
       FROM doctors WHERE id = $1`,
      [doctorId]
    );
    
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctor = doctorResult.rows[0];
    
    // ... (Your logic for checking available days and hours is fine) ...
    // Check available days (unchanged)
    const availableDays = doctor.available_days;
    const appointmentDay = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (!availableDays.includes(appointmentDay)) {
      await connection.query('ROLLBACK');
      transactionActive = false;
      return res.status(409).json({ error: `Doctor not available on ${appointmentDay}s` });
    }

    // Check working hours (unchanged)
    const appointmentTime = new Date(`1970-01-01T${time}:00`);
    const startTime = new Date(`1970-01-01T${doctor.start_time}`);
    const endTime = new Date(`1970-01-01T${doctor.end_time}`);
    
    if (appointmentTime < startTime || appointmentTime > endTime) {
      await connection.query('ROLLBACK');
      transactionActive = false;
      return res.status(409).json({ 
        error: `Doctor only available between ${doctor.start_time} and ${doctor.end_time}`
      });
    }


    // Check existing appointments using PostgreSQL placeholder syntax
    const existingResult = await client.query(
      `SELECT * FROM appointments 
       WHERE doctor_id = $1 
       AND appointment_date = $2
       AND appointment_time = $3
       AND status NOT IN ('canceled')`,
      [doctorId, date, time]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'This time slot is no longer available.' });
    }

    // Create appointment using PostgreSQL syntax with RETURNING clause
    const insertResult = await client.query(
      `INSERT INTO appointments 
        (patient_id, doctor_id, appointment_date, appointment_time, status) 
       VALUES 
        ($1, $2, $3, $4, $5)
       RETURNING id`, // RETURNING id gets the new appointment's ID
      [patientId, doctorId, date, time, 'scheduled']
    );

    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(201).json({ 
      success: true,
      appointmentId: insertResult.rows[0].id, // Get the new ID from the result
      message: 'Appointment booked successfully'
    });

  } catch (error) {
    // Roll back the transaction in case of any error
    await client.query('ROLLBACK');
    console.error('Booking error:', error);
    res.status(500).json({ 
      error: 'Booking failed due to a server error.'
    });
  } finally {
    // VERY IMPORTANT: Release the client back to the pool in all cases
    client.release();
  }
};

export const getAppointments = async (req, res) => {
  // This function calls the Appointment model. You must also update the model's
  // SQL queries to use PostgreSQL syntax ($1, $2...).
  try {
    // Ensure Appointment.findByPatient uses PostgreSQL syntax
    const appointments = await Appointment.findByPatient(req.session.userId);
    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch appointments'
    });
  }
};

export const cancelAppointment = async (req, res) => {
  const appointmentId = req.params.id;
  const patientId = req.session.userId;
  
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Use RETURNING to confirm which row was updated
    const result = await client.query(
      `UPDATE appointments 
       SET status = 'canceled' 
       WHERE id = $1 AND patient_id = $2
       RETURNING id`,
      [appointmentId, patientId]
    );
    
    // If no rows were returned, it means the appointment didn't exist or didn't belong to the user
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Appointment not found or you do not have permission to cancel it.' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Appointment canceled successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel appointment error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel appointment'
    });
  } finally {
    client.release();
  }
};