import pool from "../connection.js";

/* ============================================================
   CREATE PROJECT (with employee billing details)
   ============================================================ */
export const createProject = async (req, res) => {
  const {
    name,
    client_id,
    employees,
  } = req.body;

  if (!name || !client_id) {
    return res.status(400).json({
      message: "❌ 'name' and 'client_id' are required."
    });
  }

  if (!Array.isArray(employees) || employees.length === 0) {
    return res.status(400).json({
      message: "❌ 'employees' must be a non-empty array."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Insert Project
    const projectResult = await client.query(
      `INSERT INTO projects (name, client_id)
       VALUES ($1, $2)
       RETURNING *`,
      [name, client_id]
    );

    const project = projectResult.rows[0];
    const assignedEmployees = [];

    // 2️⃣ Insert employee-level billing details
    for (const emp of employees) {
      const { 
        emp_id, 
        project_emp_code, 
        billing_amt, 
        billing_method, 
        overtime_amt 
      } = emp;

      const insertEmp = await client.query(
        `INSERT INTO project_employees 
          (project_id, emp_id, project_emp_code, billing_amt, billing_method, overtime_amt)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          project.id,
          emp_id,
          project_emp_code || null,
          billing_amt || 0,
          billing_method || "days",
          overtime_amt || 0
        ]
      );

      assignedEmployees.push(insertEmp.rows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "✅ Project created successfully",
      project,
      assignedEmployees
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error in createProject:", err);
    return res.status(500).json({
      message: "❌ Unexpected error while creating project.",
      error: err.message,
    });
  } finally {
    client.release();
  }
};


/* ============================================================
   GET ALL PROJECTS (with employees + billing data)
   ============================================================ */
export const getAllProjects = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        p.*, 
        c.name AS client_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pe.id,
              'emp_id', pe.emp_id,
              'emp_name', e.name,
              'project_emp_code', pe.project_emp_code,
              'billing_amt', pe.billing_amt,
              'billing_method', pe.billing_method,
              'overtime_amt', pe.overtime_amt
            )
          ) FILTER (WHERE pe.emp_id IS NOT NULL),
          '[]'
        ) AS employees
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN project_employees pe ON pe.project_id = p.id
      LEFT JOIN employee e ON e.id = pe.emp_id
      GROUP BY p.id, c.name
      ORDER BY p.id ASC;
      `
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
   GET PROJECT BY ID (with employee billing details)
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

    if (projectResult.rowCount === 0) {
      return res.status(404).json({ message: "⚠️ Project not found." });
    }

    const employees = await pool.query(
      `SELECT 
          pe.id,
          pe.emp_id,
          e.name AS emp_name,
          pe.project_emp_code,
          pe.billing_amt,
          pe.billing_method,
          pe.overtime_amt
       FROM project_employees pe
       LEFT JOIN employee e ON pe.emp_id = e.id
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
   UPDATE PROJECT + EMPLOYEES (billing details)
   ============================================================ */
export const updateProject = async (req, res) => {
  const { id } = req.params;
  const { name, client_id, employees } = req.body;

  const client = await pool.connect();

  try {
    // Validate project exists
    const existingProject = await client.query(
      `SELECT * FROM projects WHERE id = $1`,
      [id]
    );

    if (existingProject.rowCount === 0) {
      return res.status(404).json({ message: "❌ Project not found" });
    }
    await client.query("BEGIN");

    // Update project table
    const updatedProject = await client.query(
      `UPDATE projects
       SET name = $1,
           client_id = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [
        name || existingProject.rows[0].name,
        client_id || existingProject.rows[0].client_id,
        id
      ]
    );

    let updatedEmployees = [];

    // Update employee assignments if provided
    if (Array.isArray(employees)) {
      // Remove old employee records
      await client.query(
        `DELETE FROM project_employees WHERE project_id = $1`,
        [id]
      );

      // Insert new employee records
      for (const emp of employees) {
        const {
          emp_id,
          project_emp_code,
          billing_amt,
          billing_method,
          overtime_amt
        } = emp;
        const insert = await client.query(
          `INSERT INTO project_employees
            (project_id, emp_id, project_emp_code, billing_amt, billing_method, overtime_amt)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            id,
            emp_id,
            project_emp_code || null,
            billing_amt || 0,
            billing_method || "days",
            overtime_amt || 0
          ]
        );

        updatedEmployees.push(insert.rows[0]);
      }
    }
    await client.query("COMMIT");

    return res.status(200).json({
      message: "Project updated successfully",
      project: updatedProject.rows[0],
      updatedEmployees
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating project:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message
    });
  } finally {
    client.release();
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
    // Delete employee mappings first (cascade also handles but safe)
    await pool.query(
      `DELETE FROM project_employees WHERE project_id=$1`,
      [id]
    );

    const result = await pool.query(
      `DELETE FROM projects WHERE id=$1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
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
