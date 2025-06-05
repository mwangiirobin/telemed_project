import pool from '../config/db.js';

const Doctor = {
  async findById(doctorId, client = null) {
    const exec = client || pool;
    try {
      // PostgreSQL parameterized query with $1 placeholder
      const result = await exec.query(
        `SELECT id, name, specialization, available_days, start_time, end_time 
         FROM doctors 
         WHERE id = $1`,
        [doctorId]
      );

      if (result.rowCount === 0) {
        return null;
      }

      const doctor = result.rows[0];
      let available_days_parsed = [];

      // Maintain the same JSON parsing logic
      if (doctor.available_days && typeof doctor.available_days === 'string') {
        try {
          available_days_parsed = JSON.parse(doctor.available_days);
          if (!Array.isArray(available_days_parsed)) {
            console.warn(`Parsed available_days for doctor ${doctor.id} is not an array:`, available_days_parsed);
            available_days_parsed = [];
          }
        } catch (parseError) {
          console.error(`Failed to parse available_days for doctor ${doctor.id} in findById:`, doctor.available_days, parseError);
        }
      } else if (Array.isArray(doctor.available_days)) {
        available_days_parsed = doctor.available_days;
      } else if (doctor.available_days != null) {
        console.warn(`available_days for doctor ${doctor.id} in findById is of unexpected type:`, typeof doctor.available_days, doctor.available_days);
      }

      return {
        ...doctor,
        available_days: available_days_parsed
      };

    } catch (error) {
      console.error(`Error finding doctor ${doctorId}: ${error.message}`, error.stack);
      throw new Error(`Error finding doctor: ${error.message}`);
    }
  },

  async listAvailable(client = null) {
    const exec = client || pool;
    try {
      // PostgreSQL query without placeholders
      const result = await exec.query(
        `SELECT id, name, specialization,
         available_days, start_time, end_time
         FROM doctors`
      );

      // Map through rows with same parsing logic
      return result.rows.map(doctor => {
        let available_days_parsed = [];

        if (doctor.available_days && typeof doctor.available_days === 'string') {
          try {
            available_days_parsed = JSON.parse(doctor.available_days);
            if (!Array.isArray(available_days_parsed)) {
              console.warn(`Parsed available_days for doctor ${doctor.id} is not an array:`, available_days_parsed);
              available_days_parsed = [];
            }
          } catch (parseError) {
            console.error(`Failed to parse available_days for doctor ${doctor.id}:`, doctor.available_days, parseError);
          }
        } else if (Array.isArray(doctor.available_days)) {
          available_days_parsed = doctor.available_days;
        } else if (doctor.available_days != null) {
           console.warn(`available_days for doctor ${doctor.id} is of an unexpected type:`, typeof doctor.available_days, doctor.available_days);
        }

        return {
          ...doctor,
          available_days: available_days_parsed
        };
      });
    } catch (error) {
      console.error(`Error listing doctors: ${error.message}`, error.stack);
      throw new Error(`Error listing doctors: ${error.message}`);
    }
  }
};

export default Doctor;