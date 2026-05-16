const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

/*
====================================
        BETVISION AI - SportDB (Anti-Crash)
====================================
*/

// === VARIABLES ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPORTDB_API_KEY = process.env.SPORTDB_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!SPORTDB_API_KEY) {
  console.error("❌ SPORTDB_API_KEY manquante dans les variables d'environnement !");
}

// BOT
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// DEBUG GLOBAL
process.on("uncaughtException", (err) => {
  console.error("🚨 UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("🚨 UNHANDLED REJECTION:", reason);
});
bot.on("polling_error", (err) => console.error("Polling Error:", err));

console.log("✅ BETVISION AI démarré avec SportDB");

// === HELPER ===
function extractMatchInfo(match) {
  try {
    return {
      home: match?.home_team?.name || match?.home?.name || match?.teams?.home?.name || "Inconnu",
      away: match?.away_team?.name || match?.away?.name || match?.teams?.away?.name || "Inconnu",
      homeGoals: Number(match?.home_score ?? match?.score?.home ?? match?.goals?.home ?? 0),
      awayGoals: Number(match?.away_score ?? match?.score?.away ?? match?.goals?.away ?? 0),
      minute: Number(match?.minute ?? match?.elapsed ?? match?.status?.elapsed ?? 0)
    };
  } catch (e) {
    console.error("Erreur extractMatchInfo:", e);
    return { home: "Erreur", away: "Erreur", homeGoals: 0, awayGoals: 0, minute: 0 };
  }
}

/* ======================== /START ======================== */
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `
🔥 BETVISION AI 🔥

⚽ Pronostics Football IA
📊 Analyses Live

Commandes : /live | /predict | /help
`);
});

/* ======================== /HELP ======================== */
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, "📘 /live → Matchs en direct\n/predict → Pronostic IA");
});

/* ======================== /LIVE ======================== */
bot.onText(/\/live/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await bot.sendMessage(chatId, "🔍 Recherche des matchs live...");

    console.log("📡 Appel API SportDB...");

    const response = await axios.get("https://api.sportdb.dev/api/football/live", {
      headers: { "X-API-Key": SPORTDB_API_KEY },
      timeout: 15000
    });

    console.log("✅ Statut réponse:", response.status);
    console.log("📊 Type de données reçues:", typeof response.data);

    // Debug de la structure
    console.dir(response.data, { depth: 2 });

    let matches = [];
    if (Array.isArray(response.data)) matches = response.data;
    else if (response.data?.matches) matches = response.data.matches;
    else if (response.data?.data) matches = response.data.data;
    else if (response.data?.live) matches = response.data.live;

    if (!matches || matches.length === 0) {
      return bot.sendMessage(chatId, "❌ Aucun match live actuellement.");
    }

    let text = "🔥 MATCHS LIVE 🔥\n\n";
    matches.slice(0, 8).forEach((match, i) => {
      const m = extractMatchInfo(match);
      text += `
${i+1}. ${m.home} vs ${m.away}
📊 ${m.homeGoals} - ${m.awayGoals}   ⏱️ ${m.minute}'
━━━━━━━━━━━━━━
`;
    });

    bot.sendMessage(chatId, text);

  } catch (error) {
    console.error("❌ ERREUR /LIVE :", error.response?.data || error.message);
    bot.sendMessage(chatId, `❌ Erreur : ${error.message || "Problème API SportDB"}\nVérifie ta clé API.`);
  }
});

/* ======================== /PREDICT ======================== */
bot.onText(/\/predict/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await bot.sendMessage(chatId, "🤖 Analyse IA en cours...");

    const response = await axios.get("https://api.sportdb.dev/api/football/live", {
      headers: { "X-API-Key": SPORTDB_API_KEY },
      timeout: 15000
    });

    let matches = Array.isArray(response.data) ? response.data : 
                 (response.data?.matches || response.data?.data || []);

    if (!matches.length)