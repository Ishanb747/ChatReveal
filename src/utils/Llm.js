/**
 * Enhanced Token-Optimized WhatsApp Chat Analyzer v3.5
 * JavaScript/Browser Version
 * - Multi-API key support (rotates between keys for each call)
 * - Multi-strategy sampling (temporal + hotspots + quality)
 * - Better conversation thread detection
 * - Context messages for dank moments
 * - Unified "Dankest Messages" (no duplicates)
 * - Topics analysis fixed
 * - Focus on FUNNY, DANK, and WILD content only
 * - Rate limit handling with exponential backoff
 * - GROUP VOCABULARY: Unique words/phrases the group uses
 */

class WhatsAppAnalyzer {
  constructor(chatData, groqApiKeys) {
    this.data = chatData;
    this.allMessages = this.data.messages;
    
    // Filter out Meta AI and phone numbers
    const excluded = ['Meta AI', '+91'];
    this.participants = this.data.participants.filter(
      p => !excluded.some(ex => p.includes(ex))
    );
    
    // Support both single key (string) or multiple keys (array)
    if (typeof groqApiKeys === 'string') {
      this.apiKeys = [groqApiKeys];
    } else if (Array.isArray(groqApiKeys)) {
      this.apiKeys = groqApiKeys;
    } else {
      throw new Error('groqApiKeys must be a string or array of strings');
    }
    
    this.currentApiKeyIndex = 0;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    console.log(`✓ Initialized with ${this.apiKeys.length} API key(s)`);
    
    // Filter messages by valid participants
    this.messages = this.allMessages.filter(
      m => this.participants.includes(m.sender)
    );
    
    // Create index for context extraction
    this.messageIndex = {};
    this.messages.forEach((msg, idx) => {
      this.messageIndex[idx] = msg;
    });
    
    // Preprocess for quality
    this.processedMessages = this._preprocessMessages();
    
    console.log(`✓ Loaded ${this.processedMessages.length.toLocaleString()} quality messages from ${this.participants.length} participants`);
  }

  /**
   * Get the next API key in rotation
   */
  _getNextApiKey() {
    const key = this.apiKeys[this.currentApiKeyIndex];
    this.currentApiKeyIndex = (this.currentApiKeyIndex + 1) % this.apiKeys.length;
    console.log(`🔑 Using API key #${this.currentApiKeyIndex} (rotated)`);
    return key;
  }

  _preprocessMessages() {
    const cleaned = [];
    const seenTexts = new Set();
    
    for (const msg of this.messages) {
      const text = msg.message.trim();
      
      // Skip noise - MORE LENIENT (allow 2+ words for funny content)
      if (text.length < 2) continue;
      if (['👍', '👎', '❤️', '😂', '🙏'].includes(text)) continue;
      if (['ok', 'okay', 'k', 'hmm', 'yes', 'no', 'haan', 'nahi'].includes(text.toLowerCase())) continue;
      if (text === '<Media omitted>') continue;
      
      // Skip duplicates
      const msgKey = `${msg.sender}:${text.substring(0, 50)}`;
      if (seenTexts.has(msgKey)) continue;
      seenTexts.add(msgKey);
      
      cleaned.push(msg);
    }
    
    return cleaned;
  }

  getContextMessages(messageText, sender, before = 2, after = 1) {
    try {
      // Find the message in original messages
      let targetIdx = null;
      for (const [idx, msg] of Object.entries(this.messageIndex)) {
        if (msg.sender === sender && 
            msg.message.toLowerCase().includes(messageText.substring(0, 30).toLowerCase())) {
          targetIdx = parseInt(idx);
          break;
        }
      }
      
      if (targetIdx === null) return [];
      
      const context = [];
      
      // Get before messages
      for (let i = Math.max(0, targetIdx - before); i < targetIdx; i++) {
        if (this.messageIndex[i]) {
          const msg = this.messageIndex[i];
          if (msg.message !== '<Media omitted>' && msg.message.length > 2) {
            context.push(msg);
          }
        }
      }
      
      // Add target
      context.push(this.messageIndex[targetIdx]);
      
      // Get after messages
      for (let i = targetIdx + 1; i < Math.min(Object.keys(this.messageIndex).length, targetIdx + after + 1); i++) {
        if (this.messageIndex[i]) {
          const msg = this.messageIndex[i];
          if (msg.message !== '<Media omitted>' && msg.message.length > 2) {
            context.push(msg);
          }
        }
      }
      
      return context.slice(-4); // Max 4 messages
    } catch (e) {
      console.warn(`⚠️ Context extraction error: ${e}`);
      return [];
    }
  }

