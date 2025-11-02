import { useState, useEffect, useRef } from 'react';
import ResultsSlideshow from "../components/slideshow/ResultsSlideshow";
import WhatsAppAnalyzer from "../utils/Llm";

export default function ResultsPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const hasAnalyzed = useRef(false);

  useEffect(() => {
    // Ensure analysis only runs once
    if (hasAnalyzed.current) return;
    hasAnalyzed.current = true;

    async function runAnalysis() {
      try {
        console.log('🚀 Starting WhatsApp Analysis...');
        setIsAnalyzing(true);
        
        // Get chat data from localStorage
        const chatDataStr = localStorage.getItem("chatData");
        if (!chatDataStr) {
          throw new Error('No chat data found in localStorage. Please upload a chat first.');
        }
        
        const chatData = JSON.parse(chatDataStr);
        
        // Validate chat data structure
        if (!chatData.messages || !Array.isArray(chatData.messages)) {
          throw new Error('Invalid chat data format: missing messages array');
        }
        
        if (!chatData.participants || !Array.isArray(chatData.participants)) {
          throw new Error('Invalid chat data format: missing participants array');
        }
        
        console.log(`📊 Chat data loaded: ${chatData.messages.length} messages, ${chatData.participants.length} participants`);
        
        // 🆕 GET MULTIPLE GROQ API KEYS
        // Method 1: From environment variables (recommended)
        const groqApiKey1 = import.meta.env.VITE_GROQ_API_KEY;
        const groqApiKey2 = import.meta.env.VITE_GROQ_API_KEY_2;
        
        // Build array of API keys
        const apiKeys = [];
        
        if (groqApiKey1) {
          apiKeys.push(groqApiKey1);
        }
        
        if (groqApiKey2) {
          apiKeys.push(groqApiKey2);
        }
        
        // Fallback: if only one key is set, use it twice (won't help with rate limits but prevents crashes)
        if (apiKeys.length === 0) {
          throw new Error('❌ No Groq API keys found! Set VITE_GROQ_API_KEY and VITE_GROQ_API_KEY_2 in .env file');
        }
        
        if (apiKeys.length === 1) {
          console.warn('⚠️ Only one API key found. Using the same key for both calls (rate limits may still occur)');
          apiKeys.push(apiKeys[0]); // Duplicate the single key
        }
        
        console.log(`✅ Found ${apiKeys.length} API key(s)`);

        // Initialize analyzer with multiple API keys
        const analyzer = new WhatsAppAnalyzer(chatData, apiKeys);
        
        // Run the analysis (it will automatically rotate between API keys)
        const results = await analyzer.generateReport();
        
        // Log results to console
        console.log('✅ Analysis Complete!');
        console.log('📊 Full Results:', results);
        console.log('\n🎭 Roles:', results.roles);
        console.log('\n⚔️ Alignments:', results.alignments);
        console.log('\n🌟 Golden Moments:', results.golden_moments);
        console.log('\n🎪 Memes:', results.memes);
        console.log('\n😄 Humor:', results.humor);
        console.log('\n💬 Topics:', results.topics);
        
        // Store results
        localStorage.setItem('chatAnalysisResults', JSON.stringify(results));
        setAnalysisResults(results);
        setIsAnalyzing(false);
        
      } catch (error) {
        console.error('❌ Analysis failed:', error);
        setError(error.message);
        setIsAnalyzing(false);
      }
    }

    runAnalysis();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-8">
        <div className="bg-red-900/30 backdrop-blur-lg border border-red-500/30 rounded-2xl p-8 max-w-2xl">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-3xl font-bold text-white mb-4">Analysis Failed</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-purple-400 mb-8"></div>
          <h2 className="text-4xl font-bold text-white mb-4">Analyzing Your Chat...</h2>
          <p className="text-purple-200 text-lg">
            🤖 AI is reading through your messages
            <br />
            ⚡ Finding the best moments
            <br />
            🎭 Discovering personalities
            <br />
            🔑 Using multiple API keys for faster processing
          </p>
          <div className="mt-8 text-purple-300 text-sm">
            This usually takes 10-30 seconds
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ResultsSlideshow results={analysisResults} />
    </div>
  );
}