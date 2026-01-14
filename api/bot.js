const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN environment variable is required');
}

let storage = null;

// Инициализация хранилища
async function initStorage() {
  if (!storage) {
    try {
      console.log('=== CHECKING ENVIRONMENT VARIABLES ===');
      console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
      console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
      console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? 'SET' : 'MISSING');
      
      console.log('Initializing Supabase storage...');
      const SupabaseStorage = require('./supabase');
      storage = new SupabaseStorage();
      await storage.init();
      console.log('Supabase storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      console.error('Error stack:', error.stack);
      return null;
    }
  }
  return storage;
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
      // Обработка Web App данных
      if (update.message && update.message.web_app_data) {
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        
        try {
          const store = await initStorage();
          if (store) {
            const gameData = JSON.parse(update.message.web_app_data.data);
            const { score, correctAnswers, wrongAnswers, totalQuestions } = gameData;

            await store.saveGameResult(userId, score, correctAnswers, wrongAnswers, totalQuestions);

            const resultMessage = `🎉 Игра завершена!

📊 Ваш результат:
✅ Правильных ответов: ${correctAnswers}/${totalQuestions}
⭐ Набрано очков: ${score}

Отличная работа! Продолжайте играть и улучшайте свои результаты!`;

            await sendMessage(chatId, resultMessage, mainMenu);
          }
        } catch (error) {
          console.error('Error processing game result:', error);
          await sendMessage(chatId, 'Произошла ошибка при сохранении результата.', mainMenu);
        }
      }
      // Обработка текстовых сообщений
      else if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text;
        
        // Регистрируем пользователя при любом сообщении
        const store = await initStorage();
        if (store) {
          try {
            const userId = update.message.from.id;
            const username = update.message.from.username || update.message.from.first_name || `User_${userId}`;
            await store.registerUser(userId, username);
            console.log('User registered:', { userId, username });
          } catch (error) {
            console.error('Error registering user:', error);
          }
        }
        
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
        } else if (text === '📊 Моя статистика') {
          const store = await initStorage();
          if (store) {
            try {
              const userId = update.message.from.id;
              const stats = await store.getUserStats(userId);
              
              const statsMessage = `📊 Ваша статистика:

🎯 Всего игр: ${stats.totalGames}
✅ Правильных ответов: ${stats.correctAnswers}
❌ Неправильных ответов: ${stats.wrongAnswers}
🏆 Лучший результат: ${stats.bestScore}/100
📈 Средний результат: ${stats.averageScore.toFixed(1)}/100
⭐ Общий рейтинг: ${stats.totalScore} очков`;
              
              await sendMessage(chatId, statsMessage, mainMenu);
            } catch (error) {
              console.error('Error getting stats:', error);
              await sendMessage(chatId, 'Ошибка при получении статистики. Попробуйте позже.', mainMenu);
            }
          } else {
            await sendMessage(chatId, 'База данных недоступна. Попробуйте позже.', mainMenu);
          }
        } else if (text === '🏆 Списки лидеров') {
          const store = await initStorage();
          if (store) {
            try {
              const leaders = await store.getLeaderboard();
              
              let leaderMessage = '🏆 Топ-10 игроков:\n\n';
              
              leaders.forEach((leader, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                const avgScore = leader.total_games > 0 ? (leader.total_score / leader.total_games).toFixed(1) : 0;
                
                leaderMessage += `${medal} ${leader.username}\n`;
                leaderMessage += `   ⭐ Всего очков: ${leader.total_score}\n`;
                leaderMessage += `   🎮 Игр сыграно: ${leader.total_games}\n`;
                leaderMessage += `   🏆 Лучший результат: ${leader.best_score}/100\n`;
                leaderMessage += `   �  Средний результат: ${avgScore}/100\n\n`;
              });

              if (leaders.length === 0) {
                leaderMessage = '🏆 Список лидеров пока пуст.\nСтаньте первым!';
              }

              await sendMessage(chatId, leaderMessage, mainMenu);
            } catch (error) {
              console.error('Error getting leaderboard:', error);
              await sendMessage(chatId, 'Ошибка при получении списка лидеров. Попробуйте позже.', mainMenu);
            }
          } else {
            await sendMessage(chatId, 'База данных недоступна. Попробуйте позже.', mainMenu);
          }
        } else if (text === 'ℹ️ Информация/Поддержка') {
          const infoMessage = `ℹ️ Информация о игре

🎮 Quiz Bot - это увлекательная викторина с множеством категорий вопросов!

📋 Правила игры:
• В каждой игре 10 случайных вопросов
• На каждый вопрос дается 15 секунд
• 4 варианта ответа, только один правильный
• За каждый правильный ответ +10 очков
• У вас есть 2 подсказки "50/50" за игру

🏆 Система рейтинга:
• Очки накапливаются за все игры
• Соревнуйтесь с другими игроками
• Следите за своей статистикой

📞 Поддержка:
По всем вопросам обращайтесь к администратору @NerdIdk

Удачи в игре! 🍀`;
          await sendMessage(chatId, infoMessage, mainMenu);
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