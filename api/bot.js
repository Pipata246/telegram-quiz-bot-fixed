const SupabaseStorage = require('./supabase');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN environment variable is required');
}

let storage = null;

// Инициализация хранилища только один раз
async function initStorage() {
  if (!storage) {
    storage = new SupabaseStorage();
    await storage.init();
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

// Обработка сообщений
async function handleMessage(update) {
  if (!update.message) return;
  
  const chatId = update.message.chat.id;
  const userId = update.message.from.id;
  const username = update.message.from.username || update.message.from.first_name || `User_${userId}`;
  const text = update.message.text;
  
  if (!text) return;

  try {
    const store = await initStorage();

    // ВСЕГДА обновляем username пользователя при любом сообщении
    await store.registerUser(userId, username);
    console.log('User updated:', { userId, username });

    // Обработка команды /start
    if (text === '/start') {
      const welcomeMessage = `
🎉 Добро пожаловать в Quiz Bot!

Проверьте свои знания в увлекательной викторине!

🎯 Особенности игры:
• 10 вопросов за сессию
• 15 секунд на каждый вопрос
• 4 варианта ответа
• 2 подсказки "50/50" за игру
• Множество категорий вопросов

Выберите действие в меню ниже:
      `;
      
      await sendMessage(chatId, welcomeMessage, mainMenu);
      return;
    }

    // Обработка кнопок меню
    switch (text) {
        case '🎮 Играть':
          const webAppUrl = process.env.VERCEL_URL ? 
            `https://${process.env.VERCEL_URL}` : 
            'https://telegram-quiz-bot-fixed.vercel.app';
          
          const playMessage = `
🎮 Готовы начать игру?

Нажмите кнопку ниже, чтобы запустить мини-приложение!

Там вас ждет увлекательная викторина с множеством интересных вопросов.
          `;
          
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
          break;

      case '📊 Моя статистика':
        console.log('=== GETTING USER STATS ===');
        console.log('User ID:', userId);
        
        const stats = await store.getUserStats(userId);
        console.log('Retrieved stats:', stats);
        
        // Также проверим через API для отладки
        try {
          const apiUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://telegram-quiz-bot-fixed.vercel.app'}/api/get-stats?userId=${userId}`;
          console.log('Checking stats via API:', apiUrl);
          
          const response = await fetch(apiUrl);
          const apiResult = await response.json();
          console.log('API stats result:', apiResult);
        } catch (apiError) {
          console.error('API stats error:', apiError);
        }
        
        const statsMessage = `
📊 Ваша статистика:

🎯 Всего игр: ${stats.totalGames}
✅ Правильных ответов: ${stats.correctAnswers}
❌ Неправильных ответов: ${stats.wrongAnswers}
🏆 Лучший результат: ${stats.bestScore}/10
📈 Средний результат: ${stats.averageScore.toFixed(1)}/10
⭐ Общий рейтинг: ${stats.totalScore} очков
        `;
        
        console.log('Sending stats message...');
        await sendMessage(chatId, statsMessage, mainMenu);
        break;

      case '🏆 Списки лидеров':
        console.log('=== GETTING LEADERBOARD ===');
        const leaders = await store.getLeaderboard();
        console.log('Retrieved leaders:', leaders);
        
        let leaderMessage = '🏆 Топ-10 игроков:\n\n';
        
        leaders.forEach((leader, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          // Используем total_score вместо totalScore
          leaderMessage += `${medal} ${leader.username} - ${leader.total_score} очков\n`;
        });

        if (leaders.length === 0) {
          leaderMessage = '🏆 Список лидеров пока пуст.\nСтаньте первым!';
        }

        console.log('Sending leaderboard message:', leaderMessage);
        await sendMessage(chatId, leaderMessage, mainMenu);
        break;

      case 'ℹ️ Информация/Поддержка':
        const infoMessage = `
ℹ️ Информация о игре

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
По всем вопросам обращайтесь к администратору.

Удачи в игре! 🍀
        `;
        await sendMessage(chatId, infoMessage, mainMenu);
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.', mainMenu);
  }
}

// Обработка результатов игры
async function handleWebAppData(update) {
  if (!update.message || !update.message.web_app_data) return;
  
  const chatId = update.message.chat.id;
  const userId = update.message.from.id;
  
  console.log('=== PROCESSING WEB APP DATA ===');
  console.log('Chat ID:', chatId);
  console.log('User ID:', userId);
  console.log('Raw web_app_data:', update.message.web_app_data);
  
  try {
    const store = await initStorage();
    console.log('Storage initialized successfully');
    
    const gameData = JSON.parse(update.message.web_app_data.data);
    console.log('Parsed game data:', gameData);
    
    const { score, correctAnswers, wrongAnswers, totalQuestions } = gameData;

    // Сохраняем результат в БД
    console.log('Attempting to save game result...');
    const saveResult = await store.saveGameResult(userId, score, correctAnswers, wrongAnswers, totalQuestions);
    console.log('Save result:', saveResult);

    const resultMessage = `
🎉 Игра завершена!

📊 Ваш результат:
✅ Правильных ответов: ${correctAnswers}/${totalQuestions}
⭐ Набрано очков: ${score}

Отличная работа! Продолжайте играть и улучшайте свои результаты!
    `;

    console.log('Sending result message to user...');
    await sendMessage(chatId, resultMessage, mainMenu);
    console.log('Result message sent successfully');
    
  } catch (error) {
    console.error('Error processing game result:', error);
    console.error('Error stack:', error.stack);
    await sendMessage(chatId, 'Произошла ошибка при сохранении результата.', mainMenu);
  }
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