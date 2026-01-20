import { Router } from "express";
import { authRequired } from "../middleware/authRequired.js";
import { roleRequired } from "../middleware/roleRequired.js";
import { dashboardSummary } from "../controllers/adminController.js";
import {
  listRuns,
  reviewRun,
  listUsers,
  setUserRole,
  deleteItem,
  deleteSection,
  deleteRun,
} from "../controllers/adminController.js";
import {
  adminListStructure,
  adminCreateSection,
  adminUpdateSection,
  adminCreateItem,
  adminUpdateItem,
} from "../controllers/sectionsController.js";

const router = Router();

// Runs
router.get("/check-runs", authRequired, roleRequired(["admin", "supervisor"]), listRuns);
router.post("/check-runs/:id/review", authRequired, roleRequired(["admin", "supervisor"]), reviewRun);

// ✅ NUEVO: eliminar run completo (borra entries del run)
router.delete("/check-runs/:id", authRequired, roleRequired(["admin", "supervisor"]), deleteRun);


// Structure (admin only)
router.get("/structure", authRequired, roleRequired(["admin"]), adminListStructure);

router.post("/sections", authRequired, roleRequired(["admin"]), adminCreateSection);
router.put("/sections/:id", authRequired, roleRequired(["admin"]), adminUpdateSection);

router.post("/items", authRequired, roleRequired(["admin"]), adminCreateItem);
router.put("/items/:id", authRequired, roleRequired(["admin"]), adminUpdateItem);

// ✅ DELETE (admin/supervisor)
router.delete("/items/:id", authRequired, roleRequired(["admin", "supervisor"]), deleteItem);
router.delete("/sections/:id", authRequired, roleRequired(["admin", "supervisor"]), deleteSection);

// Users (admin only)
router.get("/users", authRequired, roleRequired(["admin"]), listUsers);
router.put("/users/:id/role", authRequired, roleRequired(["admin"]), setUserRole);


router.get(
  "/dashboard/summary",
  authRequired,
  roleRequired(["admin","supervisor"]),
  dashboardSummary
);
export default router;
