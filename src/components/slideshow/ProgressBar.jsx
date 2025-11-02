import React from "react";

export default function ProgressBar({ progress }) {
  return (
    <div className="absolute top-0 left-0 w-full h-2 bg-white/20 rounded-full overflow-hidden z-20">
      <div
        className="h-full bg-pink-400 transition-all ease-linear duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
