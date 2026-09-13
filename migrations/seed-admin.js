const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

async function seed() {
  console.log('--- Seeding Default Staff Users ---');
  try {
    const salt = await bcrypt.genSalt(10);

    const usersToSeed = [
      {
        username: 'admin',
        password: 'AdminPassword123!',
        full_name: 'Dr. Lab Administrator',
        role: 'admin',
      },
      {
        username: 'labtech1',
        password: 'TechPassword123!',
        full_name: 'Rahul Sharma (Lab Tech)',
        role: 'lab-tech',
      },
      {
        username: 'reception1',
        password: 'DeskPassword123!',
        full_name: 'Pooja Verma (Front Desk)',
        role: 'front-desk',
      },
    ];

    for (const u of usersToSeed) {
      const hash = await bcrypt.hash(u.password, salt);
      await pool.query(
        `INSERT INTO users (username, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO UPDATE 
         SET full_name = EXCLUDED.full_name, role = EXCLUDED.role`,
        [u.username, hash, u.full_name, u.role]
      );
      console.log(`[USER SEEDED] Username: "${u.username}", Role: "${u.role}", Default Password: "${u.password}"`);
    }

    console.log('--- Seeding Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
