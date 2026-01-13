const SupabaseStorage = require('./supabase');

let storage = null;

async function initStorage() {
  if (!storage) {
    storage = new SupabaseStorage();
    await storage.init();
  }
  return storage;
}

async function getTelegramUsername(userId) {
  try {
    const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://telegram-quiz-bot-fixed.vercel.app'}/api/get-telegram-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });

    const result = await response.json();
    if (result.success) {
      return result.username;
    }
    return null;
  } catch (error) {
    console.error(`Error getting username for ${userId}:`, error);
    return null;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('=== UPDATING ALL USERNAMES ===');
    
    const store = await initStorage();
    
    // Получаем всех пользователей
    const { data: users, error } = await store.supabase
      .from('users')
      .select('*');

    if (error) throw error;

    console.log('Found users to update:', users.length);

    let updated = 0;
    
    // Обновляем каждого пользователя
    for (const user of users) {
      try {
        console.log(`Processing user ${user.user_id}...`);
        
        // Пытаемся получить реальный username из Telegram
        const telegramUsername = await getTelegramUsername(user.user_id);
        
        if (telegramUsername && telegramUsername !== user.username) {
          const { error: updateError } = await store.supabase
            .from('users')
            .update({ username: telegramUsername })
            .eq('user_id', user.user_id);

          if (!updateError) {
            console.log(`Updated user ${user.user_id}: ${user.username} -> ${telegramUsername}`);
            updated++;
          } else {
            console.error(`Error updating user ${user.user_id}:`, updateError);
          }
        } else {
          console.log(`No update needed for user ${user.user_id}`);
        }
        
        // Небольшая задержка чтобы не перегружать API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Updated ${updated} usernames`,
      totalFound: users.length,
      updated: updated
    });

  } catch (error) {
    console.error('Error updating usernames:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};