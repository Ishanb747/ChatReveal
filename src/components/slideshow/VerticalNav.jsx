import React from "react";

function VerticalNav({ direction, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-white text-5xl z-20 transition-all duration-300 hover:scale-125 active:scale-95 ${
        disabled ? 'opacity-30 cursor-not-allowed' : 'opacity-70 hover:opacity-100 animate-pulse-slow'
      } relative group`}
    >
      {direction === 'left' ? '‹' : '›'}
      
      {!disabled && (
        <div className="absolute inset-0 -z-10 rounded-full bg-purple-500/20 scale-150 group-hover:scale-[2] transition-transform duration-500 blur-xl" />
      )}
    </button>
  );
}

export default VerticalNav;
