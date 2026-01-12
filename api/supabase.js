const { createClient } = require('@supabase/supabase-js');

class SupabaseStorage {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async init() {
    // Создаем таблицы если их нет (через SQL в Supabase Dashboard)
    console.log('Supabase client initialized');
  }

  async registerUser(userId, username) {
    try {
      console.log('=== SUPABASE REGISTER USER ===');
      console.log('Input:', { userId, username });
      
      // Проверяем, существует ли пользователь
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingUser) {
        console.log('User exists, updating username...');
        // Всегда обновляем username (на случай если пользователь изменил имя)
        const { data, error } = await this.supabase
          .from('users')
          .update({ 
            username: username,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('User update error:', error);
          throw error;
        }
        console.log('User updated:', data);
        return data;
      }

      // Создаем нового пользователя
      console.log('Creating new user...');
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          user_id: userId,
          username: username,
          total_games: 0,
          total_score: 0,
          best_score: 0,
          correct_answers: 0,
          wrong_answers: 0
        })
        .select()
        .single();

      if (error) {
        console.error('User insert error:', error);
        throw error;
      }
      console.log('New user created:', data);
      return data;
    } catch (error) {
      console.error('Error registering user:', error);
      return null;
    }
  }

  async saveGameResult(userId, score, correctAnswers, wrongAnswers, totalQuestions) {
    console.log('=== SUPABASE SAVE GAME RESULT ===');
    console.log('Input params:', { userId, score, correctAnswers, wrongAnswers, totalQuestions });
    
    try {
      // Сохраняем результат игры
      console.log('Inserting game result...');
      const { data: gameResult, error: gameError } = await this.supabase
        .from('games')
        .insert({
          user_id: userId,
          score: score,
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers,
          total_questions: totalQuestions
        })
        .select()
        .single();

      if (gameError) {
        console.error('Game insert error:', gameError);
        throw gameError;
      }
      console.log('Game result inserted:', gameResult);

      // Обновляем статистику пользователя
      console.log('Getting current user stats...');
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userError) {
        console.error('User select error:', userError);
        throw userError;
      }
      console.log('Current user data:', user);

      const updatedStats = {
        total_games: user.total_games + 1,
        total_score: user.total_score + score,
        best_score: Math.max(user.best_score, score),
        correct_answers: user.correct_answers + correctAnswers,
        wrong_answers: user.wrong_answers + wrongAnswers,
        updated_at: new Date().toISOString()
      };
      
      console.log('Updating user with stats:', updatedStats);

      const { error: updateError } = await this.supabase
        .from('users')
        .update(updatedStats)
        .eq('user_id', userId);

      if (updateError) {
        console.error('User update error:', updateError);
        throw updateError;
      }
      
      console.log('User stats updated successfully');
      return gameResult;
    } catch (error) {
      console.error('Error saving game result:', error);
      return null;
    }
  }

  async getUserStats(userId) {
    console.log('=== SUPABASE GET USER STATS ===');
    console.log('User ID:', userId);
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('Supabase query result:', { data, error });

      if (error || !data) {
        console.log('No user data found, returning defaults');
        return {
          totalGames: 0,
          totalScore: 0,
          bestScore: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          averageScore: 0
        };
      }

      const averageScore = data.total_games > 0 ? data.total_score / data.total_games : 0;

      const stats = {
        totalGames: data.total_games,
        totalScore: data.total_score,
        bestScore: data.best_score,
        correctAnswers: data.correct_answers,
        wrongAnswers: data.wrong_answers,
        averageScore: averageScore
      };
      
      console.log('Returning stats:', stats);
      return stats;
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
      const { data, error } = await this.supabase
        .from('users')
        .select('username, total_score, total_games, best_score')
        .gt('total_games', 0)
        .order('total_score', { ascending: false })
        .order('best_score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  async getUserGames(userId, limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('games')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting user games:', error);
      return [];
    }
  }

  async getTotalStats() {
    try {
      const { data: userCount } = await this.supabase
        .from('users')
        .select('user_id', { count: 'exact' });

      const { data: gameCount } = await this.supabase
        .from('games')
        .select('id', { count: 'exact' });

      return {
        totalUsers: userCount?.length || 0,
        totalGames: gameCount?.length || 0
      };
    } catch (error) {
      console.error('Error getting total stats:', error);
      return {
        totalUsers: 0,
        totalGames: 0
      };
    }
  }
}

module.exports = SupabaseStorage;