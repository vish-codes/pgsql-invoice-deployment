import express from "express";
import {
  getAllCompanies,
  getCompanyById,
} from "../controllers/companyController.js";

const router = express.Router();

router.get("/", getAllCompanies);
router.get("/:id", getCompanyById);

export default router;
