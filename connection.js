import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

console.log("🔍 Checking env variables:");
console.log({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  passwordType: typeof process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: process.env.SSL,
});

// ✅ Create pool with conditional SSL config
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || "5432", 10),
  ssl:
    process.env.SSL === "true"
      ? { rejectUnauthorized: false } // for NeonDB / hosted Postgres
      : false,                        // for local Postgres
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool
  .connect()
  .then(() => console.log("✅ Connected to database successfully"))
  .catch((err) => {
    console.error("❌ Connection error details:");
    console.error(err);
  });

export default pool;
