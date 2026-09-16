import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { query } = req.query;

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

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
