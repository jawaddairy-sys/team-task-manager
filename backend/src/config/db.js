import pkg from "pg";
const { Pool } = pkg;

console.log(
  "🔍 DATABASE_URL:",
  process.env.DATABASE_URL ? "LOADED ✅" : "MISSING ❌",
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT NOW() as current_time, version() as pg_version",
    );
    console.log("✅ PostgreSQL connected successfully!");
    console.log(`📅 Server time: ${result.rows[0].current_time}`);
    console.log(
      `🐘 PostgreSQL version: ${result.rows[0].pg_version.split(",")[0]}`,
    );
    return true;
  } catch (error) {
    console.error("❌ PostgreSQL connection error:", error.message);
    return false;
  } finally {
    if (client) client.release();
  }
};

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
  process.exit(-1);
});

export default pool;
export { testConnection };
