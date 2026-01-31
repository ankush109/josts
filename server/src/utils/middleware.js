
import {
  verifyToken
} from "../utils/jwt.js"

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    console.log("Authenticated user:", req.user);
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};
