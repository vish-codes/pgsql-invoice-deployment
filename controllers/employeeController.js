import pool from "../connection.js";

// ✅ CREATE Employee
export const createEmployee = async (req, res) => {
  const { name, position, working_on, emp_code } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO employee (name, position, working_on, emp_code)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, position || null, working_on || null, emp_code]
    );

    res.status(201).json({
      message: "✅ Employee created successfully",
      employee: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error in createEmployee:", err);
    res.status(500).send("Server Error");
  }
};

// ✅ GET All Employees
export const getAllEmployees = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM employee ORDER BY id ASC`);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error in getAllEmployees:", err);
    res.status(500).send("Server Error");
  }
};

// ✅ GET Employee by ID
export const getEmployeeById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM employee WHERE id=$1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error in getEmployeeById:", err);
    res.status(500).send("Server Error");
  }
};

// ✅ UPDATE Employee
export const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { name, position, working_on, emp_code } = req.body;

  try {
    const result = await pool.query(
      `UPDATE employee
       SET name=$1, position=$2, working_on=$3, emp_code=$4
       WHERE id=$5 RETURNING *`,
      [name, position, working_on, emp_code, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      message: "✅ Employee updated successfully",
      employee: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error in updateEmployee:", err);
    res.status(500).send("Server Error");
  }
};

// ✅ DELETE Employee
export const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM employee WHERE id=$1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json({ message: "✅ Employee deleted successfully" });
  } catch (err) {
    console.error("❌ Error in deleteEmployee:", err);
    res.status(500).send("Server Error");
  }
};
