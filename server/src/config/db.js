// TODO: Implement this module.
import mysql from "mysql2/promise";
import { env } from "./env.js";

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "Z", // JS Dates <-> UTC
  decimalNumbers: false, // keep DECIMAL as strings; we convert via kobo
});

// Make CURRENT_TIMESTAMP defaults UTC too, so they match JS Dates
pool.pool.on("connection", (conn) => conn.query("SET time_zone = '+00:00'"));
