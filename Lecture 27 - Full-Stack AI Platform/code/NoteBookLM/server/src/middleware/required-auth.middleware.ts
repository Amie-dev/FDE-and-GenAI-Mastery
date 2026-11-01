import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth.js";
import type { Session } from "../lib/session.js";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";

declare module "express-serve-static-core" {
  interface Request {
    session: Session;
  }
}

export async function requiredAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session?.user) {
    res.status(401).json({
      error: "Unauthorize",
    });
  }

  req.session = session!;
  next();
}
