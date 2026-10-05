import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workspaceRouter from "./studio-workspace";
import studioLegalProfileRouter from "./studio-legal-profile";
import emailRouter from "./email";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workspaceRouter);
router.use(studioLegalProfileRouter);
router.use(emailRouter);

export default router;
