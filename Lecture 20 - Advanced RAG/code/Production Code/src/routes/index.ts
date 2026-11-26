import { Router } from "express";
import ragRouter from "./rag.route";

export const routes = Router();

routes.use("/rag", ragRouter);

export { ragRouter };