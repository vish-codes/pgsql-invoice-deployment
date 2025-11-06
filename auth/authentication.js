import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pool from "../connection.js";
import z from 'zod';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingAdmin = await pool.query(
      "SELECT * FROM admins WHERE email = $1",
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO admins (email, password, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [email, hashedPassword]
    );

    res.status(201).json({
      message: `${email} admin created successfully`,
      admin: {
        id: result.rows[0].id,
        email: result.rows[0].email,
      },
    });
  } catch (error) {
    console.error("❌ Error while creating admin:", error);
    res.status(500).json({ message: "Error while creating admin" });
  }
};


export const login = async (req, res) => {
  const { email, password } = req.body;
  const { success } = loginSchema.safeParse(req.body);

  if (!success) {
    return res
      .status(411)
      .json({ message: "Invalid input / incorrect credentials" });
  }

  try {
    const result = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Admin doesn't exist" });
    }

    const admin = result.rows[0];

    const validPass = await bcrypt.compare(password, admin.password);
    if (!validPass) {
      return res.status(411).json({ message: "Invalid password" });
    }

    const userId = admin.id;
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "12h" });

    res.status(200).json({
      message: `User ${admin.email} logged in successfully`,
      token,
    });
  } catch (error) {
    console.error("❌ Error during login:", error);
    res.status(500).json({ message: "Error while logging in" });
  }
};
