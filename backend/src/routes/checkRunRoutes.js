import { Router } from "express";
import { authRequired } from "../middleware/authRequired.js";
import { uploadPhoto } from "../utils/upload.js";
import {
  createRun,
  myRuns,
  getRun,
  upsertEntry,
  submitRun,
  getRunStatus
} from "../controllers/checkRunsController.js";

const router = Router();

router.post("/", authRequired, createRun);
router.get("/status", authRequired, getRunStatus);
router.get("/me", authRequired, myRuns);
router.get("/:id", authRequired, getRun);

// ✅ ÚNICA ruta para subir / actualizar ítems con foto
router.post(
  "/:runId/entries",
  authRequired,
  uploadPhoto.single("photo"),
  upsertEntry
);

router.post("/:id/submit", authRequired, submitRun);

export default router;
