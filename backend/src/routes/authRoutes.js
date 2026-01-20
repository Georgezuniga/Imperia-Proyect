import { Router } from "express";
import { authRequired } from "../middleware/authRequired.js";
import { register, login, me, forgotPassword, resetPassword } from "../controllers/authController.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authRequired, me);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
