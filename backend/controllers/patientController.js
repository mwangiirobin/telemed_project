import pool from '../config/db.js';

export const getCurrentPatient = async (req, res) => {
  const client = await pool.connect(); // Use explicit client connection
  try {
    // PostgreSQL parameterized query with $1 placeholder
    const result = await client.query(
      `SELECT id, name, email, age, gender, country 
       FROM patients 
       WHERE id = $1`,
      [req.session.userId]
    );
    
    // Check using rowCount instead of array length
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Return first row from results
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient data' });
  } finally {
    client.release(); // Release client back to pool
  }
};