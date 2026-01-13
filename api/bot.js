const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN environment variable is required');
}

// Главное меню
const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: '🎮 Играть' }],
      [{ text: '📊 Моя статистика' }, { text: '🏆 Списки лидеров' }],
      [{ text: 'ℹ️ Информация/Поддержка' }]
    ],
    resize_keyboard: true,
    persistent: true
  }
};

// Функция для отправки сообщений
async function sendMessage(chatId, text, options = {}) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    ...options
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });
  
  return response.json();
}

// Экспорт для Vercel
module.exports = async (req, res) => {
  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('=== BOT WEBHOOK CALLED ===');
  console.log('Method:', req.method);
  
  try {
    if (req.method === 'POST') {
      const update = req.body;
      console.log('Received update:', JSON.stringify(update, null, 2));
      
      // Простая обработка без Supabase для начала
      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text;
        
        if (text === '/start') {
          const welcomeMessage = `🎉 Добро пожаловать в Quiz Bot!\n\nПроверьте свои знания в увлекательной викторине!`;
          await sendMessage(chatId, welcomeMessage, mainMenu);
        } else if (text === '🎮 Играть') {
          const webAppUrl = 'https://telegram-quiz-bot-fixed.vercel.app';
          const playMessage = `🎮 Готовы начать игру?\n\nНажмите кнопку ниже, чтобы запустить мини-приложение!`;
          
          const webAppKeyboard = {
            reply_markup: {
              inline_keyboard: [
                [{
                  text: '🎮 Запустить игру',
                  web_app: { url: webAppUrl }
                }]
              ]
            }
          };
          
          await sendMessage(chatId, playMessage, webAppKeyboard);
        } else {
          await sendMessage(chatId, 'Используйте кнопки меню для навигации 👇', mainMenu);
        }
      }
      
      res.status(200).json({ ok: true });
    } else {
      res.status(200).json({ message: 'Bot is running', timestamp: new Date().toISOString() });
    }
  } catch (error) {
    console.error('Error in webhook:', error);
    res.status(200).json({ ok: true });
  }
};