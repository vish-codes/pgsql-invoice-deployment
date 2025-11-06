import pool from "../connection.js";

// CREATE client
export const createClient = async (req, res) => {
  const { name, address, state, gst_number, company_id } = req.body;
  console.log("createClient");

  try {
    if (!company_id) {
      return res.status(400).json({ error: "company_id is required" });
    }

    const result = await pool.query(
      `INSERT INTO clients (name, address, state, gst_number, company_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [name, address, state, gst_number, company_id]
    );

    res.status(201).json({
      message: "✅ Client created successfully",
      client: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error in createClient:", err);
    res.status(500).send("Server Error");
  }
};

// GET all clients
export const getAllClients = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM clients ORDER BY id ASC`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error in getAllClients:", err);
    res.status(500).send("Server Error");
  }
};

// GET client by ID
export const getClientById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT 
        c.id,
        c.name,
        c.address,
        c.state,
        c.gst_number,
        c.created_at,
        c.updated_at,
        co.name AS company_name
      FROM clients c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error in getClientById:", err);
    res.status(500).send("Server Error");
  }
};


// UPDATE client
export const updateClient = async (req, res) => {
  const { id } = req.params;
  const { name, address, state, gst_number, company_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE clients 
       SET name = $1, address = $2, state = $3, gst_number = $4, company_id = $5, updated_at = NOW()
       WHERE id = $6 
       RETURNING *`,
      [name, address, state, gst_number, company_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({
      message: "✅ Client updated successfully",
      client: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error in updateClient:", err);
    res.status(500).send("Server Error");
  }
};

// DELETE client
export const deleteClient = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM clients WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({ message: "✅ Client deleted successfully" });
  } catch (err) {
    console.error("❌ Error in deleteClient:", err);
    res.status(500).send("Server Error");
  }
};