  _temporalStratifiedSample(n) {
    if (n >= this.processedMessages.length) {
      return this.processedMessages;
    }
    
    const numBuckets = 5;
    const bucketSize = Math.floor(this.processedMessages.length / numBuckets);
    const perBucket = Math.floor(n / numBuckets);
    
    const samples = [];
    
    for (let i = 0; i < numBuckets; i++) {
      const start = i * bucketSize;
      const end = i < numBuckets - 1 ? start + bucketSize : this.processedMessages.length;
      const bucket = this.processedMessages.slice(start, end);
      
      if (bucket.length <= perBucket) {
        samples.push(...bucket);
      } else {
        const step = Math.max(1, Math.floor(bucket.length / perBucket));
        for (let j = 0; j < bucket.length && samples.length < n; j += step) {
          samples.push(bucket[j]);
        }
      }
    }
    
    return samples;
  }

  _activityHotspotSample(n) {
    if (n >= this.processedMessages.length) {
      return this.processedMessages;
    }
    
    const windowSize = 20;
    const hotspots = [];
    
    for (let i = 0; i < this.processedMessages.length - windowSize; i += 5) {
      const window = this.processedMessages.slice(i, i + windowSize);
      
      let score = 0;
      const uniqueSenders = new Set(window.map(msg => msg.sender)).size;
      const avgLength = window.reduce((sum, msg) => sum + msg.message.length, 0) / window.length;
      
      score += uniqueSenders * 10;
      score += Math.min(avgLength / 5, 20);
      
      // Engagement indicators
      for (const msg of window) {
        const text = msg.message.toLowerCase();
        if (text.includes('?')) score += 5;
        if (['haha', 'lol', 'omg', 'wtf', '😂', '🤣'].some(w => text.includes(w))) {
          score += 3;
        }
      }
      
      hotspots.push({ score, startIdx: i, window });
    }
    
    // Sort by score
    hotspots.sort((a, b) => b.score - a.score);
    
    const samples = [];
    const threadsNeeded = Math.max(1, Math.floor(n / 3));
    
    for (const hotspot of hotspots.slice(0, threadsNeeded)) {
      if (samples.length >= n) break;
      
      const threadStart = Math.floor(Math.random() * Math.max(0, hotspot.window.length - 4));
      const threadLength = 2 + Math.floor(Math.random() * 3); // 2-4 messages
      const thread = hotspot.window.slice(threadStart, threadStart + threadLength);
      samples.push(...thread);
    }
    
    return samples.slice(0, n);
  }

