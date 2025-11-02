// src/utils/badgeCalculation.js

// 🧠 Utility to parse timestamps safely
const toDate = (msg) => new Date(`${msg.date} ${msg.time}`);

// 🚫 Senders to ignore
const IGNORED_SENDERS = ["Meta AI", "Facebook", "System"]; // Add more if needed

// 🧩 Main Badge Calculation Function
export const calculateBadges = (messages) => {
  if (!messages || !messages.length) return {};

  // 🧹 Step 1: Remove ignored senders
  const filteredMessages = messages.filter(
    (msg) => msg.sender && !IGNORED_SENDERS.includes(msg.sender.trim())
  );

  if (!filteredMessages.length) return {};

  const userStats = {};

  const addStat = (user, key, val = 1) => {
    if (!userStats[user]) userStats[user] = {};
    userStats[user][key] = (userStats[user][key] || 0) + val;
  };

  // 🕒 Sort by timestamp
  const sorted = [...filteredMessages].sort((a, b) => toDate(a) - toDate(b));

  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    const sender = msg.sender?.trim();
    if (!sender || IGNORED_SENDERS.includes(sender)) continue;

    const text = msg.message || "";
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    addStat(sender, "totalWords", wordCount);
    addStat(sender, "messageCount");

    // 😂 LOL Spammer
    if (/(haha|lol|lmao|😂)/gi.test(text)) addStat(sender, "lolCount");

    // 🔠 CAPS LOCK Abuser
    const caps = (text.match(/[A-Z]/g) || []).length;
    const totalLetters = (text.match(/[a-zA-Z]/g) || []).length;
    if (totalLetters && caps / totalLetters > 0.6) addStat(sender, "capsCount");

    // ❓ Question Mark Addict
    if (text.includes("?")) addStat(sender, "questionCount");

    // 🌙 Time-based
    const hour = toDate(msg).getHours();
    const day = toDate(msg).getDay();
    if (hour >= 0 && hour < 4) addStat(sender, "nightMessages");
    if (hour >= 6 && hour < 10) addStat(sender, "morningMessages");
    if (day === 0 || day === 6) addStat(sender, "weekendMessages");
    addStat(sender, `hour_${hour}`);
    addStat(sender, `day_${day}`);

    // ⚡ Rant Mode
    const prev = sorted[i - 1];
    if (prev && prev.sender === sender) addStat(sender, "consecutiveMessages");
  }

  // 🧮 Compute averages
  Object.keys(userStats).forEach((user) => {
    const s = userStats[user];
    s.avgWords = s.totalWords / (s.messageCount || 1);
    s.consRatio = s.consecutiveMessages / (s.messageCount || 1);
  });

  // 🧩 Helper to get top user (also skips ignored senders)
  const getTopUser = (metricFn, highest = true) => {
    const users = Object.entries(userStats).filter(
      ([user]) => !IGNORED_SENDERS.includes(user)
    );
    if (!users.length) return null;
    return users.reduce((best, curr) =>
      (highest ? metricFn(curr[1]) > metricFn(best[1]) : metricFn(curr[1]) < metricFn(best[1]))
        ? curr
        : best
    )[0];
  };

  const badges = {};

  // --- 🧠 Personality / Style ---
  const dryTexter = getTopUser((s) => s.avgWords, false);
  if (dryTexter) badges["💬 Dry Texter"] = dryTexter;

  const paragraphWriter = getTopUser((s) => s.avgWords, true);
  if (paragraphWriter) badges["🧠 Paragraph Writer"] = paragraphWriter;

  const lolSpammer = getTopUser((s) => s.lolCount || 0, true);
  if (lolSpammer) badges["😂 LOL Spammer"] = lolSpammer;

  const capsAbuser = getTopUser((s) => s.capsCount || 0, true);
  if (capsAbuser) badges["🔠 CAPS LOCK Abuser"] = capsAbuser;

  const questionAddict = getTopUser((s) => s.questionCount || 0, true);
  if (questionAddict) badges["❓ Question Mark Addict"] = questionAddict;

  const rantMode = getTopUser((s) => s.consRatio || 0, true);
  if (rantMode) badges["📢 Rant Mode Activated"] = rantMode;

  // --- 🌙 Time-Based ---
  const nightOwl = getTopUser((s) => s.nightMessages || 0, true);
  if (nightOwl) badges["🌙 Night Owl"] = nightOwl;

  const earlyBird = getTopUser((s) => s.morningMessages || 0, true);
  if (earlyBird) badges["☀️ Early Bird"] = earlyBird;

  const weekendWarrior = getTopUser((s) => s.weekendMessages || 0, true);
  if (weekendWarrior) badges["📅 Weekend Warrior"] = weekendWarrior;


 

  return badges;
};
