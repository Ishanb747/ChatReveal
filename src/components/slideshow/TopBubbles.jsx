import React from "react";

export default function TopBubbles({ slides, current }) {
  return (
    <div
      className="
        absolute 
        top-4 sm:top-6 md:top-8 
        left-1/2 -translate-x-1/2
        flex justify-center items-center 
        gap-1.5 sm:gap-2 md:gap-3 
        z-20
      "
    >
      {slides.map((_, idx) => (
        <div
          key={idx}
          className={`
            rounded-full transition-all duration-300 ease-in-out
            ${idx === current 
              ? "bg-pink-400 scale-125 sm:scale-150 w-3 sm:w-4 h-3 sm:h-4" 
              : "bg-white/40 w-2.5 sm:w-3 h-2.5 sm:h-3"
            }
          `}
        />
      ))}
    </div>
  );
}
