import Appointment from '../models/appointmentModel.js';
import pool from '../config/db.js';

export const bookAppointment = async (req, res) => {
  const connection = await pool.getConnection();
  let transactionActive = false; // Track transaction state
  try {
    await connection.query('BEGIN'); // PostgreSQL transaction start
    transactionActive = true;

    // Destructure and validate input (unchanged)
    const { doctorId, datetime } = req.body;
    const patientId = req.session.userId;
    
    if (!doctorId || !datetime) {
      await connection.query('ROLLBACK');
      transactionActive = false;
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate datetime format (unchanged)
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(datetime)) {
      await connection.query('ROLLBACK');
      transactionActive = false;
      return res.status(400).json({ error: 'Invalid datetime format. Use YYYY-MM-DDTHH:mm' });
    }

    // Parse datetime (unchanged)
    const [date, time] = datetime.split('T');
    const appointmentDate = new Date(datetime);
    
    // Prevent past appointments (unchanged)
    if (appointmentDate < new Date()) {
      await connection.query('ROLLBACK');
      transactionActive = false;
      return res.status(400).json({ error: 'Cannot book appointments in the past' });
    }

    // Get doctor availability - Changed to PostgreSQL parameterized query
    const doctorResult = await connection.query(
      `SELECT available_days, start_time, end_time 
       FROM doctors WHERE id = $1`,
      [doctorId]
    );
    
    if (doctorResult.rows.length === 0) {
      await connection.query('ROLLBACK');
      transactionActive = false;
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctor = doctorResult.rows[0];
    
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

    // Check existing appointments - Changed to PostgreSQL syntax
    const existingResult = await connection.query(
      `SELECT * FROM appointments 
       WHERE doctor_id = $1 
       AND appointment_date = $2
       AND appointment_time >= $3::time 
       AND appointment_time < ($3::time + interval '30 minutes')`,
      [doctorId, date, time]
    );

    if (existingResult.rows.length > 0) {
      await connection.query('ROLLBACK');
      transactionActive = false;
      return res.status(409).json({ error: 'Time slot conflict with existing appointment' });
    }

    // Create appointment - Changed to PostgreSQL with RETURNING clause
    const insertResult = await connection.query(
      `INSERT INTO appointments 
        (patient_id, doctor_id, appointment_date, appointment_time, status, appointment_duration) 
       VALUES 
        ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        patientId, 
        doctorId, 
        date,
        time,
        'scheduled',
        30
      ]
    );

    await connection.query('COMMIT'); // PostgreSQL commit
    transactionActive = false;
    res.status(201).json({ 
      success: true,
      appointmentId: insertResult.rows[0].id, // Get ID from RETURNING
      message: 'Appointment booked successfully'
    });

  } catch (error) {
    // Rollback only if transaction was active
    if (transactionActive) {
      try {
        await connection.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    console.error('Booking error:', error);
    res.status(500).json({ 
      error: 'Booking failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

export const getAppointments = async (req, res) => {
  // Unchanged (assumes model handles PostgreSQL)
  try {
    const appointments = await Appointment.findByPatient(req.session.userId);
    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch appointments',
      details: error.message 
    });
  }
};

export const cancelAppointment = async (req, res) => {
  const connection = await pool.getConnection();
  let transactionActive = false;
  try {
    await connection.query('BEGIN');
    transactionActive = true;
    
    const appointmentId = req.params.id;
    const patientId = req.session.userId;

    // Combined ownership check and update - Changed to PostgreSQL
    const result = await connection.query(
      `UPDATE appointments 
       SET status = 'canceled' 
       WHERE id = $1 AND patient_id = $2
       RETURNING id`,
      [appointmentId, patientId]
    );
    
    if (result.rowCount === 0) {
      await connection.query('ROLLBACK');
      transactionActive = false;
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await connection.query('COMMIT');
    transactionActive = false;
    res.json({ message: 'Appointment canceled successfully' });

  } catch (error) {
    if (transactionActive) {
      try {
        await connection.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    console.error('Cancel error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel appointment',
      details: error.message 
    });
  } finally {
    connection.release();
  }
};