import pool from "../connection.js";

/* ============================================================
   CREATE PROJECT (with employee assignments)
   ============================================================ */
export const createProject = async (req, res) => {
  const { 
    name, 
    client_id, 
    emp_ids, 
    billing_amt, 
    active, 
    billing_method, 
    overtime_amt 
  } = req.body;

  if (!name || !client_id) {
    return res.status(400).json({
      message: "❌ 'name' and 'client_id' are required."
    });
  }

  if (!Array.isArray(emp_ids) || emp_ids.length === 0) {
    return res.status(400).json({
      message: "❌ 'emp_ids' must be a non-empty array."
    });
  }

  const validBillingMethods = ["days", "hours", "month"];
  const method = billing_method && validBillingMethods.includes(billing_method)
    ? billing_method
    : "days";

  try {
    // Create project
    const projectResult = await pool.query(
      `INSERT INTO projects 
        (name, client_id, billing_amt, active, billing_method, overtime_amt)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        client_id,
        billing_amt || 0,
        active !== undefined ? active : true,
        method,
        overtime_amt || 0,
      ]
    );

    const project = projectResult.rows[0];

    // Assign employees
    const assigned = [];
    for (const emp_id of emp_ids) {
      const result = await pool.query(
        `INSERT INTO project_employees (project_id, emp_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [project.id, emp_id]
      );

      if (result.rows[0]) {
        assigned.push(result.rows[0]);
      }
    }

    return res.status(201).json({
      message: "✅ Project created successfully",
      project,
      assignedEmployees: assigned
    });

  } catch (err) {
    console.error("❌ Error in createProject:", err);

    if (err.code === "23503") {
      return res.status(400).json({
        message: "❌ Invalid 'client_id' or one of the 'emp_ids'"
      });
    }

    res.status(500).json({
      message: "❌ Unexpected error while creating project.",
      error: err.message,
    });
  }
};

/* ============================================================
   GET ALL PROJECTS (with client name)
   ============================================================ */
export const getAllProjects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, 
              c.name AS client_name
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       ORDER BY p.id ASC`
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error in getAllProjects:", err);
    res.status(500).json({
      message: "❌ Failed to fetch projects.",
      error: err.message,
    });
  }
};

/* ============================================================
   GET PROJECT BY ID (including assigned employees)
   ============================================================ */
export const getProjectById = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "❌ Invalid project ID." });
  }

  try {
    const projectResult = await pool.query(
      `SELECT * FROM projects WHERE id=$1`,
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: "⚠️ Project not found." });
    }

    const employees = await pool.query(
      `SELECT pe.emp_id, e.name AS emp_name
       FROM project_employees pe
       LEFT JOIN employees e ON pe.emp_id = e.emp_id
       WHERE pe.project_id = $1`,
      [id]
    );

    return res.status(200).json({
      ...projectResult.rows[0],
      assigned_employees: employees.rows
    });

  } catch (err) {
    console.error("❌ Error in getProjectById:", err);
    res.status(500).json({
      message: "❌ Failed to fetch project.",
      error: err.message,
    });
  }
};

/* ============================================================
   UPDATE PROJECT DETAILS (NOT EMPLOYEES)
   ============================================================ */
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;  
    const { 
      name, 
      client_id, 
      emp_ids,        // <-- array of employees
      billing_amt, 
      active, 
      billing_method, 
      overtime_amt 
    } = req.body;

    // Validate project exists
    const existingProject = await pool.query(
      `SELECT * FROM projects WHERE id = $1`,
      [id]
    );

    if (existingProject.rowCount === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Update main project table
    const updatedProject = await pool.query(
      `UPDATE projects
       SET name = $1,
           client_id = $2,
           billing_amt = $3,
           active = $4,
           billing_method = $5,
           overtime_amt = $6
       WHERE id = $7
       RETURNING *`,
      [
        name || existingProject.rows[0].name,
        client_id || existingProject.rows[0].client_id,
        billing_amt ?? existingProject.rows[0].billing_amt,
        active ?? existingProject.rows[0].active,
        billing_method || existingProject.rows[0].billing_method,
        overtime_amt ?? existingProject.rows[0].overtime_amt,
        id
      ]
    );

    let assignedEmployees = [];

    /* ------------------------------------------------------------
       UPDATE PROJECT EMPLOYEES (IF emp_ids PROVIDED)
    ------------------------------------------------------------ */
    if (Array.isArray(emp_ids)) {

      // 1️⃣ Remove all previous employees for that project
      await pool.query(
        `DELETE FROM project_employees WHERE project_id = $1`,
        [id]
      );

      // 2️⃣ Insert new employees
      for (const emp_id of emp_ids) {
        const insertQuery = `
          INSERT INTO project_employees (project_id, emp_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          RETURNING *;
        `;
        const insertResult = await pool.query(insertQuery, [id, emp_id]);

        if (insertResult.rows[0]) {
          assignedEmployees.push(insertResult.rows[0]);
        }
      }
    }

    return res.status(200).json({
      message: "Project updated successfully",
      project: updatedProject.rows[0],
      updatedEmployees: assignedEmployees
    });

  } catch (err) {
    console.error("❌ Error updating project:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message
    });
  }
};
/* ============================================================
   DELETE PROJECT
   ============================================================ */
export const deleteProject = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "❌ Invalid project ID." });
  }

  try {
    // Delete employee links first
    await pool.query(
      `DELETE FROM project_employees WHERE project_id=$1`,
      [id]
    );

    const result = await pool.query(
      `DELETE FROM projects WHERE id=$1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "⚠️ Project not found or already deleted."
      });
    }

    return res.status(200).json({
      message: "✅ Project deleted successfully"
    });

  } catch (err) {
    console.error("❌ Error in deleteProject:", err);
    res.status(500).json({
      message: "❌ Unexpected error while deleting project.",
      error: err.message,
    });
  }
};
