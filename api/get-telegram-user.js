const BOT_TOKEN = process.env.BOT_TOKEN;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    console.log('Getting Telegram user info for:', userId);

    // Пытаемся получить информацию о пользователе через Telegram API
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: userId
      })
    });

    const result = await response.json();
    console.log('Telegram API response:', result);

    if (result.ok && result.result) {
      const user = result.result;
      const username = user.username || user.first_name || `User_${userId}`;
      
      res.status(200).json({
        success: true,
        username: username,
        firstName: user.first_name,
        lastName: user.last_name,
        telegramUsername: user.username
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'User not found or bot has no access'
      });
    }

  } catch (error) {
    console.error('Error getting Telegram user:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};