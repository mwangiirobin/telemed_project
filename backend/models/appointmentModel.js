import pool from '../config/db.js';

const Appointment = {
  // Create new appointment
  async create(appointmentData, client = null) {
    const exec = client || pool;
    try {
      const query = {
        text: `INSERT INTO appointments 
               (patient_id, doctor_id, appointment_date, appointment_time, status, appointment_duration)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id`,
        values: [
          appointmentData.patient_id,
          appointmentData.doctor_id,
          appointmentData.appointment_date,
          appointmentData.appointment_time,
          appointmentData.status || 'scheduled',
          appointmentData.appointment_duration || 30  // Default duration
        ]
      };
      
      const result = await exec.query(query);
      return result.rows[0].id;
    } catch (error) {
      console.error(`Error creating appointment: ${error.message}`, error.stack);
      throw new Error(`Error creating appointment: ${error.message}`);
    }
  },

  // Get appointments by patient
  async findByPatient(patientId, client = null) {
    const exec = client || pool;
    try {
      const query = {
        text: `SELECT a.*, d.name AS doctor_name 
               FROM appointments a
               JOIN doctors d ON a.doctor_id = d.id
               WHERE a.patient_id = $1`,
        values: [patientId]
      };
      
      const result = await exec.query(query);
      return result.rows;
    } catch (error) {
      console.error(`Error finding appointments: ${error.message}`, error.stack);
      throw new Error(`Error finding appointments: ${error.message}`);
    }
  },

  // Update appointment status
  async updateStatus(appointmentId, newStatus, client = null) {
    const exec = client || pool;
    try {
      const query = {
        text: `UPDATE appointments 
               SET status = $1
               WHERE id = $2`,
        values: [newStatus, appointmentId]
      };
      
      const result = await exec.query(query);
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error updating appointment: ${error.message}`, error.stack);
      throw new Error(`Error updating appointment: ${error.message}`);
    }
  },

  // Cancel appointment
  async cancel(appointmentId, client = null) {
    return this.updateStatus(appointmentId, 'canceled', client);
  },

  // Check appointment availability
  async checkAvailability(doctorId, date, time, client = null) {
    const exec = client || pool;
    try {
      const query = {
        text: `SELECT COUNT(*) as count 
               FROM appointments 
               WHERE doctor_id = $1 
                 AND appointment_date = $2
                 AND appointment_time >= $3::time 
                 AND appointment_time < ($3::time + interval '30 minutes')
                 AND status NOT IN ('canceled', 'completed', 'missed')`,
        values: [doctorId, date, time]
      };
      
      const result = await exec.query(query);
      return result.rows[0].count === 0;
    } catch (error) {
      console.error(`Error checking availability: ${error.message}`, error.stack);
      throw new Error(`Error checking availability: ${error.message}`);
    }
  }
};

export default Appointment;