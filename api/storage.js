const fs = require('fs').promises;
const path = require('path');

class Storage {
  constructor() {
    // В продакшене на Vercel используем временную директорию
    this.dataDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, '../data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.gamesFile = path.join(this.dataDir, 'games.json');
  }

  async init() {
    try {
      // Создаем директорию если её нет
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Инициализируем файлы если их нет
      await this.initFile(this.usersFile, {});
      await this.initFile(this.gamesFile, []);
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  async initFile(filePath, defaultData) {
    try {
      await fs.access(filePath);
    } catch {
      // Файл не существует, создаем его
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
    }
  }

  async readFile(filePath, defaultData = null) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return defaultData;
    }
  }

  async writeFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      return false;
    }
  }

  async registerUser(userId, username) {
    try {
      const users = await this.readFile(this.usersFile, {});
      
      if (!users[userId]) {
        users[userId] = {
          id: userId,
          username: username,
          totalGames: 0,
          totalScore: 0,
          bestScore: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await this.writeFile(this.usersFile, users);
      }
      
      return users[userId];
    } catch (error) {
      console.error('Error registering user:', error);
      return null;
    }
  }

  async saveGameResult(userId, score, correctAnswers, wrongAnswers, totalQuestions) {
    try {
      // Сохраняем результат игры
      const games = await this.readFile(this.gamesFile, []);
      const gameResult = {
        id: Date.now() + Math.random(), // Простой ID
        userId: userId,
        score: score,
        correctAnswers: correctAnswers,
        wrongAnswers: wrongAnswers,
        totalQuestions: totalQuestions,
        playedAt: new Date().toISOString()
      };
      
      games.push(gameResult);
      await this.writeFile(this.gamesFile, games);

      // Обновляем статистику пользователя
      const users = await this.readFile(this.usersFile, {});
      if (users[userId]) {
        users[userId].totalGames += 1;
        users[userId].totalScore += score;
        users[userId].bestScore = Math.max(users[userId].bestScore, score);
        users[userId].correctAnswers += correctAnswers;
        users[userId].wrongAnswers += wrongAnswers;
        users[userId].updatedAt = new Date().toISOString();
        
        await this.writeFile(this.usersFile, users);
      }

      return gameResult;
    } catch (error) {
      console.error('Error saving game result:', error);
      return null;
    }
  }

  async getUserStats(userId) {
    try {
      const users = await this.readFile(this.usersFile, {});
      const user = users[userId];
      
      if (!user) {
        return {
          totalGames: 0,
          totalScore: 0,
          bestScore: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          averageScore: 0
        };
      }

      const averageScore = user.totalGames > 0 ? user.totalScore / user.totalGames : 0;

      return {
        totalGames: user.totalGames,
        totalScore: user.totalScore,
        bestScore: user.bestScore,
        correctAnswers: user.correctAnswers,
        wrongAnswers: user.wrongAnswers,
        averageScore: averageScore
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        totalGames: 0,
        totalScore: 0,
        bestScore: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        averageScore: 0
      };
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      const users = await this.readFile(this.usersFile, {});
      
      // Преобразуем в массив и сортируем
      const leaderboard = Object.values(users)
        .filter(user => user.totalGames > 0)
        .sort((a, b) => {
          // Сначала по общему счету, потом по лучшему результату
          if (b.totalScore !== a.totalScore) {
            return b.totalScore - a.totalScore;
          }
          return b.bestScore - a.bestScore;
        })
        .slice(0, limit)
        .map(user => ({
          username: user.username,
          totalScore: user.totalScore,
          totalGames: user.totalGames,
          bestScore: user.bestScore
        }));

      return leaderboard;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  async getUserGames(userId, limit = 10) {
    try {
      const games = await this.readFile(this.gamesFile, []);
      
      return games
        .filter(game => game.userId === userId)
        .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting user games:', error);
      return [];
    }
  }
}

module.exports = Storage;