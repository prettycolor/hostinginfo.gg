/** TREAT AS IMMUTABLE - This file is protected by the file-edit tool
 *
 * Database connection setup using Drizzle ORM with MySQL2
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { getDatabaseCredentials } from "./config";
import * as schema from "./schema";

// Get database configuration
const dbConfig = getDatabaseCredentials();
const dbSslEnabled = ["1", "true", "yes", "on"].includes(
  String(process.env.DB_SSL || "").toLowerCase(),
);

// Create MySQL connection pool (SSL optional via DB_SSL)
const poolConnection = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  ...(dbSslEnabled
    ? {
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {}),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create Drizzle instance
export const db = drizzle(poolConnection, { schema, mode: "default" });

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await poolConnection.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closeConnection(): Promise<void> {
  await poolConnection.end();
}
