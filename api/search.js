const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter required' });
  }

  try {
    await client.connect();
    const db = client.db('records');
    
    const results = await db.collection('sanctions').aggregate([
      {
        $search: {
          index: 'default',
          text: {
            query: query,
            path: ['member_cnic', 'sanction_no']
          }
        }
      },
      { $limit: 20 }
    ]).toArray();

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
