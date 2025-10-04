// @backend/src/server.js
import app from "./app.js";
import pool from "./db.js"; // PostgreSQL connection pool

// Render จะกำหนด PORT ให้ผ่าน env (ห้าม fix เป็น 3000)
// ยังรองรับ BACKEND_PORT เผื่อใช้บน dev เครื่องส่วนตัว
const PORT =
  Number(process.env.PORT) ||
  Number(process.env.BACKEND_PORT) ||
  3000;

async function startServer() {
  try {
    // ตรวจสุขภาพ DB ก่อนเริ่ม listen
    await pool.query("SELECT 1");
    console.log("Database connected successfully");

    const server = app.listen(PORT, () => {
      console.log(
        `Server listening on :${PORT} (NODE_ENV=${process.env.NODE_ENV || "development"})`
      );
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      try {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        server.close(() => {
          console.log("HTTP server closed.");
        });
        await pool.end().catch(() => {});
        process.exit(0);
      } catch (e) {
        console.error("Error during shutdown:", e);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // กัน process ล่มโดยไม่ log
    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled Rejection:", reason);
    });
    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception:", err);
    });
  } catch (err) {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  }
}

startServer();
