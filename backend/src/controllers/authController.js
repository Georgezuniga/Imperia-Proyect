import bcrypt from "bcrypt";
import crypto from "crypto";
import { pool } from "../db.js";
import { signToken } from "../utils/jwt.js";
import { isAllowedEmail, requireFields, ALLOWED_EMAIL_DOMAIN } from "../utils/validators.js";

export async function register(req, res) {
  try {
    const missing = requireFields(req.body, ["full_name", "email", "password"]);
    if (missing) return res.status(400).json({ message: `Missing field: ${missing}` });

    const { full_name, email, password } = req.body;

    if (!isAllowedEmail(email)) {
      return res.status(400).json({ message: `Solo se permiten correos ${ALLOWED_EMAIL_DOMAIN}` });
      }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1,$2,$3,'employee')
       RETURNING id, full_name, email, role`,
      [full_name, email.toLowerCase(), password_hash]
    );

    const user = result.rows[0];
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return res.status(201).json({ user, token });
  } catch (err) {
    if (String(err?.message || "").includes("duplicate key")) {
      return res.status(409).json({ message: "El correo ya está registrado" });
    }
    console.error(err);
    return res.status(500).json({ message: "Error en el servidor" });
  }
}

export async function login(req, res) {
  try {
    const missing = requireFields(req.body, ["email", "password"]);
    if (missing) return res.status(400).json({ message: `Missing field: ${missing}` });

    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, role
       FROM users WHERE email=$1`,
      [email.toLowerCase()]
    );

    const userRow = result.rows[0];
    if (!userRow) return res.status(401).json({ message: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });

    const user = { id: userRow.id, full_name: userRow.full_name, email: userRow.email, role: userRow.role };
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return res.json({ user, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error en el servidor" });
  }
}

export async function me(req, res) {
  // authRequired already put req.user
  const result = await pool.query(
    "SELECT id, full_name, email, role, created_at FROM users WHERE id=$1",
    [req.user.id]
  );
  return res.json({ user: result.rows[0] || null });
}

export async function forgotPassword(req, res) {
  try {
    const missing = requireFields(req.body, ["email"]);
    if (missing) return res.status(400).json({ message: `Missing field: ${missing}` });

    const { email } = req.body;
    const userRes = await pool.query("SELECT id, email FROM users WHERE email=$1", [email.toLowerCase()]);
    const user = userRes.rows[0];

    // Always respond OK to avoid account enumeration
    if (!user) return res.json({ message: "Si el correo existe, se enviará un enlace de recuperación" });

    const reset_token = crypto.randomBytes(32).toString("hex");
    const reset_expires_at = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await pool.query(
      "UPDATE users SET reset_token=$1, reset_expires_at=$2 WHERE id=$3",
      [reset_token, reset_expires_at, user.id]
    );

    // Simulated delivery
    console.log("[RESET LINK] token:", reset_token);

    return res.json({ message: "Si el correo existe, se enviará un enlace de recuperación" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error en el servidor" });
  }
}

export async function resetPassword(req, res) {
  try {
    const missing = requireFields(req.body, ["token", "password"]);
    if (missing) return res.status(400).json({ message: `Missing field: ${missing}` });

    const { token, password } = req.body;
    if (String(password).length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const userRes = await pool.query(
      `SELECT id, reset_expires_at
       FROM users
       WHERE reset_token=$1`,
      [token]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(400).json({ message: "Token inválido" });
    if (!user.reset_expires_at || new Date(user.reset_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: "Token expirado" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE users
       SET password_hash=$1, reset_token=NULL, reset_expires_at=NULL
       WHERE id=$2`,
      [password_hash, user.id]
    );

    return res.json({ message: "Contraseña actualizada" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error en el servidor" });
  }
}
