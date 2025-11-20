import pool from "../connection.js";

/* ============================================================
   ✅ GET ALL COMPANIES
   ============================================================ */
export const getAllCompanies = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, address, gst_number, bank_account_number,
             ifsc_code, pan, created_at, state
      FROM companies
      ORDER BY id DESC
    `);

    res.status(200).json({
      message: "📄 Companies fetched successfully",
      companies: result.rows,
    });
  } catch (error) {
    console.error("❌ Error fetching companies:", error);
    res.status(500).json({ message: "Server error while fetching companies" });
  }
};


/* ============================================================
   ✅ GET COMPANY BY ID
   ============================================================ */
export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT id, name, address, gst_number, bank_account_number,
             ifsc_code, pan, created_at, state
      FROM companies
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "❌ Company not found",
      });
    }

    res.status(200).json({
      message: "📄 Company fetched successfully",
      company: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error fetching company:", error);
    res.status(500).json({
      message: "Server error while fetching company by ID",
    });
  }
};
