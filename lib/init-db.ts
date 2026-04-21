import { query } from "./db";

export async function createTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(20) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100),
      is_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(10) NOT NULL,
      type VARCHAR(20) NOT NULL, -- 'email_verification', 'phone_verification', 'password_reset'
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_devices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      device_fingerprint VARCHAR(255) NOT NULL,
      last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, device_fingerprint)
    );

    CREATE TABLE IF NOT EXISTS free_trial_usage (
      id SERIAL PRIMARY KEY,
      device_fingerprint VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(20),
      used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Tables created successfully");
}