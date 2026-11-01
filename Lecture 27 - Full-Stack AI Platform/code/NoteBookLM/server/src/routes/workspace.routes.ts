import { Router } from "express";
import {
    createWorkspace,
    deleteWorkspace,
    getWorkspace,
    listWorkspaces,
    updateWorkspace,
} from "../controllers/workspace.controller.js";
import { requiredAuth } from "../middleware/required-auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const workspaceRoutes = Router();

workspaceRoutes.use(requiredAuth);

workspaceRoutes.get("/", asyncHandler(listWorkspaces));
workspaceRoutes.post("/", asyncHandler(createWorkspace));
workspaceRoutes.get("/:workspaceId", asyncHandler(getWorkspace));
workspaceRoutes.patch("/:workspaceId", asyncHandler(updateWorkspace));
workspaceRoutes.delete("/:workspaceId", asyncHandler(deleteWorkspace));