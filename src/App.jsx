import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // ✅ add this line

import './App.css'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/results" element={<ResultsPage />} />


      </Routes>
    </BrowserRouter>
  );
}

export default App
