const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    // В продакшене на Vercel используем временную директорию
    const dbPath = process.env.NODE_ENV === 'production' 
      ? '/tmp/quiz_bot.db' 
      : path.join(__dirname, 'quiz_bot.db');
    
    this.db = new sqlite3.Database(dbPath);
  }

  init() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Таблица пользователей
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            user_id INTEGER UNIQUE,
            username TEXT,
            total_games INTEGER DEFAULT 0,
            total_score INTEGER DEFAULT 0,
            best_score INTEGER DEFAULT 0,
            correct_answers INTEGER DEFAULT 0,
            wrong_answers INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Таблица результатов игр
        this.db.run(`
          CREATE TABLE IF NOT EXISTS game_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            score INTEGER,
            correct_answers INTEGER,
            wrong_answers INTEGER,
            total_questions INTEGER,
            played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (user_id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async registerUser(userId, username) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)`,
        [userId, username],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async saveGameResult(userId, score, correctAnswers, wrongAnswers, totalQuestions) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Сохраняем результат игры
        this.db.run(
          `INSERT INTO game_results (user_id, score, correct_answers, wrong_answers, total_questions) 
           VALUES (?, ?, ?, ?, ?)`,
          [userId, score, correctAnswers, wrongAnswers, totalQuestions]
        );

        // Обновляем статистику пользователя
        this.db.run(`
          UPDATE users SET 
            total_games = total_games + 1,
            total_score = total_score + ?,
            best_score = MAX(best_score, ?),
            correct_answers = correct_answers + ?,
            wrong_answers = wrong_answers + ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [score, score, correctAnswers, wrongAnswers, userId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async getUserStats(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          total_games,
          total_score,
          best_score,
          correct_answers,
          wrong_answers,
          CASE 
            WHEN total_games > 0 THEN CAST(total_score AS FLOAT) / total_games 
            ELSE 0 
          END as averageScore
        FROM users 
        WHERE user_id = ?
      `, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row || {
          totalGames: 0,
          totalScore: 0,
          bestScore: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          averageScore: 0
        });
      });
    });
  }

  async getLeaderboard(limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT username, total_score, total_games, best_score
        FROM users 
        WHERE total_games > 0
        ORDER BY total_score DESC, best_score DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

module.exports = Database;