import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { config } from '../config.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const sql = await fs.readFile(path.join(dir, 'schema.sql'), 'utf8');
  await pool.query(sql);

  // Ensure the admin account exists (admin actor manages the knowledge base).
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [config.admin.email]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash(config.admin.password, 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
      [config.admin.name, config.admin.email, hash],
    );
    console.log(`Created admin account ${config.admin.email}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => { console.log('Migration complete'); return pool.end(); })
    .catch((err) => { console.error(err); process.exit(1); });
}
