import bcrypt from 'bcrypt';
import pool from '../config/db.js';

export const registerPatient = async (req, res) => {
  const client = await pool.connect(); // Use client for PostgreSQL
  try {
    const { name, email, password, confirmPassword, age, gender, country } = req.body;

    // Validation remains unchanged
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // PostgreSQL parameterized query with RETURNING clause
    const result = await client.query(
      `INSERT INTO patients 
       (name, email, password, age, gender, country) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email`,
      [name, email, hashedPassword, age, gender, country]
    );
    
    // Access first row of returned data
    const newPatient = result.rows[0];
    return res.status(201).json(newPatient);

  } catch (error) {
    // PostgreSQL duplicate key error code
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }

    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release(); // Release client back to pool
  }
};

export const loginPatient = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);
    
    // PostgreSQL parameterized query
    const result = await client.query(
      'SELECT * FROM patients WHERE email = $1', 
      [email]
    );
    
    // Check if any rows returned
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('Password mismatch for user:', user.id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.role = 'patient';
    console.log('Session created:', req.session);

    res.json({ 
      message: 'Login successful',
      redirect: '/dashboard',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  } finally {
    client.release();
  }
};

// logoutPatient remains unchanged as it doesn't use SQL
export const logoutPatient = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
};