  _qualityBasedSample(n) {
    const scored = [];
    
    for (const msg of this.processedMessages) {
      let score = 0;
      const text = msg.message;
      const textLower = text.toLowerCase();
      
      // Length score
      const lengthScore = Math.min(text.length / 8, 25) - Math.max(0, text.length - 200) / 10;
      score += lengthScore;
      
      // Questions and engagement
      if (text.includes('?')) score += 15;
      if (['why', 'how', 'what', 'when', 'where'].some(w => textLower.includes(w))) {
        score += 8;
      }
      
      // Interesting content
      const interestingWords = [
        'love', 'hate', 'amazing', 'terrible', 'crazy', 'wtf', 'omg',
        'literally', 'honestly', 'obviously', 'actually', 'seriously'
      ];
      score += interestingWords.filter(w => textLower.includes(w)).length * 3;
      
      // Humor indicators
      const humorIndicators = ['haha', 'lol', 'lmao', 'rofl', '😂', '🤣', '💀'];
      score += humorIndicators.filter(h => textLower.includes(h)).length * 4;
      
      scored.push({ score, msg });
    }
    
    // Sort and take top
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, n).map(item => item.msg);
  }

  smartSample(n = 350) {
    if (n >= this.processedMessages.length) {
      return this.processedMessages;
    }
    
    // Allocate samples across strategies
    const temporalCount = Math.floor(n * 0.30);
    const hotspotCount = Math.floor(n * 0.40);
    const qualityCount = Math.floor(n * 0.30);
    
    console.log(`  📍 Sampling: ${temporalCount} temporal + ${hotspotCount} hotspots + ${qualityCount} quality`);
    
    // Get samples from each strategy
    const temporalSamples = this._temporalStratifiedSample(temporalCount);
    const hotspotSamples = this._activityHotspotSample(hotspotCount);
    const qualitySamples = this._qualityBasedSample(qualityCount);
    
    // Combine and deduplicate
    const allSamples = [...temporalSamples, ...hotspotSamples, ...qualitySamples];
    const seen = new Set();
    const unique = [];
    
    for (const msg of allSamples) {
      const key = `${msg.sender}:${msg.message.substring(0, 30)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(msg);
      }
    }
    
    // Shuffle and limit
    const shuffled = unique.sort(() => Math.random() - 0.5);
    const final = shuffled.slice(0, n);
    
    console.log(`  ✓ Sampled ${final.length} diverse messages`);
    return final;
  }

  formatForLLM(messages, maxChars = 100) {
    const lines = messages.map(msg => {
      const sender = msg.sender.split(' ')[0].substring(0, 8);
      const text = msg.message.substring(0, maxChars).trim().replace(/\s+/g, ' ');
      return `${sender}: ${text}`;
    });
    
    return lines.join('\n');
  }

  extractQuickStats() {
    const msgCounts = {};
    const msgLengths = {};
    
    for (const msg of this.processedMessages) {
      msgCounts[msg.sender] = (msgCounts[msg.sender] || 0) + 1;
      if (!msgLengths[msg.sender]) msgLengths[msg.sender] = [];
      msgLengths[msg.sender].push(msg.message.length);
    }
    
    const avgLength = {};
    for (const p of this.participants) {
      if (msgLengths[p] && msgLengths[p].length > 0) {
        const avg = msgLengths[p].reduce((a, b) => a + b, 0) / msgLengths[p].length;
        avgLength[p] = Math.round(avg * 10) / 10;
      }
    }
    
    return {
      message_counts: msgCounts,
      avg_length: avgLength,
      total_analyzed: this.processedMessages.length
    };
  }

  _filterMeaningfulMessages(items, messageKey = 'message', minWords = 3) {
    return items.filter(item => {
      const message = item[messageKey] || '';
      const wordCount = message.split(/\s+/).filter(w => w.length > 0).length;
      return wordCount >= minWords;
    });
  }

  async _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async _callGroqAPI(messages, temperature = 0.4, maxTokens = 2500, retries = 5, apiKey = null) {
    // Use provided API key or get next one from rotation
    const selectedApiKey = apiKey || this._getNextApiKey();
    let lastError;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Add delay before retry (exponential backoff)
        if (attempt > 0) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
          console.log(`⏳ Rate limit hit. Retrying in ${(delayMs/1000).toFixed(1)}s... (Attempt ${attempt + 1}/${retries})`);
          await this._sleep(delayMs);
        }
        
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${selectedApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature,
            max_tokens: maxTokens
          })
        });
        
        // Handle rate limits specifically
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
          lastError = new Error(`Rate limit exceeded (429)`);
          
          if (attempt < retries - 1) {
            console.log(`⏳ Rate limited. Waiting ${(waitTime/1000).toFixed(1)}s before retry...`);
            await this._sleep(waitTime);
            continue;
          }
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
      } catch (error) {
        lastError = error;
        
        // If it's a network error or timeout, retry
        if (attempt < retries - 1 && (
          error.message.includes('fetch') || 
          error.message.includes('network') ||
          error.message.includes('timeout')
        )) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`⚠️ Network error. Retrying in ${(delayMs/1000).toFixed(1)}s...`);
          await this._sleep(delayMs);
          continue;
        }
        
        // For other errors, throw immediately
        if (attempt === retries - 1) {
          throw lastError;
        }
      }
    }
    
    throw lastError || new Error('API call failed after all retries');
  }

  _cleanJSON(text) {
    // Remove markdown code blocks
    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }
    
    text = text.trim();
    
    // Find JSON boundaries
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start !== -1 && end !== -1) {
      text = text.substring(start, end + 1);
    }
    
    return text;
  }

  async aiCoreAnalysis(sampleSize = 400) {
    const sampled = this.smartSample(sampleSize);
    const context = this.formatForLLM(sampled, 90);
    
    const prompt = `Analyze WhatsApp chat (English/Hinglish). ${this.participants.length} people: ${this.participants.join(', ')}

MESSAGES:
${context}

Provide CONCISE analysis:

1. PERSONALITY (for each person):
   - Style: formal/casual/energetic/calm
   - Tone: supportive/sarcastic/humorous/dramatic
   - 3 key traits

2. TOP ROLES (top scorer for each, 0-100):
   - Therapist: Most supportive
   - The racist: the one who makes racist jokes
   - Hype Man: Most encouraging
   - Comedian: Funniest
   - Drama Queen: Most dramatic
   - Meme Lord: Best memes
   - Ghost: Lurks then appears
   - Voice of Reason: Most logical
   - Chaos Agent: Creates fun chaos

3. D&D ALIGNMENT (one per person):
   Lawful/Neutral/Chaotic + Good/Neutral/Evil
   Based on: structure vs spontaneity + supportive vs teasing

4. RELATIONSHIPS:
   - Top 2-3 closest pairs
   - Bond type + why

Return ONLY valid JSON:
{
  "personalities": [{"name": "X", "style": "...", "tone": "...", "traits": ["a","b","c"]}],
  "roles": {"therapist": {"name": "X", "score": 90, "reason": "brief"}, "hype_man": {"name": "X", "score": 85, "reason": "..."}, ...},
  "alignments": [{"name": "X", "alignment": "Chaotic Good", "reason": "brief"}],
  "pairs": [{"pair": ["X","Y"], "bond": "type", "reason": "brief"}]
}`;
    
    try {
      console.log('🔑 Using dedicated API key for Core Analysis');
      const response = await this._callGroqAPI([
        { role: 'system', content: 'You are a chat analyst. Return ONLY valid JSON, no markdown.' },
        { role: 'user', content: prompt }
      ], 0.4, 2500, 5); // Uses next API key in rotation
      
      const cleaned = this._cleanJSON(response);
      const parsed = JSON.parse(cleaned);
      console.log(`✓ Core analysis complete: ${parsed.personalities?.length || 0} personalities`);
      return parsed;
    } catch (e) {
      console.error(`⚠️ Core analysis error: ${e}`);
      return {
        personalities: [],
        roles: {},
        alignments: [],
        pairs: []
      };
    }
  }

  async aiContentAnalysis(sampleSize = 600) {
    const sampled = this.smartSample(sampleSize);
    const context = this.formatForLLM(sampled, 95);
    
    const prompt = `Analyze chat content. ${this.participants.length} people: ${this.participants.join(', ')}

MESSAGES:
${context}

Find the ABSOLUTE FUNNIEST, WILDEST, and MOST UNHINGED moments. Ignore boring stuff.

1. GROUP VOCABULARY (15-25 unique words/phrases):
   Find words, phrases, or expressions that are UNIQUE to this group:
   - Word/phrase (e.g., "bruv", "fr fr", "no cap", custom nicknames, inside joke phrases)
   - Meaning/context (what it means in the group)
   - Usage frequency (high/medium/low)
   - Who uses it most (name or "everyone")
   - Example usage (brief)

2. TOP TOPICS (5-7 topics):
   For each topic find:
   - Topic name (e.g., "Weekend Plans", "Food Drama", "Roast Session")
   - Brief description
   - Key participants (who talked most about it)
   - Message count (approximate)
   - Vibe (funny/serious/chaotic/etc)

3. WHO SAID THIS QUIZ (15-20 items):
   Pick the FUNNIEST, most CHARACTERISTIC quotes and create:
   - The quote (exact text, 10-150 chars)
   - Context (what was happening)
   - Correct answer (who said it)
   - 2-3 wrong answer options (other participant names)
   - Why it's funny/characteristic

4. DANKEST MESSAGES (25-35 UNIQUE moments):
   Find 25-35 COMPLETELY DIFFERENT messages. Each message text must appear ONLY ONCE in the entire list.
   
   For EACH message:
   - Category: "Savage Roast" / "Dark Humor" / "Random/WTF" / "Cursed" / "Unhinged" / "Cringe" / "Big Brain" / "Mic Drop" / "Inside Joke" / "Ratio Moment" / "Plot Twist" / "Villain Arc"
   - Sender: who said it
   - Message: EXACT full quote (10-150 chars) - MUST BE DIFFERENT from all other messages in list
   - Why: brief explanation why it's dank
   - Dank score: 70-100

   ⚠️ CRITICAL RULES:
   - NO message text can appear more than once
   - If "saalo kahi se kud ke mar jaaao" is used once, DO NOT use it again
   - Find 25-35 DIFFERENT messages, not the same messages with different categories
   - Check your list before returning - if any message repeats, remove the duplicate

5. SENTIMENT:
   - Overall mood
   - Energy level
   - Group vibe

Return ONLY valid JSON:
{
  "vocabulary": [{"word": "bruv", "meaning": "casual way to say bro", "frequency": "high", "main_user": "Bob", "example": "bruv this is wild"}],
  "topics": [{"topic": "Weekend Plans", "description": "Planning the squad meetup", "participants": ["Alice", "Bob"], "message_count": 45, "vibe": "excited"}],
  "who_said_this": [{"quote": "the funny message", "context": "during argument about pizza", "correct_answer": "Bob", "wrong_answers": ["Alice", "Charlie"], "why_funny": "classic Bob move"}],
  "dankest_messages": [{"category": "Savage Roast", "sender": "Alice", "message": "full exact unique quote here", "why": "destroyed Bob with facts", "dank_score": 95}],
  "sentiment": {"mood": "chaotic", "energy": "high", "vibe": "unhinged"}
}`;
    
    try {
      console.log('🔑 Using dedicated API key for Content Analysis');
      const response = await this._callGroqAPI([
        { role: 'system', content: 'You are a comedy curator finding the WILDEST moments. No filter. Find the funniest, darkest, weirdest stuff. Return ONLY valid JSON, no markdown.' },
        { role: 'user', content: prompt }
      ], 0.7, 4000, 5); // Uses next API key in rotation
      
      const cleaned = this._cleanJSON(response);
      const parsed = JSON.parse(cleaned);
      
      console.log(`✓ Content analysis complete:`);
      console.log(`  - Vocabulary: ${parsed.vocabulary?.length || 0}`);
      console.log(`  - Topics: ${parsed.topics?.length || 0}`);
      console.log(`  - Who Said This: ${parsed.who_said_this?.length || 0}`);
      console.log(`  - Dankest Messages: ${parsed.dankest_messages?.length || 0}`);
      
      return parsed;
    } catch (e) {
      console.error(`⚠️ Content analysis error: ${e}`);
      return this._getEmptyContentStructure();
    }
  }

  _getEmptyContentStructure() {
    return {
      vocabulary: [],
      topics: [],
      who_said_this: [],
      dankest_messages: [],
      sentiment: {
        mood: 'unknown',
        energy: 'unknown',
        vibe: 'analysis failed'
      }
    };
  }

  enhanceMomentsWithContext(moments) {
    return moments.map(moment => {
      try {
        const sender = moment.sender || '';
        const messageText = moment.message || '';
        
        if (sender && messageText) {
          const context = this.getContextMessages(messageText, sender, 2, 1);
          
          if (context.length > 0) {
            moment.context_chat = context.map(msg => ({
              sender: msg.sender.split(' ')[0],
              message: msg.message.substring(0, 150)
            }));
          } else {
            moment.context_chat = [];
          }
        }
        
        return moment;
      } catch (e) {
        console.warn(`⚠️ Context enhancement error: ${e}`);
        moment.context_chat = [];
        return moment;
      }
    });
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('ENHANCED CHAT ANALYSIS v3.5 - MULTI-API + DANK MODE');
    console.log('='.repeat(60) + '\n');
    
    const startTime = Date.now();
    
    const report = {
      metadata: {
        total_messages: this.processedMessages.length,
        participants: this.participants,
        analysis_timestamp: new Date().toISOString(),
        optimization: 'v3.5 - Multi-API Keys + Group Vocabulary + Unified Dankest Messages',
        api_keys_used: this.apiKeys.length
      }
    };
    
    // Quick stats
    console.log('📊 Quick Stats...');
    report.stats = this.extractQuickStats();
    
    // API Call 1: Core Analysis (uses first API key)
    console.log('🤖 API Call [1/2]: Core Analysis (400 samples)...');
    const core = await this.aiCoreAnalysis(400);
    report.personalities = core.personalities || [];
    report.roles = core.roles || {};
    report.alignments = core.alignments || [];
    report.closest_pairs = core.pairs || [];
    
    // Add delay between API calls to avoid rate limits
    console.log('⏳ Waiting 2s before next API call...');
    await this._sleep(2000);
    
    // API Call 2: Content Analysis (uses second API key)
    console.log('🤖 API Call [2/2]: Dank Content Hunt (600 samples)...');
    const content = await this.aiContentAnalysis(600);
    
    // Add vocabulary
    report.vocabulary = content.vocabulary || [];
    
    // Add topics
    report.topics = content.topics || [];
    
    // Add Who Said This quiz (filter min 3 words)
    let whoSaidThis = content.who_said_this || [];
    if (whoSaidThis.length > 0) {
      console.log(`📝 Filtering Who Said This (min 3 words)...`);
      whoSaidThis = this._filterMeaningfulMessages(whoSaidThis, 'quote', 3);
    }
    report.who_said_this = whoSaidThis;
    
    // Add Dankest Messages (unified, no duplicates, filter min 3 words)
    let dankestMessages = content.dankest_messages || [];
    if (dankestMessages.length > 0) {
      console.log(`📝 Filtering dankest messages (min 3 words)...`);
      dankestMessages = this._filterMeaningfulMessages(dankestMessages, 'message', 3);
      
      // CRITICAL: Remove any duplicate messages
      console.log(`📝 Removing duplicate messages...`);
      const seenMessages = new Set();
      const uniqueDankest = [];
      
      for (const moment of dankestMessages) {
        const msgKey = moment.message.toLowerCase().trim();
        if (!seenMessages.has(msgKey)) {
          seenMessages.add(msgKey);
          uniqueDankest.push(moment);
        } else {
          console.log(`  ⚠️ Removed duplicate: "${moment.message.substring(0, 50)}..."`);
        }
      }
      
      dankestMessages = uniqueDankest;
      
      // Add context to dankest messages
      console.log(`📝 Adding context to ${dankestMessages.length} unique dankest messages...`);
      report.dankest_messages = this.enhanceMomentsWithContext(dankestMessages);
    } else {
      report.dankest_messages = [];
    }
    
    report.sentiment = content.sentiment || {};
    
    const elapsed = (Date.now() - startTime) / 1000;
    report.metadata.analysis_time = Math.round(elapsed * 100) / 100;
    
    console.log(`\n✅ Complete in ${elapsed.toFixed(1)}s`);
    console.log(`   API Keys Used: ${this.apiKeys.length}`);
    console.log(`   Vocabulary: ${report.vocabulary.length}`);
    console.log(`   Topics: ${report.topics.length}`);
    console.log(`   Who Said This: ${report.who_said_this.length}`);
    console.log(`   Dankest Messages: ${report.dankest_messages.length} (filtered, unified)\n`);
    
    return report;
  }
}

export default WhatsAppAnalyzer;