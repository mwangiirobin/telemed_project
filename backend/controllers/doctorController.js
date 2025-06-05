import Doctor from '../models/doctorModel.js';
import pool from '../config/db.js';

export const createDoctor = async (req, res) => {
  // Authorization check remains unchanged
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  const client = await pool.connect();
  try {
    const { name, specialization, available_days, start_time, end_time } = req.body;
    
    // PostgreSQL parameterized query with RETURNING clause
    const result = await client.query(
      `INSERT INTO doctors 
       (name, specialization, available_days, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, specialization`,
      [name, specialization, JSON.stringify(available_days), start_time, end_time]
    );

    const newDoctor = result.rows[0];
    res.status(201).json(newDoctor);
  } catch (error) {
    console.error('Doctor creation error:', error);
    res.status(500).json({ error: 'Doctor creation failed' });
  } finally {
    client.release();
  }
};

export const updateAvailability = async (req, res) => {
  const client = await pool.connect();
  let transactionActive = false;
  try {
    await client.query('BEGIN');
    transactionActive = true;
    
    const doctorId = req.params.id;
    const { available_days, start_time, end_time } = req.body;

    // Verify doctor exists - uses model method (must be PostgreSQL compatible)
    const doctor = await Doctor.findById(doctorId, client);
    if (!doctor) {
      await client.query('ROLLBACK');
      transactionActive = false;
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // PostgreSQL parameterized update
    await client.query(
      `UPDATE doctors 
       SET available_days = $1, start_time = $2, end_time = $3
       WHERE id = $4`,
      [JSON.stringify(available_days), start_time, end_time, doctorId]
    );

    await client.query('COMMIT');
    transactionActive = false;
    res.json({ message: 'Availability updated successfully' });
  } catch (error) {
    if (transactionActive) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    console.error('Update error:', error);
    res.status(500).json({ error: 'Update failed' });
  } finally {
    client.release();
  }
};

export const listDoctors = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, name, specialization, 
      available_days, start_time, end_time 
      FROM doctors
    `);
    
    // Parse JSON fields and handle errors
    const parsedDoctors = result.rows.map(doctor => {
      try {
        return {
          ...doctor,
          available_days: JSON.parse(doctor.available_days)
        };
      } catch (e) {
        console.error('JSON parse error for doctor:', doctor.id, e);
        return {
          ...doctor,
          available_days: [] // Fallback to empty array
        };
      }
    });

    res.json(parsedDoctors);
  } catch (error) {
    console.error('Database error:', error.message);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  } finally {
    client.release();
  }
};

// This function relies on Doctor model - ensure model is PostgreSQL compatible
export const getDoctorById = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const doctor = await Doctor.findById(doctorId);
    if (doctor) {
      res.json(doctor);
    } else {
      res.status(404).json({ error: 'Doctor not found' });
    }
  } catch (error) {
    console.error(`Error in getDoctorById: ${error.message}`, error.stack);
    res.status(500).json({ error: 'Failed to retrieve doctor details' });
  }
};