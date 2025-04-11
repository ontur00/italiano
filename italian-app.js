// Zmienne globalne
let currentCategory = "basics"; // Domyślna kategoria  
let currentWords = [];
let currentIndex = 0;
let userProgress = JSON.parse(JSON.stringify(defaultUserProgress));

// Pobieranie elementów DOM
const startScreen = document.getElementById('start-screen');
const learningScreen = document.getElementById('learning-screen');
const progressModal = document.getElementById('progress-modal');

const categoryButtons = document.querySelectorAll('.category');
const startLearningButton = document.getElementById('start-learning');
const showProgressButton = document.getElementById('show-progress');
const backToMenuButton = document.getElementById('back-to-menu');
const showAnswerButton = document.getElementById('show-answer');
const correctButton = document.getElementById('correct-button');
const wrongButton = document.getElementById('wrong-button');
const modalCloseButton = document.querySelector('.modal-close');

const flashcard = document.getElementById('flashcard');
const italianWord = document.getElementById('italian-word');
const polishTranslation = document.getElementById('polish-translation');
const currentCategorySpan = document.getElementById('current-category');
const currentProgressSpan = document.getElementById('current-progress');
const totalWordsSpan = document.getElementById('total-words');

// Ładowanie postępu z localStorage
function loadProgress() {
    const savedProgress = localStorage.getItem('italianAppProgress');
    if (savedProgress) {
        userProgress = JSON.parse(savedProgress);
    }
    
    // Sprawdzenie i aktualizacja serii dni
    const today = new Date().toDateString();
    if (userProgress.lastSession) {
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toDateString();
        
        if (userProgress.lastSession === yesterday) {
            userProgress.lastSession = today;
            userProgress.streak += 1;
        } else if (userProgress.lastSession !== today) {
            userProgress.streak = 1;
            userProgress.lastSession = today;
        }
    } else {
        userProgress.streak = 1;
        userProgress.lastSession = today;
    }
    
    saveProgress();
    updateProgressDisplay();
}

// Zapisanie postępu do localStorage
function saveProgress() {
    localStorage.setItem('italianAppProgress', JSON.stringify(userProgress));
}

