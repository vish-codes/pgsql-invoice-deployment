import pool from "../connection.js";

/* ============================================================
   CREATE — Assign Multiple Employees to a Project
   ============================================================ */
export const assignEmployeeToProject = async (req, res) => {
  try {
    const { project_id, emp_ids } = req.body;

    if (!project_id || !Array.isArray(emp_ids) || emp_ids.length === 0) {
      return res.status(400).json({
        message: "project_id and emp_ids (array) are required",
      });
    }

    const insertedRows = [];

    for (const emp_id of emp_ids) {
      const query = `
        INSERT INTO project_employees (project_id, emp_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        RETURNING *;
      `;
      const result = await pool.query(query, [project_id, emp_id]);

      if (result.rows[0]) {
        insertedRows.push(result.rows[0]);
      }
    }

    return res.status(201).json({
      message: "Employees assigned successfully",
      assigned: insertedRows,
    });

  } catch (err) {
    console.error("❌ Error assigning employees:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

/* ============================================================
   READ — Get All Employees Assigned to a Project
   ============================================================ */
export const getEmployeesByProject = async (req, res) => {
  try {
    const { project_id } = req.params;

    const query = `
      SELECT pe.id, pe.project_id, pe.emp_id, e.emp_name 
      FROM project_employees pe
      LEFT JOIN employees e ON pe.emp_id = e.emp_id
      WHERE pe.project_id = $1;
    `;

    const result = await pool.query(query, [project_id]);

    return res.status(200).json({
      message: "Employees fetched successfully",
      employees: result.rows,
    });

  } catch (err) {
    console.error("❌ Error fetching employees:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

/* ============================================================
   UPDATE — Change Employee Assigned to a Project
   ============================================================ */
export const updateEmployeeAssignment = async (req, res) => {
  try {
    const { id } = req.params;        // assignment row id
    const { emp_id } = req.body;

    if (!emp_id) {
      return res.status(400).json({
        message: "emp_id is required",
      });
    }

    const query = `
      UPDATE project_employees
      SET emp_id = $1
      WHERE id = $2
      RETURNING *;
    `;

    const result = await pool.query(query, [emp_id, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    return res.status(200).json({
      message: "Assignment updated successfully",
      assignment: result.rows[0],
    });

  } catch (err) {
    console.error("❌ Error updating assignment:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

/* ============================================================
   DELETE — Remove One Employee from a Project
   ============================================================ */
export const deleteEmployeeFromProject = async (req, res) => {
  try {
    const { project_id, emp_id } = req.params;

    const query = `
      DELETE FROM project_employees
      WHERE project_id = $1 AND emp_id = $2
      RETURNING *;
    `;

    const result = await pool.query(query, [project_id, emp_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    return res.status(200).json({
      message: "Employee removed from project successfully",
      deleted: result.rows[0],
    });

  } catch (err) {
    console.error("❌ Error deleting assignment:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

/* ============================================================
   DELETE ALL — Remove All Employees from a Project
   ============================================================ */
export const deleteAllEmployeesFromProject = async (req, res) => {
  try {
    const { project_id } = req.params;

    const query = `
      DELETE FROM project_employees
      WHERE project_id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [project_id]);

    return res.status(200).json({
      message: "All employees removed from project",
      deleted: result.rows,
    });

  } catch (err) {
    console.error("❌ Error deleting all employees:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
};
