import React, { useState } from "react";

export default function DisclaimerModal() {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-pink-600/90 text-white p-10 rounded-2xl max-w-lg text-center shadow-2xl">
        <h1 className="text-3xl font-bold mb-4">Disclaimer</h1>
        <p className="text-lg mb-6">
          None of your chat data is stored. You can check the GitHub repo to verify.
          These results are algorithmic and may not reflect accurate insights.
        </p>
        <button
          className="bg-white text-pink-700 font-semibold px-6 py-2 rounded-full hover:bg-gray-100"
          onClick={() => setShow(false)}
        >
          I Understand
        </button>
      </div>
    </div>
  );
}
