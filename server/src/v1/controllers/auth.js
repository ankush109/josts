import bcrypt from "bcryptjs";
import User from "../../db/models/user.js";
import { signToken } from "../../utils/jwt.js";



export const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    const name = email.split("@")[0];
    if (!email.endsWith("@jost.com")) {
      return res.status(400).json({ message: "Email must be a jost.com email" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = signToken({ userId: user._id , userRole: user.role});

    res.status(201).json({
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ userId: user._id , userRole: user.role});

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
