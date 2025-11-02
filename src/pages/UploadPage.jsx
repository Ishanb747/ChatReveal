import React, { useState } from 'react';
import { Upload, Sparkles, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UploadPage = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/plain') {
      setFile(droppedFile);
    } else {
      alert('Please upload a .txt file');
    }
  };

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/plain') {
      setFile(selectedFile);
    } else {
      alert('Please upload a .txt file');
    }
  };

  const parseWhatsAppChat = (text) => {
    const messages = [];
    const lines = text.split('\n');
    
    // WhatsApp format: [date, time] Name: Message
    const whatsappRegex = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?)\]?\s-?\s?([^:]+):\s(.+)$/;
    
    lines.forEach(line => {
      const match = line.match(whatsappRegex);
      if (match) {
        messages.push({
          date: match[1],
          time: match[2],
          sender: match[3].trim(),
          message: match[4].trim()
        });
      }
    });
    
    return messages;
  };

  const parseTelegramChat = (text) => {
    const messages = [];
    const lines = text.split('\n');
    
    // Telegram format: [date time] Name: Message
    const telegramRegex = /^\[(\d{2}\.\d{2}\.\d{4})\s(\d{2}:\d{2}:\d{2})\]\s([^:]+):\s?(.+)$/;
    
    lines.forEach(line => {
      const match = line.match(telegramRegex);
      if (match) {
        messages.push({
          date: match[1],
          time: match[2],
          sender: match[3].trim(),
          message: match[4].trim()
        });
      }
    });
    
    return messages;
  };

  const parseDiscordChat = (text) => {
    const messages = [];
    const lines = text.split('\n');
    
    // Discord format: [date time] Name: Message (can vary by exporter)
    // Also handles: Name - date time: Message
    const discordRegex1 = /^\[(\d{2}-\w{3}-\d{2,4})\s(\d{2}:\d{2}(?::\d{2})?)\]\s([^:]+):\s(.+)$/;
    const discordRegex2 = /^([^\-]+)\s-\s(\d{2}\/\d{2}\/\d{4})\s(\d{1,2}:\d{2}\s?(?:AM|PM)):\s(.+)$/;
    
    lines.forEach(line => {
      let match = line.match(discordRegex1);
      if (match) {
        messages.push({
          date: match[1],
          time: match[2],
          sender: match[3].trim(),
          message: match[4].trim()
        });
      } else {
        match = line.match(discordRegex2);
        if (match) {
          messages.push({
            date: match[2],
            time: match[3],
            sender: match[1].trim(),
            message: match[4].trim()
          });
        }
      }
    });
    
    return messages;
  };

  const detectChatFormat = (text) => {
    const firstLine = text.split('\n').find(line => line.trim().length > 0);
    
    if (!firstLine) return 'unknown';
    
    // Check for WhatsApp format
    if (/^\[?\d{1,2}\/\d{1,2}\/\d{2,4}/.test(firstLine)) return 'whatsapp';
    
    // Check for Telegram format
    if (/^\[\d{2}\.\d{2}\.\d{4}/.test(firstLine)) return 'telegram';
    
    // Check for Discord format
    if (/^\[\d{2}-\w{3}-\d{2,4}/.test(firstLine) || /^[^\-]+\s-\s\d{2}\/\d{2}\/\d{4}/.test(firstLine)) return 'discord';
    
    return 'unknown';
  };

  const parseChat = (text) => {
    const format = detectChatFormat(text);
    
    let messages = [];
    
    switch (format) {
      case 'whatsapp':
        messages = parseWhatsAppChat(text);
        break;
      case 'telegram':
        messages = parseTelegramChat(text);
        break;
      case 'discord':
        messages = parseDiscordChat(text);
        break;
      default:
        console.warn('Unknown chat format, attempting WhatsApp parser as fallback');
        messages = parseWhatsAppChat(text);
    }
    
    return { messages, format };
  };

  const extractParticipants = (messages) => {
    const participants = new Set();
    messages.forEach(msg => participants.add(msg.sender));
    return Array.from(participants);
  };

  const calculateBasicStats = (messages, participants) => {
    const stats = {};
    
    participants.forEach(person => {
      const personMessages = messages.filter(m => m.sender === person);
      stats[person] = {
        messageCount: personMessages.length,
        avgMessageLength: personMessages.reduce((sum, m) => sum + m.message.length, 0) / personMessages.length || 0,
        totalCharacters: personMessages.reduce((sum, m) => sum + m.message.length, 0)
      };
    });
    
    return stats;
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setIsAnalyzing(true);
    
    try {
      // Read file content
      const text = await file.text();
      
      // Parse chat
      const { messages, format } = parseChat(text);
      
      if (messages.length === 0) {
        alert('Could not parse chat file. Please ensure it\'s a valid WhatsApp, Telegram, or Discord export.');
        setIsAnalyzing(false);
        return;
      }
      
      // Extract participants
      const participants = extractParticipants(messages);
      
      // Calculate basic stats
      const stats = calculateBasicStats(messages, participants);
      
      // Prepare data for Results page
      const chatData = {
        messages,
        participants,
        stats,
        format,
        fileName: file.name,
        totalMessages: messages.length,
        dateRange: {
          first: messages[0]?.date || 'Unknown',
          last: messages[messages.length - 1]?.date || 'Unknown'
        }
      };
      
      // Store in localStorage
      localStorage.setItem('chatData', JSON.stringify(chatData));
      
      // Navigate to results page
      setTimeout(() => {
        navigate('/results');
      }, 1500);
      
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white overflow-hidden relative">
      {/* Animated background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700"></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16 pt-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              ChatScope
            </h1>
            <Sparkles className="w-8 h-8 text-pink-400 animate-pulse" />
          </div>
          <p className="text-xl md:text-2xl text-gray-300 font-light mb-3">
            Discover the hidden personalities in your group chats
          </p>
          <p className="text-sm text-gray-400">
            AI-powered insights • 100% private • No data saved
          </p>
        </div>

        {/* Upload Box */}
        <div className="mb-12">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-3xl p-12 md:p-16 transition-all duration-300 backdrop-blur-sm ${
              isDragging
                ? 'border-purple-400 bg-purple-500/20 scale-105'
                : 'border-purple-500/50 bg-white/5 hover:bg-white/10 hover:border-purple-400/70'
            }`}
          >
            <input
              type="file"
              accept=".txt"
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            
            <div className="text-center">
              {!file ? (
                <>
                  <div className="mb-6 flex justify-center">
                    <div className="p-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
                      <Upload className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-3">
                    Drop your chat export here
                  </h2>
                  <p className="text-gray-400 mb-6 text-sm md:text-base">
                    or click to browse your files
                  </p>
                  <label
                    htmlFor="file-input"
                    className="inline-block px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-semibold cursor-pointer hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-purple-500/50"
                  >
                    Choose File
                  </label>
                  <p className="text-xs text-gray-500 mt-4">
                    Supports WhatsApp, Telegram, and Discord .txt exports
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-6 flex justify-center">
                    <div className="p-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full animate-bounce">
                      <Sparkles className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    {file.name}
                  </h2>
                  <p className="text-gray-400 mb-6">
                    {(file.size / 1024).toFixed(2)} KB • Ready to analyze
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-semibold hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          Analyze Chat
                        </>
                      )}
                    </button>
                    <label
                      htmlFor="file-input"
                      className="px-8 py-3 bg-white/10 rounded-full font-semibold cursor-pointer hover:bg-white/20 transition-all duration-200"
                    >
                      Change File
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">100% Private</h3>
            <p className="text-gray-400 text-sm">
              Your chats never leave your browser. Nothing is stored or saved.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
            <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">AI-Powered</h3>
            <p className="text-gray-400 text-sm">
              Advanced AI analyzes personalities and texting patterns.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Instant Insights</h3>
            <p className="text-gray-400 text-sm">
              Get detailed personality profiles and chat statistics in seconds.
            </p>
          </div>
        </div>

        {/* How to Export */}
        <div className="mt-12 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
          <h3 className="font-semibold text-lg mb-4 text-center">How to export your chat</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-400">
            <div>
              <p className="font-semibold text-purple-400 mb-2">WhatsApp</p>
              <p>Open chat → Menu → More → Export chat → Without media</p>
            </div>
            <div>
              <p className="font-semibold text-pink-400 mb-2">Telegram</p>
              <p>Open chat → Menu → Export chat history → Format: Plain text</p>
            </div>
            <div>
              <p className="font-semibold text-indigo-400 mb-2">Discord</p>
              <p>Use Discord Chat Exporter tool to save as .txt file</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;