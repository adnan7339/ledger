const { connectToDatabase, escapeRegex } = require("./_db");

const HIDDEN_FIELDS = ["receive_date", "amount"]; // columns D & E — never returned here
const SYSTEM_FIELDS = ["_id", "sanction_no", "member_cnic", ...HIDDEN_FIELDS];

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  try {
    const q = (req.query.q || "").toString().trim();
    let field = (req.query.field || "auto").toString();

    if (!q) return res.status(400).json({ error: "Missing search value" });

    const digits = q.replace(/\D+/g, "");
    if (field === "auto") {
      field = digits.length >= 11 ? "cnic" : "sanction";
    }

    const db = await connectToDatabase();
    const col = db.collection(process.env.MONGODB_COLLECTION || "sanctions");

    const filter =
      field === "cnic"
        ? { member_cnic: { $regex: escapeRegex(digits), $options: "i" } }
        : { sanction_no: { $regex: escapeRegex(q), $options: "i" } };

    const rows = await col.find(filter).limit(5000).toArray();

    // Merge duplicates: one line per distinct sanction_no
    const groups = new Map();
    for (const r of rows) {
      const key = String(r.sanction_no || "").trim().toUpperCase() || "—";
      if (!groups.has(key)) {
        const extra = {};
        Object.keys(r).forEach((k) => {
          if (!SYSTEM_FIELDS.includes(k)) extra[k] = r[k];
        });
        groups.set(key, {
          sanction_no: r.sanction_no || "—",
          member_cnic: r.member_cnic || "",
          entries: 0,
          ...extra,
        });
      }
      groups.get(key).entries += 1;
    }

    res.status(200).json({ field, count: groups.size, results: [...groups.values()] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
