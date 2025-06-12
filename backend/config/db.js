// config/db.js
import pg from 'pg'; // Use 'pg' instead of 'mysql2/promise'
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg; // Destructure Pool from pg

// Option 1: Using individual environment variables (recommended for clarity)

//Option 2: Using the Supabase Connection String (often simpler)
// Supabase provides a single connection string that includes SSL settings.
// If you use this, you might not need individual host, port, user, etc.
 const pool = new Pool({
   connectionString: process.env.SUPABASE_CONNECTION_STRING,
   ssl: {
    rejectUnauthorized : false
   }
 });



// Test the connection (optional, but good for development)
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client for PostgreSQL', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release(); // Release the client back to the pool
    if (err) {
      return console.error('Error executing query for PostgreSQL', err.stack);
    }
    console.log('Successfully connected to Supabase PostgreSQL at:', result.rows[0].now);
  });
});

export default pool;