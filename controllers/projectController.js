import pool from "../connection.js";

// ✅ CREATE project
export const createProject = async (req, res) => {
  const { name, client_id, emp_id, billing_amt, active, billing_method, overtime_amt } = req.body;

  if (!name || !client_id || !emp_id) {
    return res
      .status(400)
      .json({ message: "❌ 'name', 'client_id', and 'emp_id' are required." });
  }

  // Validate billing_method if provided
  const validBillingMethods = ["days", "hours", "month"];
  const method = billing_method && validBillingMethods.includes(billing_method)
      ? billing_method
      : "days";

  try {
    const result = await pool.query(
      `INSERT INTO projects 
       (name, client_id, emp_id, billing_amt, active, billing_method, overtime_amt)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        client_id,
        emp_id,
        billing_amt || 0,
        active !== undefined ? active : true,
        method,
        overtime_amt || 0,
      ]
    );

    return res.status(201).json({
      message: "✅ Project created successfully",
      project: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error in createProject:", err);

    if (err.code === "23503") {
      return res.status(400).json({
        message: "❌ Invalid 'client_id' or 'emp_id' — referenced record not found.",
      });
    }

    if (err.code === "23505") {
      return res.status(400).json({
        message: "❌ Duplicate entry — a project with similar data already exists.",
      });
    }

    if (err.code === "22P02") {
      return res.status(400).json({
        message: "❌ Invalid data type provided (e.g., number expected but got text).",
      });
    }

    if (err.code === "23514") {
      return res.status(400).json({
        message: "❌ Invalid 'billing_method'. Must be 'days', 'hours', or 'month'.",
      });
    }

    return res.status(500).json({
      message: "❌ Unexpected error while creating project.",
      error: err.message,
    });
  }
};

// ✅ GET all projects
export const getAllProjects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS client_name 
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       ORDER BY p.id ASC`
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        message: "⚠️ No projects found in the database.",
        projects: [],
      });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error in getAllProjects:", err);
    res.status(500).json({
      message: "❌ Failed to fetch projects.",
      error: err.message,
    });
  }
};

// ✅ GET project by ID
export const getProjectById = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "❌ Invalid project ID provided." });
  }

  try {
    const result = await pool.query(`SELECT * FROM projects WHERE id=$1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "⚠️ Project not found." });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error in getProjectById:", err);
    res.status(500).json({
      message: "❌ Failed to fetch project details.",
      error: err.message,
    });
  }
};

// ✅ UPDATE project
export const updateProject = async (req, res) => {
  const { id } = req.params;
  const { name, client_id, emp_id, billing_amt, active, billing_method, overtime_amt } = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "❌ Invalid project ID provided." });
  }

  // Validate billing_method if provided
  const validBillingMethods = ["days", "hours", "month"];
  if (billing_method && !validBillingMethods.includes(billing_method)) {
    return res.status(400).json({
      message: "❌ Invalid 'billing_method'. Must be one of: 'days', 'hours', 'month'.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE projects 
       SET name=$1, client_id=$2, emp_id=$3, billing_amt=$4, active=$5, billing_method=$6, overtime_amt=$7
       WHERE id=$8 RETURNING *`,
      [
        name,
        client_id,
        emp_id,
        billing_amt || 0,
        active !== undefined ? active : true,
        billing_method || "days",
        overtime_amt || 0,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "⚠️ Project not found." });
    }

    res.status(200).json({
      message: "✅ Project updated successfully",
      project: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error in updateProject:", err);

    if (err.code === "23503") {
      return res.status(400).json({
        message: "❌ Invalid 'client_id' or 'emp_id' — referenced record not found.",
      });
    }

    if (err.code === "22P02") {
      return res.status(400).json({
        message: "❌ Invalid data type — please check your input fields.",
      });
    }

    if (err.code === "23514") {
      return res.status(400).json({
        message: "❌ Invalid 'billing_method'. Must be 'days', 'hours', or 'month'.",
      });
    }

    res.status(500).json({
      message: "❌ Unexpected error while updating project.",
      error: err.message,
    });
  }
};

// ✅ DELETE project
export const deleteProject = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "❌ Invalid project ID provided." });
  }

  try {
    const result = await pool.query(`DELETE FROM projects WHERE id=$1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "⚠️ Project not found or already deleted." });
    }

    res.status(200).json({ message: "✅ Project deleted successfully" });
  } catch (err) {
    console.error("❌ Error in deleteProject:", err);

    if (err.code === "23503") {
      return res.status(400).json({
        message: "❌ Cannot delete — this project is referenced in another table (foreign key constraint).",
      });
    }

    res.status(500).json({
      message: "❌ Unexpected error while deleting project.",
      error: err.message,
    });
  }
};
