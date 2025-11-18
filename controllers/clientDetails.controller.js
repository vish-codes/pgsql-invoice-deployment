import pool from "../connection.js";

// Fetch projects + employees for one client
export const getClientFullDetails = async (req, res) => {
  const { clientId } = req.params;

  try {
    const query = `
      SELECT 
        p.id AS project_id,
        p.name AS project_name,
        p.billing_amt,
        p.billing_method,
        p.overtime_amt,
        e.id AS employee_id,
        e.name AS employee_name
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
