import pool from "../connection.js";

// Fetch projects + employees for one client
export const getClientFullDetails = async (req, res) => {
  const { clientId } = req.params;

  try {
    const query = `
  SELECT 
    p.id AS project_id,
    p.name AS project_name,

    pe.billing_amt,
    pe.billing_method,
    pe.overtime_amt,

    e.id AS employee_id,
    e.name AS employee_name,
    pe.project_emp_code,
    pe.assigned_at

  FROM projects p
  LEFT JOIN project_employees pe ON pe.project_id = p.id
  LEFT JOIN employee e ON e.id = pe.emp_id
  WHERE p.client_id = $1
  ORDER BY p.id, e.id;
`;

    const result = await pool.query(query, [clientId]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching client details:", err);
    res.status(500).json({ message: "Failed to fetch client details" });
  }
};
