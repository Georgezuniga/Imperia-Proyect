import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";

import authRoutes from "./routes/authRoutes.js";
import sectionRoutes from "./routes/sectionRoutes.js";
import checkRunRoutes from "./routes/checkRunRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

// ✅ Render / proxies (IMPORTANTE)
app.set("trust proxy", 1);

// --- Security & basics ---
app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : true,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "2mb" }));

// Basic rate limit for API
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Serve uploaded images
const uploadsDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsDir));

// --- ROUTES ---
// ✅ Root (para que al abrir la URL NO salga Not Found)
app.get("/", (req, res) => {
  res
    .status(200)
    .send("IMPERIA API OK ✅  (usa /api/health)");
});

// ✅ Health check pro
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "imperia-api",
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/check-runs", checkRunRoutes);
app.use("/api/admin", adminRoutes);

// ✅ (Opcional PRO) si existe frontend/dist, servirlo (un solo deploy)
const distPath = path.join(process.cwd(), "frontend", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback (React Router)
  app.get("*", (req, res, next) => {
    // Si es /api o /uploads, que no choque
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  // 404 JSON para API / lo demás
  app.use((req, res) => res.status(404).json({ message: "Not Found" }));
}

// Error handler
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  const status = Number(err?.statusCode) || 500;
  res.status(status).json({ message: err?.message || "Server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`IMPERIA backend running on port ${PORT}`));
