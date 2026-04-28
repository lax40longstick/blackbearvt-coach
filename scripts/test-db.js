import "dotenv/config";
import { getSql, closeSql } from "../db.js";

async function main() {
  const sql = getSql();
  const result = await sql`select current_database() as database_name, current_user as user_name, now() as connected_at`;
  console.log("Database connection successful.");
  console.log(result[0]);
  await closeSql();
}

main().catch(async (error) => {
  console.error("Database connection failed.");
  console.error(error.message || error);
  try {
    await closeSql();
  } catch {}
  process.exit(1);
});
