const SupabaseStorage = require('./supabase');

let storage = null;

async function initStorage() {
  if (!storage) {
    storage = new SupabaseStorage();
    await storage.init();
  }
  return storage;
}

module.exports = async (req, res) => {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId } = req.query;

    console.log('=== GET STATS API ===');
    console.log('User ID:', userId);

    if (!userId) {
      res.status(400).json({ error: 'userId parameter is required' });
      return;
    }

    const store = await initStorage();
    const stats = await store.getUserStats(parseInt(userId));
    
    console.log('Retrieved stats:', stats);

    res.status(200).json({ 
      success: true, 
      data: stats 
    });

  } catch (error) {
    console.error('Error in get-stats API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};