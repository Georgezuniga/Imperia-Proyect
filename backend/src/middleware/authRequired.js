import { verifyToken } from "../utils/jwt.js";
import { pool } from "../db.js";

export async function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const [type, token] = auth.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }

    const decoded = verifyToken(token);

    // ✅ Validar que el usuario del token exista en DB (evita tokens fantasma)
    const u = await pool.query(
      "SELECT id, email, role, full_name FROM users WHERE id=$1 LIMIT 1",
      [decoded.id]
    );

    if (!u.rows[0]) {
      return res.status(401).json({ message: "Sesión inválida. Vuelve a iniciar sesión." });
    }

    // Si quieres, aquí también puedes “forzar” que role venga de DB y no del token
    req.user = {
      id: u.rows[0].id,
      email: u.rows[0].email,
      role: u.rows[0].role,
      full_name: u.rows[0].full_name,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
