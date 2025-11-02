import { useState, useEffect } from 'react';

function DankQuizGame({ onComplete }) {
  const [quizData, setQuizData] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  useEffect(() => {
    // Load AI analysis results
    const aiResultsStr = localStorage.getItem('chatAnalysisResults');
    if (!aiResultsStr) {
      console.error('No AI results found for quiz');
      return;
    }

    try {
      const aiData = JSON.parse(aiResultsStr);
      const dankMessages = aiData.dankest_messages || [];
      const participants = aiData.metadata?.participants || [];

      if (dankMessages.length === 0 || participants.length === 0) {
        console.error('No dank messages or participants found');
        return;
      }

      // Create quiz from dank messages (max 10 rounds)
      const shuffled = [...dankMessages].sort(() => Math.random() - 0.5);
      const quizQuestions = shuffled.slice(0, Math.min(10, shuffled.length)).map(msg => ({
        message: msg.message,
        correctAnswer: msg.sender,
        category: msg.category,
        dankScore: msg.dank_score,
        why: msg.why,
        options: generateOptions(msg.sender, participants)
      }));

      setQuizData({
        questions: quizQuestions,
        participants,
        totalRounds: quizQuestions.length
      });
    } catch (error) {
      console.error('Error loading quiz data:', error);
    }
  }, []);

  const generateOptions = (correctAnswer, allParticipants) => {
    // Always include correct answer
    const options = [correctAnswer];
    
    // Add 3 random wrong answers
    const others = allParticipants.filter(p => p !== correctAnswer);
    while (options.length < 4 && others.length > 0) {
      const randomIndex = Math.floor(Math.random() * others.length);
      options.push(others[randomIndex]);
      others.splice(randomIndex, 1);
    }
    
    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
  };

  const handleAnswerSelect = (answer) => {
    if (showResult) return; // Prevent changing answer after submission
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    if (!selectedAnswer) return;

    const question = quizData.questions[currentRound];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    setShowResult(true);

    if (isCorrect) {
      // Points based on dank score and streak
      const basePoints = question.dankScore || 80;
      const streakBonus = streak * 10;
      const points = basePoints + streakBonus;
      
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      setBestStreak(prev => Math.max(prev, streak + 1));
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentRound + 1 >= quizData.totalRounds) {
      setGameComplete(true);
    } else {
      setCurrentRound(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const handleRestart = () => {
    setCurrentRound(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameComplete(false);
    setStreak(0);
    setBestStreak(0);
    
    // Reshuffle questions
    const aiResultsStr = localStorage.getItem('chatAnalysisResults');
    const aiData = JSON.parse(aiResultsStr);
    const dankMessages = aiData.dankest_messages || [];
    const participants = aiData.metadata?.participants || [];
    
    const shuffled = [...dankMessages].sort(() => Math.random() - 0.5);
    const quizQuestions = shuffled.slice(0, Math.min(10, shuffled.length)).map(msg => ({
      message: msg.message,
      correctAnswer: msg.sender,
      category: msg.category,
      dankScore: msg.dank_score,
      why: msg.why,
      options: generateOptions(msg.sender, participants)
    }));

    setQuizData(prev => ({ ...prev, questions: quizQuestions }));
  };

  if (!quizData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading quiz...</div>
      </div>
    );
  }

  if (gameComplete) {
    const maxPossibleScore = quizData.questions.reduce((sum, q) => sum + (q.dankScore || 80), 0);
    const percentage = Math.round((score / maxPossibleScore) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-8">
        <div className="bg-black/40 border border-white/20 rounded-3xl p-12 backdrop-blur-md shadow-2xl max-w-2xl w-full text-center text-white">
          <div className="text-8xl mb-6">🏆</div>
          <h1 className="text-5xl font-extrabold mb-4">Quiz Complete!</h1>
          
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl p-8 my-6">
            <div className="text-7xl font-bold text-purple-300 mb-2">{score}</div>
            <div className="text-2xl mb-4">Total Points</div>
            <div className="text-lg opacity-80">{percentage}% accuracy</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-blue-300">{bestStreak}</div>
              <div className="text-sm opacity-80">Best Streak</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-300">{quizData.totalRounds}</div>
              <div className="text-sm opacity-80">Questions Completed</div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleRestart}
              className="w-full px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
            >
              🔄 Play Again
            </button>
            <button
              onClick={onComplete}
              className="w-full px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-lg transition-all duration-300"
            >
              📊 Back to Wrapped
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = quizData.questions[currentRound];
  const isCorrect = showResult && selectedAnswer === question.correctAnswer;
  const isWrong = showResult && selectedAnswer !== question.correctAnswer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-8">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="bg-black/40 border border-white/20 rounded-3xl p-10 backdrop-blur-md shadow-2xl max-w-4xl w-full text-white relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="text-sm opacity-60 mb-1">Round {currentRound + 1}/{quizData.totalRounds}</div>
            <div className="text-3xl font-bold">
              💎 {score} <span className="text-lg opacity-60">points</span>
            </div>
          </div>
          <div className="text-right">
            {streak > 0 && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full px-4 py-2 border border-yellow-500/30">
                <span className="text-2xl">🔥</span>
                <span className="ml-2 font-bold text-yellow-300">{streak} Streak</span>
              </div>
            )}
          </div>
        </div>

        {/* Category Badge */}
        <div className="inline-block bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-2 mb-6">
          <span className="text-sm font-semibold text-purple-300">{question.category}</span>
        </div>

        {/* Question */}
        <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl p-8 mb-8 border border-white/10">
          <h2 className="text-2xl font-bold mb-4">Who said this?</h2>
          <p className="text-3xl font-bold leading-relaxed italic">
            "{question.message}"
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {question.options.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            const isCorrectOption = showResult && option === question.correctAnswer;
            const isWrongOption = showResult && isSelected && option !== question.correctAnswer;

            let bgClass = 'bg-white/10 hover:bg-white/20';
            let borderClass = 'border-white/20';
            
            if (isCorrectOption) {
              bgClass = 'bg-green-500/30';
              borderClass = 'border-green-500/50';
            } else if (isWrongOption) {
              bgClass = 'bg-red-500/30';
              borderClass = 'border-red-500/50';
            } else if (isSelected) {
              bgClass = 'bg-purple-500/30';
              borderClass = 'border-purple-500/50';
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(option)}
                disabled={showResult}
                className={`${bgClass} ${borderClass} border-2 rounded-xl p-6 font-bold text-xl transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100 relative`}
              >
                {option}
                {isCorrectOption && <span className="absolute top-2 right-2 text-2xl">✅</span>}
                {isWrongOption && <span className="absolute top-2 right-2 text-2xl">❌</span>}
              </button>
            );
          })}
        </div>

        {/* Result Message */}
        {showResult && (
          <div className={`${isCorrect ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'} border rounded-xl p-6 mb-6 animate-fade-in`}>
            <div className="text-2xl font-bold mb-2">
              {isCorrect ? '🎉 Correct!' : '❌ Wrong!'}
            </div>
            <div className="text-lg mb-2">
              {isCorrect 
                ? `+${question.dankScore + (streak - 1) * 10} points ${streak > 1 ? `(+${(streak - 1) * 10} streak bonus!)` : ''}`
                : `The correct answer was: ${question.correctAnswer}`
              }
            </div>
            <div className="text-sm opacity-80 italic">
              Why it's dank: {question.why}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-center">
          {!showResult ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer}
              className="px-12 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl font-bold text-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-12 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-xl font-bold text-xl transition-all duration-300 hover:scale-105"
            >
              {currentRound + 1 >= quizData.totalRounds ? '🏁 Finish' : 'Next Question →'}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default DankQuizGame;