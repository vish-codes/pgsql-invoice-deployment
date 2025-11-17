import express from "express";
import {
  assignEmployeeToProject,
  getEmployeesByProject,
  updateEmployeeAssignment,
  deleteEmployeeFromProject,
  deleteAllEmployeesFromProject
} from "../controllers/projectEmployees.controller.js";

const router = express.Router();

// CREATE — Assign multiple employees
router.post("/", assignEmployeeToProject);

// READ — Get all employees of a project
router.get("/:project_id", getEmployeesByProject);

// UPDATE — Update a single employee assignment
router.put("/:id", updateEmployeeAssignment);

// DELETE — Remove one employee from a project
router.delete("/:project_id/:emp_id", deleteEmployeeFromProject);

// DELETE ALL — Remove all employees from a project
router.delete("/all/:project_id", deleteAllEmployeesFromProject);

export default router;
