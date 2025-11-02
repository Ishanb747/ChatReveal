import React from "react";

export default function TopBubbles({ slides, current }) {
  return (
    <div className="absolute top-8 flex gap-2 z-20">
      {slides.map((_, idx) => (
        <div
          key={idx}
          className={`w-3 h-3 rounded-full transition-all ${
            idx === current ? "bg-pink-400 scale-125" : "bg-white/40"
          }`}
        />
      ))}
    </div>
  );
}
