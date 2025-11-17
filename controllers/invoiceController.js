import pool from "../connection.js";

/* ============================================================
   ✅ CREATE INVOICE
   Auto-fetch client_id, company_id, and emp_id via project link
   ============================================================ */
export const createInvoice = async (req, res) => {
  try {
    const { invoice_no, client_id, issue_date, total_amount } = req.body;

    if (!invoice_no || !client_id) {
      return res.status(400).json({
        message: "❌ Invoice No and Client ID are required.",
      });
    }

  
    const result = await pool.query(
      `
      INSERT INTO invoices 
        (invoice_no, client_id, issue_date, total_amount)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [invoice_no, client_id, issue_date || new Date(), total_amount || 0]
    );

    res.status(201).json({
      message: "✅ Invoice created successfully",
      invoice: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error creating invoice:", err);

    if (err.code === "23505") {
      return res.status(400).json({
        message: "❌ Duplicate invoice_no — must be unique.",
      });
    }

    res.status(500).json({
      message: "❌ Server error while creating invoice.",
      error: err.message,
    });
  }
};

// ✅ Get All Invoices (with project → client → company → employee info)
export const getAllInvoices = async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id AS invoice_id,
        i.invoice_no,
        i.issue_date,
        i.total_amount,

        -- Client
        c.id AS client_id,
        c.name AS client_name,
        c.address AS client_address,
        c.state AS client_state,
        c.gst_number AS client_gst_number,

        -- Company
        comp.id AS company_id,
        comp.name AS company_name,
        comp.address AS company_address,
        comp.gst_number AS company_gst_number,
        comp.pan AS company_pan,
        comp.ifsc_code AS company_ifsc_code,
        comp.bank_account_number AS company_bank_account_number
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      JOIN companies comp ON comp.id = c.company_id
      ORDER BY i.id DESC
    `;

    const { rows } = await pool.query(query);

    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error fetching invoices:", err);
    res.status(500).json({
      message: "❌ Failed to fetch invoices.",
      error: err.message,
    });
  }
};

// ✅ Get Invoice by ID
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        i.id,
        i.invoice_no,
        i.issue_date,
        i.total_amount,

        -- Client
        c.id AS client_id,
        c.name AS client_name,
        c.address AS client_address,
        c.state AS client_state,
        c.gst_number AS client_gst_number,

        -- Company
        comp.id AS company_id,
        comp.name AS company_name,
        comp.address AS company_address,
        comp.state AS company_state,
        comp.gst_number AS company_gst_number,
        comp.pan AS company_pan,
        comp.ifsc_code AS company_ifsc_code,
        comp.bank_account_number AS company_bank_account_number
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      JOIN companies comp ON comp.id = c.company_id
      WHERE i.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: "⚠️ Invoice not found." });

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching invoice:", err);
    res.status(500).json({
      message: "❌ Failed to fetch invoice.",
      error: err.message,
    });
  }
};


// ✅ Update Invoice
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoice_no, client_id, issue_date, total_amount } = req.body;

    // 🔍 Duplicate check (excluding current invoice ID)
    const duplicateCheck = await pool.query(
      `SELECT id FROM invoices 
       WHERE invoice_no = $1 AND id != $2`,
      [invoice_no, id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        message: "❌ Duplicate invoice_no — must be unique.",
      });
    }

    // 🔄 Update invoice
    const result = await pool.query(
      `
      UPDATE invoices 
      SET invoice_no = $1,
          client_id = $2,
          issue_date = $3,
          total_amount = $4
      WHERE id = $5
      RETURNING *
      `,
      [invoice_no, client_id, issue_date, total_amount, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "⚠️ Invoice not found." });

    res.status(200).json({
      message: "✅ Invoice updated successfully.",
      invoice: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating invoice:", err);
    res.status(500).json({
      message: "❌ Server error while updating invoice.",
      error: err.message,
    });
  }
};

// ✅ Delete Invoice
export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM invoices WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ message: "⚠️ Invoice not found or already deleted." });

    res.status(200).json({ message: "🗑️ Invoice deleted successfully." });
  } catch (err) {
    console.error("❌ Error deleting invoice:", err);
    res.status(500).json({
      message: "❌ Failed to delete invoice.",
      error: err.message,
    });
  }
};