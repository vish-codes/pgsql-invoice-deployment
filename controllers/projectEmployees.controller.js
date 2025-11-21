import pool from "../connection.js";

/* ============================================================
   CREATE — Assign Multiple Employees to a Project
   ============================================================ */
export const assignEmployeeToProject = async (req, res) => {
  try {
    const { project_id, employees } = req.body;

    if (!project_id || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({
        message: "project_id and employees (array) are required",
      });
    }

    const insertedRows = [];

    for (const emp of employees) {
      const {
        emp_id,
        project_emp_code,
        billing_amt = 0,
        billing_method = "days",
        overtime_amt = 0
      } = emp;

      if (!emp_id || !project_emp_code) {
        return res.status(400).json({
          message: "Each employee must include emp_id and project_emp_code",
        });
      }

      const query = `
        INSERT INTO project_employees 
        (project_id, emp_id, project_emp_code, billing_amt, billing_method, overtime_amt)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING *;
      `;

      const result = await pool.query(query, [
        project_id,
        emp_id,
        project_emp_code,
        billing_amt,
        billing_method,
        overtime_amt,
      ]);

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
      SELECT 
        pe.id, 
        pe.project_id, 
        pe.emp_id, 
        pe.project_emp_code,
        pe.billing_amt,
        pe.billing_method,
        pe.overtime_amt,
        pe.assigned_at,
        e.name AS emp_name
      FROM project_employees pe
      LEFT JOIN employee e ON pe.emp_id = e.id
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
    const { id } = req.params;
    const {
      emp_id,
      project_emp_code,
      billing_amt,
      billing_method,
      overtime_amt
    } = req.body;

    const query = `
      UPDATE project_employees
      SET 
        emp_id = COALESCE($1, emp_id),
        project_emp_code = COALESCE($2, project_emp_code),
        billing_amt = COALESCE($3, billing_amt),
        billing_method = COALESCE($4, billing_method),
        overtime_amt = COALESCE($5, overtime_amt)
      WHERE id = $6
      RETURNING *;
    `;

    const result = await pool.query(query, [
      emp_id ?? null,
      project_emp_code ?? null,
      billing_amt ?? null,
      billing_method ?? null,
      overtime_amt ?? null,
      id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Assignment not found" });
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
