import { Router } from "express";
import { authRequired } from "../middleware/authRequired.js";
import { listSections, listItemsBySection } from "../controllers/sectionsController.js";

const router = Router();

router.get("/", authRequired, listSections);
router.get("/:id/items", authRequired, listItemsBySection);

export default router;
