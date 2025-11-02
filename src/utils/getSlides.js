// src/utils/getSlides.js
import {
  getChatData,
  getConversationStartersAndKillers,
  getGhostIndex,
  getReplySpeeds,
  getMessageRatios,
} from "./messageStats";
import { calculateBadges } from "./badgeCalculations";
import { buildEmojiStats, buildNetworkGraph } from "./graphs";
import { getAISlides } from "./getAISlides";

const formatTime = (minutes) => {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = (minutes / 60).toFixed(1);
  return `${hours} hrs`;
};

const badgeExplanations = {
  "💬 Dry Texter": "The master of one-word replies! 'k', 'lol', 'cool' - why use many words when few do trick? Efficiency is key! 🎯",
  "🧠 Paragraph Writer": "Sends ESSAYS in the chat! Every message is a novel. Scrolling for days just to read one text. The chat historian! 📚",
  "😂 LOL Spammer": "HAHAHA everything is funny! Can't send a message without 'lol' or '😂'. The group's professional laugher! 🤣",
  "🔠 CAPS LOCK Abuser": "WHY ARE WE YELLING?! Every message feels like SHOUTING! Did someone break their caps lock key? 📢",
  "❓ Question Mark Addict": "Always asking questions??? What's up??? How are you??? When??? Where??? Why??? The curious cat of the group! 🤔",
  "📢 Rant Mode Activated": "Sends 47 messages in a row without waiting for a reply! *DING* *DING* *DING* - Phone never stops buzzing! 💥",
  "🌙 Night Owl": "Most active between midnight and 4am! While everyone sleeps, they're wide awake texting away. Team No Sleep! 🦉",
  "☀️ Early Bird": "Up and chatting before sunrise! Sends 'good morning' while you're still dreaming. The rooster of the group! 🐓",
  "📅 Weekend Warrior": "Goes MIA during the week but OWNS the weekend chat! Friday night to Sunday - that's their prime time! 🎉",
};

