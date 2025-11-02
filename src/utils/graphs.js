// src/utils/graphs.js

// Utility: Parse timestamps safely
const toDate = (msg) => new Date(`${msg.date} ${msg.time}`);

// Ignore system-like senders
const IGNORED_SENDERS = ["Meta AI", "Facebook", "System"];

// Helper: Extract unique senders
const getUniqueSenders = (messages) => {
  const senders = new Set();
  messages.forEach((msg) => {
    if (msg.sender && !IGNORED_SENDERS.includes(msg.sender))
      senders.add(msg.sender);
  });
  return [...senders];
};

// Helper: Lenient name match (subsequence/partial match)
const looseMatch = (text, name) => {
  const t = text.toLowerCase();
  const n = name.toLowerCase();
  if (t.includes(n)) return true;
  const parts = n.split(/\s+/);
  for (const p of parts) {
    if (p.length > 2 && t.includes(p)) return true;
  }
  let i = 0;
  for (let c of t) if (c === n[i]) i++;
  return i >= n.length / 2;
};

// Build network graph: who mentions whom
export const buildNetworkGraph = (messages) => {
  const filtered = messages.filter(
    (m) => m.sender && !IGNORED_SENDERS.includes(m.sender)
  );
  const senders = getUniqueSenders(filtered);

  const mentionMap = {};
  for (const msg of filtered) {
    const sender = msg.sender;
    const text = (msg.message || "").toLowerCase();
    for (const other of senders) {
      if (other === sender) continue;
      if (looseMatch(text, other)) {
        const key = [sender, other].sort().join("-");
        mentionMap[key] = (mentionMap[key] || 0) + 1;
      }
    }
  }

  const nodes = senders.map((s) => ({ id: s }));
  const links = Object.entries(mentionMap).map(([key, value]) => {
    const [a, b] = key.split("-");
    return { source: a, target: b, value };
  });

  return { nodes, links };
};

// Build emoji stats: returns { "😂": 120, "❤️": 90, ... }
export const buildEmojiStats = (messages) => {
  const filtered = messages.filter(
    (m) => m.sender && !IGNORED_SENDERS.includes(m.sender)
  );

  // Strict regex: only match real emojis, ignore digits and plain symbols
  const emojiRegex =
    /(?:[\p{Emoji_Presentation}\p{Extended_Pictographic}](?:\uFE0F|\u200D[\p{Emoji_Presentation}\p{Extended_Pictographic}])*)/gu;

  const emojiCounts = {};

  filtered.forEach((msg) => {
    const text = msg.message || "";
    const emojis = text.match(emojiRegex);
    if (emojis) {
      emojis.forEach((emoji) => {
        // Exclude numeric or plain character emojis
        if (!/^[0-9#*]+$/.test(emoji)) {
          emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
        }
      });
    }
  });

  return emojiCounts;
};


// Combined builder
export const buildAllGraphs = (messages) => {
  return {
    network: buildNetworkGraph(messages),
    emojiStats: buildEmojiStats(messages),
  };
};