// Aktualizacja wyświetlania postępu
function updateProgressDisplay() {
    // Obliczenie ogólnego postępu
    let totalWords = 0;
    let learnedWords = 0;
    let correct = 0;
    let wrong = 0;
    
    for (const category in wordDatabase) {
        const categoryWords = wordDatabase[category].length;
        totalWords += categoryWords;
        
        let categoryLearned = 0;
        for (const word of wordDatabase[category]) {
            if (userProgress[category][word.italian]) {
                learnedWords++;
                categoryLearned++;
                
                // Zliczanie poprawnych i niepoprawnych odpowiedzi
                if (userProgress[category][word.italian] === true) {
                    correct++;
                } else {
                    wrong++;
                }
            }
        }
        
        // Aktualizacja paska postępu dla kategorii
        const categoryProgressBar = document.getElementById(`${category}-progress`);
        if (categoryProgressBar) {
            const categoryProgress = (categoryLearned / categoryWords) * 100;
            categoryProgressBar.style.width = `${categoryProgress}%`;
        }
    }
    
    // Aktualizacja ogólnego paska postępu
    const totalProgress = totalWords > 0 ? (learnedWords / totalWords) * 100 : 0;
    const totalProgressBar = document.getElementById('total-progress');
    if (totalProgressBar) {
        totalProgressBar.style.width = `${totalProgress}%`;
        const progressPercentage = document.querySelector('.progress-section p');
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(totalProgress)}% ukończonych słów`;
        }
    }
    
    // Aktualizacja statystyk w modalu
    const learnedWordsElement = document.getElementById('learned-words');
    if (learnedWordsElement) {
        learnedWordsElement.textContent = learnedWords;
    }
    
    const accuracyRateElement = document.getElementById('accuracy-rate');
    if (accuracyRateElement) {
        accuracyRateElement.textContent = correct + wrong > 0 
            ? `${Math.round((correct / (correct + wrong)) * 100)}%` 
            : '0%';
    }
    
    const dailyStreakElement = document.getElementById('daily-streak');
    if (dailyStreakElement) {
        dailyStreakElement.textContent = userProgress.streak;
    }
    
    const totalSessionsElement = document.getElementById('total-sessions');
    if (totalSessionsElement) {
        totalSessionsElement.textContent = userProgress.sessions;
    }
    
    // Aktualizacja listy ostatnio nauczonych słów
    const recentWordsList = document.getElementById('recent-words-list');
    if (recentWordsList) {
        recentWordsList.innerHTML = '';
        for (const wordInfo of userProgress.recentWords.slice(0, 10)) {
            const listItem = document.createElement('li');
            listItem.className = 'word-item';
            
            const wordSpan = document.createElement('span');
            wordSpan.textContent = `${wordInfo.italian} - ${wordInfo.polish}`;
            
            const statusSpan = document.createElement('span');
            if (wordInfo.correct) {
                statusSpan.className = 'word-item-correct';
                statusSpan.textContent = '✓';
            } else {
                statusSpan.className = 'word-item-wrong';
                statusSpan.textContent = '✗';
            }
            
            listItem.appendChild(wordSpan);
            listItem.appendChild(statusSpan);
            recentWordsList.appendChild(listItem);
        }
    }
}

// Funkcja do wymawiania słowa
function pronounceWord() {
    const word = currentWords[currentIndex];
    if (!word) return;
    
    // Używamy Web Speech API do wymawiania słowa
    const utterance = new SpeechSynthesisUtterance(word.italian);
    utterance.lang = 'it-IT'; // Ustawienie języka na włoski
    speechSynthesis.speak(utterance);
}

// Funkcja do pokazywania tłumaczenia
function showTranslation() {
    flashcard.classList.add('show-translation');
    showAnswerButton.style.display = 'none';
    document.getElementById('answer-buttons').style.display = 'flex';
}

// Funkcja do oznaczania odpowiedzi
function markAnswer(isCorrect) {
    const word = currentWords[currentIndex];
    if (!word) return;
    
    // Zapisanie wyniku do postępu
    userProgress[currentCategory][word.italian] = isCorrect;
    
    // Dodanie słowa do historii
    userProgress.recentWords.unshift({
        italian: word.italian,
        polish: word.polish,
        correct: isCorrect,
        date: new Date().toISOString()
    });
    
    // Ograniczenie historii do 50 ostatnich słów
    if (userProgress.recentWords.length > 50) {
        userProgress.recentWords.pop();
    }
    
    // Zapisanie postępu i przejście do następnego słowa
    saveProgress();
    updateProgressDisplay();
    nextWord();
}

// Funkcja do przejścia do następnego słowa
function nextWord() {
    currentIndex++;
    
    // Jeśli skończyły się słowa, wróć do początku
    if (currentIndex >= currentWords.length) {
        currentIndex = 0;
        shuffleWords();
    }
    
    // Aktualizacja karty
    updateCard();
}

// Funkcja do aktualizacji wyświetlanej karty
function updateCard() {
    const word = currentWords[currentIndex];
    if (!word) return;
    
    // Ukrycie tłumaczenia
    flashcard.classList.remove('show-translation');
    showAnswerButton.style.display = 'block';
    document.getElementById('answer-buttons').style.display = 'none';
    
    // Aktualizacja tekstu
    italianWord.textContent = word.italian;
    polishTranslation.textContent = word.polish;
    
    // Aktualizacja licznika postępu
    currentProgressSpan.textContent = currentIndex + 1;
    totalWordsSpan.textContent = currentWords.length;
}

// Funkcja do mieszania słów
function shuffleWords() {
    for (let i = currentWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentWords[i], currentWords[j]] = [currentWords[j], currentWords[i]];
    }
}

// Funkcja do rozpoczęcia nauki
function startLearning() {
    // Zwiększenie licznika sesji
    userProgress.sessions++;
    saveProgress();
    
    // Przygotowanie słów z wybranej kategorii
    currentWords = [...wordDatabase[currentCategory]];
    shuffleWords();
    currentIndex = 0;
    
    // Aktualizacja interfejsu
    currentCategorySpan.textContent = getCategoryName(currentCategory);
    updateCard();
    
    // Przełączenie widoków
    startScreen.classList.remove('active');
    learningScreen.classList.add('active');
}

// Funkcja do powrotu do menu
function backToMenu() {
    learningScreen.classList.remove('active');
    startScreen.classList.add('active');
    updateProgressDisplay();
}

// Funkcja do pokazywania modalu z postępem
function showProgress() {
    updateProgressDisplay();
    progressModal.classList.add('active');
}

// Funkcja do ukrywania modalu z postępem
function hideProgress() {
    progressModal.classList.remove('active');
}

// Obsługa zdarzeń
document.addEventListener('DOMContentLoaded', function() {
    // Ładowanie postępu
    loadProgress();
    
    // Obsługa wyboru kategorii
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Usunięcie klasy active ze wszystkich przycisków kategorii
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Dodanie klasy active do wybranego przycisku
            this.classList.add('active');
            
            // Ustawienie wybranej kategorii
            currentCategory = this.getAttribute('data-category');
        });
    });
    
    // Obsługa przycisku rozpoczęcia nauki
    startLearningButton.addEventListener('click', startLearning);
    
    // Obsługa przycisku powrotu do menu
    backToMenuButton.addEventListener('click', backToMenu);
    
    // Obsługa przycisku pokazywania tłumaczenia
    showAnswerButton.addEventListener('click', showTranslation);
    
    // Obsługa przycisków oznaczania odpowiedzi
    correctButton.addEventListener('click', function() { markAnswer(true); });
    wrongButton.addEventListener('click', function() { markAnswer(false); });
    
    // Obsługa przycisku pokazywania postępu
    showProgressButton.addEventListener('click', showProgress);
    
    // Obsługa przycisku zamykania modalu z postępem
    modalCloseButton.addEventListener('click', hideProgress);
    
    // Obsługa przycisku wymawiania słowa
    document.querySelector('.btn-pronunciation').addEventListener('click', pronounceWord);
});

// Domyślnie zaznaczamy pierwszą kategorię
categoryButtons[0].classList.add('active');