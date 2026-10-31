import { Router } from "express";
import { ragQuery } from "../controllers/rag.controller";

const router = Router();

router.post("/query", ragQuery);

export default router;