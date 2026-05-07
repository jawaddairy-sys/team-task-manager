import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL ? "LOADED ✅" : "MISSING ❌",
);
const { testConnection } = await import("./src/config/db.js");
const { default: app } = await import("./src/app.js");

const PORT = process.env.PORT || 5000;

const main = async () => {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 http://localhost:${PORT}`);
  });
};

main().catch((err) => {
  console.error("❌ Startup error:", err.message);
  process.exit(1);
});
