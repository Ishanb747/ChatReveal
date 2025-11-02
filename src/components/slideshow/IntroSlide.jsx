import React from "react";
import { motion } from "framer-motion";

export default function IntroSlide({ onStart }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center text-white relative z-20">
      <motion.h1
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-6xl md:text-7xl font-bold mb-8 text-pink-400 drop-shadow-lg font-cartoon"
      >
        Know YourGroup
      </motion.h1>

      <motion.button
        onClick={onStart}
        whileHover={{ scale: 1.1, rotate: 1 }}
        whileTap={{ scale: 0.95 }}
        className="bg-pink-500 text-white text-2xl font-bold px-10 py-4 rounded-2xl shadow-lg border-4 border-pink-300 font-cartoonish"
      >
        Start 🚀
      </motion.button>

      <p className="mt-6 text-sm italic text-white/70">
        bring your friends along for the ride... if you still have any 😄
      </p>
    </div>
  );
}