export function getSlides() {
  const messages = getChatData();

  if (!messages || messages.length === 0) {
    return [
      {
        id: "no-data",
        title: "📭 No Data Yet",
        subtitle: "Upload your chat to get started",
        summary: "Your Wrapped will appear here once you upload chat data!",
        details: null,
      },
    ];
  }

  const slides = [];
  const badges = calculateBadges(messages);
  const { starters, killers } = getConversationStartersAndKillers(messages);
  const ghostIndex = getGhostIndex(messages);
  const replySpeeds = getReplySpeeds(messages);
  const { ratios } = getMessageRatios(messages);
  const network = buildNetworkGraph(messages);
  const aiSlides = getAISlides();
  
  if (aiSlides.length > 0) {
    console.log(`✨ Adding ${aiSlides.length} AI-powered slides!`);
  }

  // Conversation Starter
  if (starters && Object.keys(starters).length > 0) {
    const topStarter = Object.entries(starters).sort((a, b) => b[1] - a[1])[0];
    const allStarters = Object.entries(starters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([user, count]) => ({ value: count, label: user }));

    slides.push({
      id: "conversation-starter",
      title: "🚀 Conversation Starter",
      subtitle: "The one who breaks the silence",
      mainStat: topStarter[0],
      summary: `Started ${topStarter[1]} conversations`,
      stats: allStarters,
      details: "You know that awkward silence? Yeah, this person HATES it! Always sliding in with 'hey what's up' or 'guys guess what!' The chat would be DEAD without them! 💬✨",
    });
  }

  // Conversation Killer
  if (killers && Object.keys(killers).length > 0) {
    const topKiller = Object.entries(killers).sort((a, b) => b[1] - a[1])[0];
    const allKillers = Object.entries(killers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([user, count]) => ({ value: count, label: user }));

    slides.push({
      id: "conversation-killer",
      title: "🔚 Conversation Killer",
      subtitle: "The last word champion",
      mainStat: topKiller[0],
      summary: `Ended ${topKiller[1]} conversations`,
      stats: allKillers,
      details: "Drops the mic and walks away! 🎤 Has the final say in EVERY conversation. When they speak, the chat STOPS! 😴",
    });
  }

  // Insert AI slides
  slides.push(...aiSlides);

  // Biggest Ghoster
  if (ghostIndex && Object.keys(ghostIndex).length > 0) {
    const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    const ghosters = {};
    for (let i = 0; i < sortedMessages.length - 1; i++) {
      const curr = sortedMessages[i];
      const next = sortedMessages[i + 1];
      const gap = next.timestamp - curr.timestamp;
      const timeoutMs = 60 * 60 * 1000;
      if (next.sender !== curr.sender && gap > timeoutMs) {
        ghosters[next.sender] = (ghosters[next.sender] || 0) + 1;
      }
    }
    const topGhoster = Object.entries(ghosters).sort((a, b) => b[1] - a[1])[0];
    const allGhosters = Object.entries(ghosters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([user, count]) => ({ value: count, label: user }));

    slides.push({
      id: "biggest-ghoster",
      title: "👻 Biggest Ghoster",
      subtitle: "Master of leaving you on read",
      mainStat: topGhoster[0],
      summary: `Ghosted ${topGhoster[1]} times`,
      stats: allGhosters,
      details: "Seen at 2:47 PM... still waiting for a reply! 📱💀",
    });
  }

  // Most Ghosted
  if (ghostIndex && Object.keys(ghostIndex).length > 0) {
    const mostGhosted = Object.entries(ghostIndex).sort((a, b) => b[1] - a[1])[0];
    const allGhosted = Object.entries(ghostIndex)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([user, count]) => ({ value: count, label: user }));

    slides.push({
      id: "most-ghosted",
      title: "😢 Most Ghosted",
      subtitle: "Left on read champion",
      mainStat: mostGhosted[0],
      summary: `Got ghosted ${mostGhosted[1]} times`,
      stats: allGhosted,
      details: "Types 'hello?'... 'you there?'... 'HELLO?!' 📢",
    });
  }

  // Reply Speed
  if (replySpeeds && Object.keys(replySpeeds).length > 0) {
    const fastest = Object.entries(replySpeeds).sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]))[0];
    const speedStats = Object.entries(replySpeeds)
      .sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]))
      .slice(0, 4)
      .map(([user, time]) => ({
        value: formatTime(parseFloat(time)),
        label: user,
      }));

    slides.push({
      id: "reply-speed",
      title: "⚡ Lightning Fast Responder",
      subtitle: "Fastest fingers in the chat",
      mainStat: formatTime(parseFloat(fastest[1])),
      summary: `${fastest[0]} replies in record time`,
      stats: speedStats,
      details: "Blink and you'll miss it! ⚡💨 This speed demon responds SO FAST you wonder if they're just waiting for your message!",
    });
  }

  // Message Balance
  if (ratios && Object.keys(ratios).length > 0) {
    const topContributor = Object.entries(ratios).sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))[0];
    const balanceStats = Object.entries(ratios)
      .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
      .map(([user, ratio]) => ({
        value: `${ratio}%`,
        label: user,
      }));

    slides.push({
      id: "message-balance",
      title: "💪 Chat Carrier",
      subtitle: "Who keeps this chat alive?",
      mainStat: `${topContributor[1]}%`,
      summary: `${topContributor[0]} dominates the chat`,
      stats: balanceStats,
      details: "The MVP! The one who CARRIES this entire chat on their back! 🏋️ The real MVP! 🏆👑",
    });
  }

  // Emoji Usage
  const emojiStats = buildEmojiStats(messages);
  if (emojiStats && Object.keys(emojiStats).length > 0) {
    const topEmojis = Object.entries(emojiStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([emoji, count]) => ({ label: emoji, value: count }));

    const topEmoji = topEmojis[0];

    slides.push({
      id: "emoji-usage",
      title: "😀 Emoji Usage",
      subtitle: "The chat's emotional language",
      mainStat: topEmoji.label,
      summary: `${topEmoji.label} was used ${topEmoji.value} times!`,
      stats: topEmojis,
      details: "A picture speaks a thousand words — and an emoji speaks a thousand emotions! Here's what your group *feels* the most. 💬💖",
    });
  }

  // Network Graph
  if (network && network.nodes.length > 0 && network.links.length > 0) {
    const totalMentions = network.links.reduce((sum, link) => sum + link.value, 0);
    const topConnection = network.links.sort((a, b) => b.value - a.value)[0];
    
    slides.push({
      id: "network-graph",
      title: "🕸️ The Mention Web",
      subtitle: "Who's talking about whom?",
      mainStat: `${totalMentions} mentions`,
      summary: `${topConnection.source} ↔️ ${topConnection.target} mentioned each other ${topConnection.value} times!`,
      networkData: network,
      stats: [],
      details: "The invisible threads that connect your group! Every line shows who mentions whom. The thicker the line, the stronger the connection! 🔗✨",
    });
  }

  // Personality Badges
  if (badges && Object.keys(badges).length > 0) {
    Object.entries(badges).forEach(([badge, user]) => {
      slides.push({
        id: `badge-${badge.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`,
        title: badge,
        subtitle: "Personality Badge Unlocked!",
        mainStat: user,
        summary: "Earned this legendary badge",
        stats: [],
        details: badgeExplanations[badge] || "A unique chat personality that makes the group special! 🌟",
      });
    });
  }

  // 🆕 ADD QUIZ LAUNCHER AS FINAL SLIDE
  // Check if we have dankest messages for the quiz
  const aiResultsStr = localStorage.getItem('chatAnalysisResults');
  if (aiResultsStr) {
    try {
      const aiData = JSON.parse(aiResultsStr);
      if (aiData.dankest_messages && aiData.dankest_messages.length > 0) {
        slides.push({
          id: "quiz-launcher",
          title: "🎮 Ready for a Challenge?",
          subtitle: "Test your group chat knowledge",
          mainStat: "🔥",
          summary: "Dankest Messages Quiz",
          stats: [],
          details: "Think you know who said what? Take the quiz and prove it! 10 rounds of pure chaos await you. Can you guess who said the wildest messages?",
          isQuizLauncher: true // Special flag for the slideshow
        });
      }
    } catch (e) {
      console.error('Error checking for quiz data:', e);
    }
  }

  return slides;
}