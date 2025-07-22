import { Router } from "express";
import { registerProjectController } from "@/controllers/project.controller";

const router = Router();

router.post("/", registerProjectController);

export default router;
