// src/utils/getAISlides.js

/**
 * Generate slides from AI analysis results
 * This integrates with your existing slideshow system
 */
export function getAISlides() {
  // Try to get AI analysis results from localStorage
  const aiResultsStr = localStorage.getItem('chatAnalysisResults');
  
  if (!aiResultsStr) {
    return []; // No AI results yet
  }

  try {
    const aiData = JSON.parse(aiResultsStr);
    const slides = [];

    // 1. 🎭 PERSONALITIES SLIDE
    if (aiData.personalities && aiData.personalities.length > 0) {
      slides.push({
        id: 'ai-personalities',
        title: '🎭 Group Personalities',
        subtitle: "Who's who in the chat",
        summary: `${aiData.personalities.length} unique personalities discovered`,
        stats: aiData.personalities.slice(0, 4).map(p => ({
          label: p.name,
          value: `${p.tone} • ${p.style}`
        })),
        details: buildPersonalitiesDetails(aiData.personalities),
        aiData: { type: 'personalities', data: aiData.personalities }
      });
    }

    // 2. ⚔️ ALIGNMENTS SLIDE
    if (aiData.alignments && aiData.alignments.length > 0) {
      const alignmentCounts = {};
      aiData.alignments.forEach(a => {
        alignmentCounts[a.alignment] = (alignmentCounts[a.alignment] || 0) + 1;
      });
      
      slides.push({
        id: 'ai-alignments',
        title: '⚔️ Moral Alignments',
        subtitle: 'D&D style - where does everyone stand?',
        summary: 'The moral compass of your group',
        stats: Object.entries(alignmentCounts).map(([alignment, count]) => ({
          label: alignment,
          value: `${count} ${count === 1 ? 'person' : 'people'}`
        })),
        details: buildAlignmentsDetails(aiData.alignments),
        aiData: { type: 'alignments', data: aiData.alignments }
      });
    }

    // 3. 🎪 ROLES SLIDE
    if (aiData.roles && Object.keys(aiData.roles).length > 0) {
      const rolesArray = Object.entries(aiData.roles).map(([role, info]) => ({
        role,
        ...info
      }));
      
      slides.push({
        id: 'ai-roles',
        title: '🎪 Group Roles',
        subtitle: 'Every squad needs these characters',
        summary: `${rolesArray.length} essential roles identified`,
        stats: rolesArray.slice(0, 4).map(r => ({
          label: r.role.replace(/_/g, ' '),
          value: r.name
        })),
        details: buildRolesDetails(aiData.roles),
        aiData: { type: 'roles', data: aiData.roles }
      });
    }

    // 4. 💬 TOPICS SLIDE
    if (aiData.topics && aiData.topics.length > 0) {
      const totalMsgCount = aiData.topics.reduce((sum, t) => sum + t.message_count, 0);
      
      slides.push({
        id: 'ai-topics',
        title: '💬 What You Talk About',
        subtitle: 'The conversations that define your group',
        summary: `${totalMsgCount} messages across ${aiData.topics.length} topics`,
        stats: aiData.topics.map(t => ({
          label: t.topic,
          value: `${t.message_count} msgs`
        })),
        details: buildTopicsDetails(aiData.topics),
        aiData: { type: 'topics', data: aiData.topics }
      });
    }

    // 5. 📚 VOCABULARY SLIDE
    if (aiData.vocabulary && aiData.vocabulary.length > 0) {
      slides.push({
        id: 'ai-vocabulary',
        title: '📚 Group Dictionary',
        subtitle: 'Your unique language',
        summary: `${aiData.vocabulary.length} unique words & phrases`,
        stats: aiData.vocabulary.map(v => ({
          label: v.word,
          value: `"${v.meaning}"`
        })),
        details: buildVocabularyDetails(aiData.vocabulary),
        aiData: { type: 'vocabulary', data: aiData.vocabulary }
      });
    }

    return slides;
  } catch (error) {
    console.error('Error parsing AI results:', error);
    return [];
  }
}

// Helper functions to build detailed descriptions

function buildPersonalitiesDetails(personalities) {
  let details = "🎭 YOUR GROUP'S PERSONALITIES:\n\n";
  personalities.forEach(p => {
    details += `👤 ${p.name}: ${p.style} • ${p.tone}\n`;
    details += `   Traits: ${p.traits.join(', ')}\n\n`;
  });
  return details.trim();
}

function buildAlignmentsDetails(alignments) {
  let details = "⚔️ MORAL ALIGNMENTS BREAKDOWN:\n\n";
  const grouped = {};
  alignments.forEach(a => {
    if (!grouped[a.alignment]) grouped[a.alignment] = [];
    grouped[a.alignment].push(a);
  });
  
  Object.entries(grouped).forEach(([alignment, people]) => {
    details += `${alignment}:\n`;
    people.forEach(p => {
      details += `  • ${p.name}: "${p.reason}"\n`;
    });
    details += '\n';
  });
  return details.trim();
}

function buildRolesDetails(roles) {
  const roleEmojis = {
    therapist: '🧘', hype_man: '🎉', comedian: '🤡',
    drama_queen: '👑', meme_lord: '😂', ghost: '👻',
    voice_of_reason: '🧠', chaos_agent: '🌪️'
  };
  
  let details = "🎪 GROUP ROLES:\n\n";
  Object.entries(roles).forEach(([role, info]) => {
    const emoji = roleEmojis[role] || '🎭';
    details += `${emoji} ${role.replace(/_/g, ' ').toUpperCase()}\n`;
    details += `   ${info.name} (${info.score}/100)\n`;
    details += `   ${info.reason}\n\n`;
  });
  return details.trim();
}

function buildTopicsDetails(topics) {
  const vibeEmojis = {
    stressful: '😰', excited: '🎉', informative: '📚',
    funny: '😂', serious: '🤔'
  };
  
  let details = "💬 CONVERSATION TOPICS:\n\n";
  topics.forEach(t => {
    const emoji = vibeEmojis[t.vibe] || '💭';
    details += `${emoji} ${t.topic} (${t.message_count} messages)\n`;
    details += `   ${t.description}\n`;
    details += `   Vibe: ${t.vibe} | Talkers: ${t.participants.join(', ')}\n\n`;
  });
  return details.trim();
}

function buildVocabularyDetails(vocabulary) {
  let details = "📚 YOUR GROUP'S UNIQUE LANGUAGE:\n\n";
  vocabulary.forEach(v => {
    details += `💬 "${v.word}" = ${v.meaning}\n`;
    details += `   Frequency: ${v.frequency} | Main user: ${v.main_user}\n`;
    details += `   Example: "${v.example}"\n\n`;
  });
  return details.trim();
}