import pool from "../connection.js";

/* ============================================================
   ✅ CREATE INVOICE 
   Auto-fetch client_id, company_id, and emp_id via project link
   ============================================================ */
export const createInvoice = async (req, res) => {
  try {
    const { invoice_no, project_id, issue_date, total_amount, days, paid_leaves, unpaid_leaves, over_time } = req.body;

    if (!invoice_no || !project_id) {
      return res.status(400).json({ message: "❌ Invoice No and Project ID are required." });
    }

    // 🔹 Fetch related info via project → client → company → employee
    const projectData = await pool.query(
      `SELECT 
          p.id AS project_id,
          c.id AS client_id,
          c.company_id,
          p.emp_id
       FROM projects p
       JOIN clients c ON p.client_id = c.id
       WHERE p.id = $1`,
      [project_id]
    );


    if (projectData.rows.length === 0) {
      return res.status(404).json({ message: "❌ Project does not exist." });
    }

    const { client_id, company_id, emp_id } = projectData.rows[0];

    // 🔹 Insert invoice
    const result = await pool.query(
      `INSERT INTO invoices 
        (invoice_no, project_id, issue_date, total_amount, days, paid_leaves, unpaid_leaves, over_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        invoice_no,
        project_id,
        issue_date || new Date(),
        total_amount || 0,
        days || 0,
        paid_leaves || 0,
        unpaid_leaves || 0,
        over_time || 0,
      ]
    );

    res.status(201).json({
      message: "✅ Invoice created successfully",
      invoice: {
        ...result.rows[0],
        client_id,
        company_id,
        emp_id,
      },
    });
  } catch (err) {
    console.error("❌ Error creating invoice:", err);

    if (err.code === "23505") {
      return res.status(400).json({ message: "❌ Duplicate invoice_no — must be unique." });
    }

    if (err.code === "23503") {
      return res.status(400).json({ message: "❌ Invalid project_id — referenced record not found." });
    }

    if (err.code === "22P02") {
      return res.status(400).json({ message: "❌ Invalid data type — please check your input fields." });
    }

    res.status(500).json({ message: "❌ Unexpected server error while creating invoice.", error: err.message });
  }
};

// ✅ Get All Invoices (with project → client → company → employee info)
export const getAllInvoices = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          i.*,
          p.name AS project_name,
          c.name AS client_name,
          co.name AS company_name,
          e.name AS employee_name
       FROM invoices i
       LEFT JOIN projects p ON i.project_id = p.id
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN companies co ON c.company_id = co.id
       LEFT JOIN employee e ON p.emp_id = e.id
       ORDER BY i.id DESC`
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ message: "⚠️ No invoices found.", invoices: [] });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching invoices:", err);
    res.status(500).json({ message: "❌ Failed to fetch invoices.", error: err.message });
  }
};

// ✅ Get Invoice by ID
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "❌ Invalid invoice ID provided." });
    }

    const result = await pool.query(
      `SELECT 
          i.*,
          p.name AS project_name,
          c.name AS client_name,
          co.name AS company_name,
          e.name AS employee_name
       FROM invoices i
       LEFT JOIN projects p ON i.project_id = p.id
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN companies co ON c.company_id = co.id
       LEFT JOIN employee e ON p.emp_id = e.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "⚠️ Invoice not found." });

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching invoice:", err);
    res.status(500).json({ message: "❌ Failed to fetch invoice details.", error: err.message });
  }
};

// ✅ Update Invoice
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoice_no, project_id, issue_date, total_amount, days, paid_leaves, unpaid_leaves, over_time } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "❌ Invalid invoice ID provided." });
    }

    const result = await pool.query(
      `UPDATE invoices 
       SET invoice_no = $1, project_id = $2, issue_date = $3, total_amount = $4, 
           days = $5, paid_leaves = $6, unpaid_leaves = $7, over_time = $8
       WHERE id = $9
       RETURNING *`,
      [invoice_no, project_id, issue_date, total_amount, days, paid_leaves, unpaid_leaves, over_time, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "⚠️ Invoice not found." });

    res.status(200).json({
      message: "✅ Invoice updated successfully",
      invoice: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating invoice:", err);

    if (err.code === "23505") {
      return res.status(400).json({ message: "❌ Duplicate invoice_no — must be unique." });
    }

    if (err.code === "23503") {
      return res.status(400).json({ message: "❌ Invalid project_id — referenced record not found." });
    }

    if (err.code === "22P02") {
      return res.status(400).json({ message: "❌ Invalid data type in input fields." });
    }

    res.status(500).json({ message: "❌ Unexpected error while updating invoice.", error: err.message });
  }
};

// ✅ Delete Invoice
export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "❌ Invalid invoice ID provided." });
    }

    const result = await pool.query(
      "DELETE FROM invoices WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "⚠️ Invoice not found or already deleted." });

    res.status(200).json({ message: "✅ Invoice deleted successfully." });
  } catch (err) {
    console.error("❌ Error deleting invoice:", err);

    if (err.code === "23503") {
      return res.status(400).json({
        message: "❌ Cannot delete — this invoice is referenced in another table (foreign key constraint).",
      });
    }

    res.status(500).json({ message: "❌ Unexpected error while deleting invoice.", error: err.message });
  }
};