import express from "express";
import { getProfile } from "../controllers/user.js";
import { authMiddleware } from "../../utils/middleware.js";



const router = express.Router();

router.get("/profile",authMiddleware,getProfile);
// router.post("/login", login);

export default router;
