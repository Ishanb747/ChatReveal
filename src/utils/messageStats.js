// src/utils/messageStats.js

// ✅ Helper: parse and normalize chat data safely
export const getChatData = () => {
  const raw = localStorage.getItem("chatData");
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    let messages = [];

    if (parsed.messages) messages = parsed.messages;
    else if (Array.isArray(parsed)) messages = parsed;
    else {
      console.warn("Unexpected chatData structure:", parsed);
      return [];
    }

    // ✅ Normalize each message to have a timestamp
    return messages.map((m) => {
      let timestamp;
      if (m.timestamp) timestamp = new Date(m.timestamp);
      else if (m.date && m.time)
        timestamp = new Date(`${m.date} ${m.time}`);
      else timestamp = new Date();

      return { ...m, timestamp };
    });
  } catch (err) {
    console.error("Error parsing chatData:", err);
    return [];
  }
};

/* -----------------------------
   1️⃣ Conversation Starter vs Killer
------------------------------ */
export const getConversationStartersAndKillers = (messages) => {
  if (!messages.length) return {};

  // Sort by timestamp
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  const gapThreshold = 2 * 60 * 60 * 1000; // 2 hours
  const starters = {};
  const killers = {};

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = sorted[i - 1];
    const next = sorted[i + 1];
    const currTime = curr.timestamp.getTime();

    // Starter: first msg or large gap from previous
    if (!prev || currTime - prev.timestamp.getTime() > gapThreshold) {
      starters[curr.sender] = (starters[curr.sender] || 0) + 1;
    }

    // Killer: last msg or large gap to next
    if (!next || next.timestamp.getTime() - currTime > gapThreshold) {
      killers[curr.sender] = (killers[curr.sender] || 0) + 1;
    }
  }

  return { starters, killers };
};

/* -----------------------------
   2️⃣ Ghost Index
------------------------------ */
export const getGhostIndex = (messages, timeoutMinutes = 60) => {
  if (!messages.length) return {};

  const ghostCounts = {};
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  const timeoutMs = timeoutMinutes * 60 * 1000;

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    const gap = next.timestamp - curr.timestamp;

    // If different sender and long delay ⇒ ghosted
    if (next.sender !== curr.sender && gap > timeoutMs) {
      ghostCounts[curr.sender] = (ghostCounts[curr.sender] || 0) + 1;
    }
  }

  return ghostCounts;
};

/* -----------------------------
   3️⃣ Reply Speed Leaderboard
------------------------------ */
export const getReplySpeeds = (messages) => {
  if (!messages.length) return {};

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  const replyTimes = {};

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (curr.sender !== prev.sender) {
      const gap = curr.timestamp - prev.timestamp;
      if (gap > 1000 && gap < 12 * 60 * 60 * 1000) {
        // 1s < gap < 12h
        replyTimes[curr.sender] = replyTimes[curr.sender] || [];
        replyTimes[curr.sender].push(gap);
      }
    }
  }

  const avgSpeeds = {};
  for (const user in replyTimes) {
    const arr = replyTimes[user];
    const avgMs = arr.reduce((a, b) => a + b, 0) / arr.length;
    avgSpeeds[user] = (avgMs / 60000).toFixed(2); // minutes
  }

  return avgSpeeds;
};

/* -----------------------------
   4️⃣ Who Carries the Friendship
------------------------------ */
export const getMessageRatios = (messages) => {
  if (!messages.length) return {};

  const counts = {};
  messages.forEach((msg) => {
    counts[msg.sender] = (counts[msg.sender] || 0) + 1;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const ratios = {};

  for (const user in counts) {
    ratios[user] = ((counts[user] / total) * 100).toFixed(2);
  }

  return { counts, ratios };
};
