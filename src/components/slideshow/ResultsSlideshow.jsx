import React, { useState, useMemo, useEffect, useRef } from "react";
import AnimatedBackground from "./AnimatedBackground";
import TopBubbles from "./TopBubbles";
import VerticalNav from "./VerticalNav";
import SlideCard from "./SlideCard";
import DisclaimerModal from "./DisclaimerModal";
import IntroSlide from "./IntroSlide";
import DankQuizGame from "../DankQuizGame";
import { getSlides as defaultGetSlides } from "../../utils/getSlides";
import { getChatData } from "../../utils/messageStats";

const BADGE_SOUNDS = {
  "💬 Dry Texter": "okay.mp3",
  "🧠 Paragraph Writer": "cs.mp3",
  "😂 LOL Spammer": "Ls.mp3",
  "🔠 CAPS LOCK Abuser": "https://cdn.freesound.org/previews/142/142608_1840735-lq.mp3",
  "❓ Question Mark Addict": "question.mp3",
  "📢 Rant Mode Activated": "https://cdn.freesound.org/previews/476/476179_10226513-lq.mp3",
  "🌙 Night Owl": "https://cdn.freesound.org/previews/172/172392_2398400-lq.mp3",
  "☀️ Early Bird": "morning.mp3",
  "📅 Weekend Warrior": "weekend.mp3"
};

const SOUND_EFFECTS = {
  "conversation-starter": "/cs.mp3",
  "conversation-killer": "/ce.mp3",
  "biggest-ghoster": "/bg.mp3",
  "most-ghosted": "/mg.mp3",
  "reply-speed": "/ft.mp3",
  "message-balance": "/cc.mp3",
  "emoji-usage": "emoji.mp3",
  "quiz-launcher": "https://cdn.freesound.org/previews/456/456966_5121236-lq.mp3",
  "default": "https://cdn.freesound.org/previews/320/320181_5260872-lq.mp3"
};

export default function ResultsSlideshow({ slides: slidesProp = null }) {
  const messages = getChatData();
  const totalMessages = messages ? messages.length : 0;

  const slides = useMemo(() => {
    const generatedSlides = slidesProp || defaultGetSlides();
    if (generatedSlides.length > 0 && generatedSlides[0].id !== "no-data") {
      return [
        {
          id: "welcome",
          title: "🎉 Your Chat Wrapped",
          subtitle: "Let's dive into your texting stats!",
          mainStat: totalMessages.toLocaleString(),
          summary: "Total messages exchanged",
          stats: [],
          details: "Get ready for some wild revelations about your texting habits! 📱✨"
        },
        ...generatedSlides
      ];
    }
    return generatedSlides;
  }, [slidesProp, totalMessages]);

  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const audioRef = useRef(null);

  const getSoundEffect = (slide) => {
    if (slide.title && BADGE_SOUNDS[slide.title]) return BADGE_SOUNDS[slide.title];
    return SOUND_EFFECTS[slide.id] || SOUND_EFFECTS.default;
  };

  useEffect(() => {
    if (!started || !slides[current]) return;

    const slide = slides[current];
    const soundUrl = getSoundEffect(slide);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(soundUrl);
    audio.volume = 0.8;
    audio.play().catch((err) => console.log("Audio play failed:", err));
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [current, started, slides]);

  const nextSlide = () => {
    // Check if current slide is quiz launcher
    if (slides[current].isQuizLauncher) {
      setShowQuiz(true);
    } else {
      setCurrent((c) => (c < slides.length - 1 ? c + 1 : c));
    }
  };

  const prevSlide = () => setCurrent((c) => (c > 0 ? c - 1 : c));

  const handleQuizComplete = () => {
    setShowQuiz(false);
    // Optionally go to next slide or stay on quiz launcher
  };

  // Show quiz if activated
  if (showQuiz) {
    return <DankQuizGame onComplete={handleQuizComplete} />;
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden text-white">
      <AnimatedBackground />

      {started ? (
        <>
          <TopBubbles slides={slides} current={current} />

          <div className="flex items-center justify-center w-full h-full px-8 z-10">
            <VerticalNav direction="left" onClick={prevSlide} disabled={current === 0} />
            <div className="flex-grow flex justify-center items-center">
              {slides[current].isQuizLauncher ? (
                <QuizLauncherSlide onLaunchQuiz={() => setShowQuiz(true)} />
              ) : (
                <SlideCard slide={slides[current]} />
              )}
            </div>
            <VerticalNav
              direction="right"
              onClick={nextSlide}
              disabled={current === slides.length - 1 && !slides[current].isQuizLauncher}
            />
          </div>

          <DisclaimerModal />
        </>
      ) : (
        <IntroSlide onStart={() => setStarted(true)} />
      )}
    </div>
  );
}

// Quiz Launcher Slide Component
function QuizLauncherSlide({ onLaunchQuiz }) {
  return (
    <div className="bg-black/40 border border-white/20 rounded-xl sm:rounded-2xl p-6 sm:p-10 w-full max-w-3xl text-center backdrop-blur-md shadow-2xl z-20 transform transition-all duration-700 ease-out hover:scale-[1.02] sm:hover:scale-[1.03]">
      <div className="max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
        <div className="text-6xl sm:text-8xl mb-4 sm:mb-6 animate-bounce-slow">🎮</div>
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-3 sm:mb-4 animate-bounce-in">
          Ready for a Challenge?
        </h2>
        <p className="text-lg sm:text-2xl mb-6 sm:mb-8 opacity-80">
          Think you know your group chat?
        </p>

        <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl sm:rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 border border-white/10">
          <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-purple-300">
            Who said it Quiz
          </h3>
          <div className="space-y-2.5 sm:space-y-3 text-left text-base sm:text-lg">
            <div className="flex items-center gap-2 sm:gap-3 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              <span className="text-xl sm:text-2xl">💬</span>
              <span>Guess who said the wildest messages</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              <span className="text-xl sm:text-2xl">⚡</span>
              <span>10 rounds of pure chaos</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
              <span className="text-xl sm:text-2xl">🏆</span>
              <span>Earn points and build streaks</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
              <span className="text-xl sm:text-2xl">🎯</span>
              <span>Test your group chat knowledge</span>
            </div>
          </div>
        </div>

        <button
          onClick={onLaunchQuiz}
          className="w-full px-8 sm:px-12 py-4 sm:py-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl font-bold text-xl sm:text-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg animate-pulse-glow"
        >
          🎮 Start Quiz
        </button>

        <p className="mt-4 sm:mt-6 text-xs sm:text-sm opacity-60">
          Click to begin the ultimate group chat challenge!
        </p>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.5); }
          50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.8); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out backwards;
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite;
        }
        
        /* Custom scrollbar styles - hidden but functional */
        .custom-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}