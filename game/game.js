class QuizGame {
    constructor() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.questions = [];
        this.hintsUsed = 0;
        this.maxHints = 2;
        this.timeLeft = 15;
        this.timer = null;
        this.isAnswered = false;
        this.isResultSaved = false;
        
        this.initializeElements();
        this.initializeTelegram();
        this.bindEvents();
        this.showLoadingScreen();
    }

    initializeElements() {
        // Экраны
        this.loadingScreen = document.getElementById('loading-screen');
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.resultScreen = document.getElementById('result-screen');

        // Элементы игры
        this.questionText = document.getElementById('question-text');
        this.answersContainer = document.getElementById('answers-container');
        this.questionCounter = document.getElementById('question-counter');
        this.progressFill = document.getElementById('progress-fill');
        this.timerText = document.getElementById('timer-text');
        this.timerCircle = document.getElementById('timer-circle');
        this.hintBtn = document.getElementById('hint-btn');
        this.hintsCount = document.getElementById('hints-count');

        // Элементы результатов
        this.correctCount = document.getElementById('correct-count');
        this.totalScore = document.getElementById('total-score');
        this.accuracy = document.getElementById('accuracy');

        // Кнопки
        this.startBtn = document.getElementById('start-btn');
        this.saveResultBtn = document.getElementById('save-result-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
    }

    initializeTelegram() {
        // Инициализация Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            this.tg = window.Telegram.WebApp;
            this.tg.ready();
            this.tg.expand();
            
            // Настройка темы
            document.body.style.backgroundColor = this.tg.backgroundColor || '#667eea';
        }
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.hintBtn.addEventListener('click', () => this.useHint());
        this.saveResultBtn.addEventListener('click', () => this.saveResult());
        this.playAgainBtn.addEventListener('click', () => this.restartGame());

        // Обработка ответов
        this.answersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('answer-btn') && !this.isAnswered) {
                this.selectAnswer(parseInt(e.target.dataset.index));
            }
        });
    }

    showLoadingScreen() {
        setTimeout(() => {
            this.hideScreen(this.loadingScreen);
            this.showScreen(this.startScreen);
        }, 2000);
    }

    showScreen(screen) {
        screen.classList.add('active');
    }

    hideScreen(screen) {
        screen.classList.remove('active');
    }

    startGame() {
        this.resetGame();
        this.questions = getRandomQuestions(10);
        this.hideScreen(this.startScreen);
        this.showScreen(this.gameScreen);
        this.showQuestion();
    }

    resetGame() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.hintsUsed = 0;
        this.isResultSaved = false;
        this.updateHintsDisplay();
        this.clearTimer();
    }

    showQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.endGame();
            return;
        }

        const question = this.questions[this.currentQuestionIndex];
        this.isAnswered = false;

        // Перемешиваем ответы
        const shuffledAnswers = this.shuffleAnswers(question.answers, question.correct);
        
        // Сохраняем новый индекс правильного ответа
        question.shuffledCorrect = shuffledAnswers.correctIndex;
        question.shuffledAnswers = shuffledAnswers.answers;

        // Обновляем прогресс
        this.updateProgress();

        // Показываем вопрос с анимацией
        this.questionText.style.opacity = '0';
        setTimeout(() => {
            this.questionText.textContent = question.question;
            this.questionText.style.opacity = '1';
        }, 150);

        // Показываем перемешанные ответы
        this.showAnswers(question.shuffledAnswers);

        // Запускаем таймер
        this.startTimer();
    }

    shuffleAnswers(answers, correctIndex) {
        // Создаем массив с индексами и ответами
        const answersWithIndex = answers.map((answer, index) => ({
            answer: answer,
            isCorrect: index === correctIndex
        }));

        // Перемешиваем массив
        for (let i = answersWithIndex.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answersWithIndex[i], answersWithIndex[j]] = [answersWithIndex[j], answersWithIndex[i]];
        }

        // Находим новый индекс правильного ответа
        const newCorrectIndex = answersWithIndex.findIndex(item => item.isCorrect);
        
        return {
            answers: answersWithIndex.map(item => item.answer),
            correctIndex: newCorrectIndex
        };
    }

    showAnswers(answers) {
        const answerButtons = this.answersContainer.querySelectorAll('.answer-btn');
        
        answerButtons.forEach((btn, index) => {
            btn.textContent = answers[index];
            btn.disabled = false;
            // Сбрасываем все классы стилизации
            btn.className = 'answer-btn';
            btn.classList.remove('correct', 'incorrect', 'hidden', 'hiding');
            btn.style.opacity = '0';
            btn.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                btn.style.opacity = '1';
                btn.style.transform = 'translateY(0)';
            }, 100 + index * 100);
        });
    }

    selectAnswer(selectedIndex) {
        if (this.isAnswered) return;

        this.isAnswered = true;
        this.clearTimer();

        const question = this.questions[this.currentQuestionIndex];
        const answerButtons = this.answersContainer.querySelectorAll('.answer-btn');
        const isCorrect = selectedIndex === question.shuffledCorrect;

        // Подсвечиваем правильный и неправильный ответы
        answerButtons.forEach((btn, index) => {
            btn.disabled = true;
            if (index === question.shuffledCorrect) {
                btn.classList.add('correct');
            } else if (index === selectedIndex && !isCorrect) {
                btn.classList.add('incorrect');
            }
        });

        // Обновляем статистику
        if (isCorrect) {
            this.correctAnswers++;
            this.score += 10;
            this.showFeedback('correct');
        } else {
            this.wrongAnswers++;
            this.showFeedback('incorrect');
        }

        // Переходим к следующему вопросу
        setTimeout(() => {
            this.currentQuestionIndex++;
            this.showQuestion();
        }, 2000);
    }

    showFeedback(type) {
        const feedback = document.createElement('div');
        feedback.className = `feedback ${type}`;
        feedback.textContent = type === 'correct' ? '✅ Правильно!' : '❌ Неправильно!';
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 1500);
    }

    useHint() {
        if (this.hintsUsed >= this.maxHints || this.isAnswered) return;

        this.hintsUsed++;
        this.updateHintsDisplay();

        const question = this.questions[this.currentQuestionIndex];
        const answerButtons = this.answersContainer.querySelectorAll('.answer-btn');
        const incorrectIndices = [];

        // Находим неправильные ответы (используем shuffledCorrect)
        answerButtons.forEach((btn, index) => {
            if (index !== question.shuffledCorrect) {
                incorrectIndices.push(index);
            }
        });

        // Выбираем 2 случайных неправильных ответа для скрытия
        const toHide = incorrectIndices.sort(() => 0.5 - Math.random()).slice(0, 2);
        
        // Анимация кнопки подсказки
        this.hintBtn.classList.add('using');
        
        // Показываем эффект "сканирования" всех ответов
        answerButtons.forEach((btn, index) => {
            btn.style.transition = 'all 0.3s ease';
            btn.style.transform = 'scale(1.05)';
            btn.style.boxShadow = '0 0 15px rgba(255, 193, 7, 0.5)';
        });

        // Через 500мс начинаем скрывать неправильные ответы
        setTimeout(() => {
            // Убираем эффект сканирования
            answerButtons.forEach((btn) => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
            });

            // Анимированно скрываем выбранные неправильные ответы
            toHide.forEach((index, i) => {
                setTimeout(() => {
                    const btn = answerButtons[index];
                    btn.classList.add('hiding');
                    
                    // После анимации добавляем класс hidden
                    setTimeout(() => {
                        btn.classList.add('hidden');
                        btn.classList.remove('hiding');
                    }, 800);
                }, i * 200); // Задержка между скрытием ответов
            });
        }, 500);

        // Убираем анимацию с кнопки подсказки
        setTimeout(() => {
            this.hintBtn.classList.remove('using');
        }, 1000);

        // Показываем уведомление
        this.showHintNotification();
    }

    showHintNotification() {
        const notification = document.createElement('div');
        notification.className = 'hint-notification';
        notification.innerHTML = `
            <div class="hint-icon">💡</div>
            <div class="hint-text">Подсказка использована!</div>
            <div class="hint-subtext">Убраны 2 неправильных ответа</div>
        `;
        
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Удаление через 2 секунды
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 2000);
    }

    updateHintsDisplay() {
        this.hintsCount.textContent = this.maxHints - this.hintsUsed;
        if (this.hintsUsed >= this.maxHints) {
            this.hintBtn.disabled = true;
        }
    }

    startTimer() {
        this.timeLeft = 15;
        this.updateTimerDisplay();

        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        this.timerText.textContent = this.timeLeft;
        
        // Обновляем круговой прогресс
        const percentage = (this.timeLeft / 15) * 360;
        this.timerCircle.style.background = `conic-gradient(#667eea ${percentage}deg, #e9ecef ${percentage}deg)`;
        
        // Меняем цвет при малом времени
        if (this.timeLeft <= 5) {
            this.timerCircle.style.background = `conic-gradient(#dc3545 ${percentage}deg, #e9ecef ${percentage}deg)`;
        }
    }

    timeUp() {
        if (this.isAnswered) return;

        this.isAnswered = true;
        this.clearTimer();
        this.wrongAnswers++;

        // Показываем правильный ответ (используем shuffledCorrect)
        const question = this.questions[this.currentQuestionIndex];
        const answerButtons = this.answersContainer.querySelectorAll('.answer-btn');
        
        answerButtons.forEach((btn, index) => {
            btn.disabled = true;
            if (index === question.shuffledCorrect) {
                btn.classList.add('correct');
            }
        });

        this.showFeedback('time-up');

        setTimeout(() => {
            this.currentQuestionIndex++;
            this.showQuestion();
        }, 2000);
    }

    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    updateProgress() {
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        this.progressFill.style.width = `${progress}%`;
        this.questionCounter.textContent = `${this.currentQuestionIndex + 1}/${this.questions.length}`;
    }

    endGame() {
        this.clearTimer();
        this.hideScreen(this.gameScreen);
        this.showResults();
        this.showScreen(this.resultScreen);
    }

    showResults() {
        const accuracy = this.questions.length > 0 ? Math.round((this.correctAnswers / this.questions.length) * 100) : 0;
        
        this.correctCount.textContent = `${this.correctAnswers}/${this.questions.length}`;
        this.totalScore.textContent = this.score;
        this.accuracy.textContent = `${accuracy}%`;

        // Анимация появления результатов
        const statItems = document.querySelectorAll('.stat-item');
        statItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, index * 200);
        });
    }

    saveResult() {
        // Проверяем, не сохранен ли уже результат
        if (this.isResultSaved) {
            this.showSaveNotification('Результат уже сохранен!', 'info');
            return;
        }

        // Блокируем кнопку и меняем текст
        this.saveResultBtn.disabled = true;
        this.saveResultBtn.textContent = 'Сохранение...';

        const gameData = {
            score: this.score,
            correctAnswers: this.correctAnswers,
            wrongAnswers: this.wrongAnswers,
            totalQuestions: this.questions.length,
            hintsUsed: this.hintsUsed
        };

        console.log('=== SAVING GAME RESULT ===');
        console.log('Game data:', gameData);
        console.log('Telegram WebApp available:', !!window.Telegram?.WebApp);
        console.log('Telegram object:', window.Telegram);

        // Получаем userId и username из Telegram WebApp
        let userId = null;
        let username = null;
        
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('Telegram WebApp object:', window.Telegram.WebApp);
            console.log('initDataUnsafe:', window.Telegram.WebApp.initDataUnsafe);
            
            if (window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
                const user = window.Telegram.WebApp.initDataUnsafe.user;
                userId = user.id;
                username = user.username || user.first_name || `User_${user.id}`;
                console.log('Got user data from Telegram:', { userId, username });
            }
        }

        // Если не получили userId из Telegram, используем фиксированный для тестирования
        if (!userId) {
            userId = 1940576257; // Ваш Telegram ID для тестирования
            username = 'NerdIdk'; // Ваш username для тестирования
            console.log('Using fallback user data:', { userId, username });
        }

        // Всегда используем API метод (более надежный)
        this.saveViaAPI(userId, username, gameData);
    }

    async saveViaAPI(userId, username, gameData) {
        try {
            console.log('Saving via API with user data:', { userId, username });
            
            // Используем абсолютный URL
            const apiUrl = 'https://tg-mini-ap-igra.vercel.app/api/save-result';
            console.log('API URL:', apiUrl);
            
            const requestData = {
                userId: userId,
                username: username,
                score: gameData.score,
                correctAnswers: gameData.correctAnswers,
                wrongAnswers: gameData.wrongAnswers,
                totalQuestions: gameData.totalQuestions
            };
            
            console.log('Request data:', requestData);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('API response:', result);

            if (result.success) {
                this.isResultSaved = true;
                this.saveResultBtn.textContent = 'Результат сохранен ✓';
                this.showSaveNotification('Результат сохранен!', 'success');
            } else {
                // Разблокируем кнопку при ошибке
                this.saveResultBtn.disabled = false;
                this.saveResultBtn.textContent = 'Сохранить результат';
                this.showSaveNotification('Ошибка при сохранении: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error saving via API:', error);
            // Разблокируем кнопку при ошибке сети
            this.saveResultBtn.disabled = false;
            this.saveResultBtn.textContent = 'Сохранить результат';
            this.showSaveNotification('Ошибка сети: ' + error.message, 'error');
        }
    }

    showSaveNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `save-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Удаление через 3 секунды
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    restartGame() {
        // Сбрасываем состояние кнопки сохранения
        this.saveResultBtn.disabled = false;
        this.saveResultBtn.textContent = 'Сохранить результат';
        
        this.hideScreen(this.resultScreen);
        this.startGame();
    }
}

// Стили для обратной связи
const feedbackStyles = `
.feedback {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px 30px;
    border-radius: 10px;
    font-size: 1.2em;
    font-weight: bold;
    z-index: 1000;
    animation: feedbackShow 1.5s ease;
}

.feedback.correct {
    background: #d4edda;
    color: #155724;
    border: 2px solid #28a745;
}

.feedback.incorrect {
    background: #f8d7da;
    color: #721c24;
    border: 2px solid #dc3545;
}

/* Уведомление о подсказке */
.hint-notification {
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.8);
    background: linear-gradient(135deg, #ffc107, #ff9800);
    color: white;
    padding: 20px 25px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(255, 193, 7, 0.4);
    z-index: 1000;
    text-align: center;
    opacity: 0;
    transition: all 0.3s ease;
    border: 2px solid rgba(255, 255, 255, 0.3);
}

.hint-notification.show {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
}

.hint-notification .hint-icon {
    font-size: 2em;
    margin-bottom: 10px;
    animation: bounce 0.6s ease infinite alternate;
}

.hint-notification .hint-text {
    font-size: 1.2em;
    font-weight: bold;
    margin-bottom: 5px;
}

.hint-notification .hint-subtext {
    font-size: 0.9em;
    opacity: 0.9;
}

@keyframes bounce {
    0% { transform: translateY(0px); }
    100% { transform: translateY(-5px); }
}

/* Стили для уведомлений о сохранении */
.save-notification {
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.8);
    padding: 15px 25px;
    border-radius: 10px;
    font-weight: bold;
    z-index: 1000;
    opacity: 0;
    transition: all 0.3s ease;
}

.save-notification.show {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
}

.save-notification.success {
    background: #d4edda;
    color: #155724;
    border: 2px solid #28a745;
}

.save-notification.error {
    background: #f8d7da;
    color: #721c24;
    border: 2px solid #dc3545;
}

.save-notification.info {
    background: #d1ecf1;
    color: #0c5460;
    border: 2px solid #17a2b8;
}
`;

// Добавляем стили в документ
const styleSheet = document.createElement('style');
styleSheet.textContent = feedbackStyles;
document.head.appendChild(styleSheet);

// Инициализация игры
document.addEventListener('DOMContentLoaded', () => {
    new QuizGame();
});