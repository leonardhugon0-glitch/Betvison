const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

/*
====================================
        BETVISION AI - SportDB Version
====================================
*/

// VARIABLES
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPORTDB_API_KEY = process.env.SPORTDB_API_KEY;   // ← Clé SportDB
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// BOT
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// DEBUG
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
bot.on("polling_error", console.log);

console.log("✅ BETVISION AI lancé avec SportDB");

/* ======================== HELPER FUNCTION ======================== */
function extractMatchInfo(match) {
  if (!match) return { home: "?", away: "?", homeGoals: 0, awayGoals: 0, minute: 0 };

  return {
    home: match.home_team?.name || 
          match.home?.name || 
          match.teams?.home?.name || 
          "Équipe Domicile",

    away: match.away_team?.name || 
          match.away?.name || 
          match.teams?.away?.name || 
          "Équipe Extérieur",

    homeGoals: match.home_score ?? 
               match.score?.home ?? 
               match.goals?.home ?? 0,

    awayGoals: match.away_score ?? 
               match.score?.away ?? 
               match.goals?.away ?? 0,

    minute: match.minute ?? 
            match.elapsed ?? 
            match.status?.elapsed ?? 
            match.time?.elapsed ?? 
            0
  };
}

/* ======================== /START ======================== */
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
🔥 BETVISION AI 🔥

⚽ Pronostics Football IA
📊 Analyses Live
🤖 Intelligence Artificielle

COMMANDES :
/live → Matchs live
/predict → Pronostic IA
/help → Aide
`);
});

/* ======================== /HELP ======================== */
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
📘 AIDE BETVISION AI

/live     → Voir les matchs en direct
/predict  → Pronostic IA sur le premier match live
/start    → Redémarrer le bot
`);
});

/* ======================== /LIVE ======================== */
bot.onText(/\/live/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(chatId, "🔍 Recherche des matchs live...");

    const response = await axios.get("https://api.sportdb.dev/api/football/live", {
      headers: { "X-API-Key": SPORTDB_API_KEY },
      timeout: 10000
    });

    // SportDB peut renvoyer { matches: [...] } ou directement un tableau
    const data = response.data;
    const matches = Array.isArray(data) ? data : (data.matches || data.data || data.live || []);

    if (!matches || matches.length === 0) {
      return bot.sendMessage(chatId, "❌ Aucun match live actuellement.");
    }

    let text = "🔥 MATCHS LIVE 🔥\n\n";

    matches.slice(0, 10).forEach(match => {
      const m = extractMatchInfo(match);
      text += `
🏆 ${m.home}
⚔️ ${m.away}

📊 ${m.homeGoals} - ${m.awayGoals}
⏱️ ${m.minute}