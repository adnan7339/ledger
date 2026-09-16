const { connectToDatabase, escapeRegex } = require("./_db");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  try {
    const sanction = (req.query.sanction || "").toString().trim();
    if (!sanction) return res.status(400).json({ error: "Missing sanction number" });

    const db = await connectToDatabase();
    const col = db.collection(process.env.MONGODB_COLLECTION || "sanctions");

    const rows = await col
      .find({ sanction_no: { $regex: `^${escapeRegex(sanction)}$`, $options: "i" } })
      .toArray();

    // Only the two protected columns are ever sent here
    const entries = rows.map((r) => ({
      receive_date: r.receive_date ?? "",
      amount: r.amount ?? "",
    }));

    res.status(200).json({ sanction_no: sanction, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
