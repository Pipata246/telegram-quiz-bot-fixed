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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId, username, score, correctAnswers, wrongAnswers, totalQuestions, initData } = req.body;

    console.log('=== SAVE RESULT API ===');
    console.log('Request body:', req.body);

    // Простая валидация
    if (!userId || score === undefined || correctAnswers === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const store = await initStorage();
    console.log('Storage initialized');

    // Регистрируем пользователя с правильным username
    const displayName = username || `User_${userId}`;
    await store.registerUser(userId, displayName);
    console.log('User registered with username:', displayName);

    // Сохраняем результат
    const result = await store.saveGameResult(userId, score, correctAnswers, wrongAnswers, totalQuestions);
    console.log('Game result saved:', result);

    if (result) {
      res.status(200).json({ 
        success: true, 
        message: 'Result saved successfully',
        data: result 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save result' 
      });
    }

  } catch (error) {
    console.error('Error in save-result API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};