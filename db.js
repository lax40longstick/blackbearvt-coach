// Optional direct Postgres connection for admin scripts ONLY.
// Never import this in browser code or serverless handlers that don't need it.
// The app path uses supabase-js, not this.

import postgres from "postgres";

let sql = null;

export function getSql() {
  if (sql) return sql;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. This utility is for admin scripts only — " +
      "the app uses supabase-js for its production data path."
    );
  }
  sql = postgres(connectionString);
  return sql;
}

export async function closeSql() {
  if (sql) {
    await sql.end({ timeout: 5 });
    sql = null;
  }
}

export default { getSql, closeSql };
