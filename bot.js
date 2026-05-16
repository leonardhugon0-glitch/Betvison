const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

/*
====================================
        BETVISION AI
====================================
*/

// VARIABLES
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPORTDB_API_KEY = process.env.SPORTDB_API_KEY;   // ← Nouvelle variable
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// BOT TELEGRAM
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// DEBUG
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
bot.on("polling_error", console.log);

console.log("✅ BETVISION AI lancé");

/* ======================== /START ======================== */
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const message = `
🔥 BETVISION AI 🔥

⚽ Pronostics Football IA
📊 Analyses Live
🤖 Intelligence Artificielle

COMMANDES :

/live → Matchs live
/predict → Pronostic IA
/help → Aide
`;
  bot.sendMessage(chatId, message);
});

/* ======================== /HELP ======================== */
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
📘 AIDE BETVISION AI

/live
➡️ Voir les matchs live

/predict
➡️ Générer un pronostic IA

/start
➡️ Redémarrer le bot
`);
});

/* ======================== /LIVE ======================== */
bot.onText(/\/live/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    bot.sendMessage(chatId, "🔍 Recherche des matchs live...");

    const response = await axios.get("https://api.sportdb.dev/api/football/live", {
      headers: {
        "X-API-Key": SPORTDB_API_KEY
      }
    });

    console.log(JSON.stringify(response.data, null, 2));

    const matches = response.data; // Adapter selon la structure réelle de la réponse

    if (!matches || matches.length === 0) {
      return bot.sendMessage(chatId, "❌ Aucun match live actuellement");
    }

    let text = "🔥 MATCHS LIVE 🔥\n\n";

    matches.slice(0, 10).forEach(match => {
      const home = match.home_team?.name || match.teams?.home?.name || "Home";
      const away = match.away_team?.name || match.teams?.away?.name || "Away";

      const homeGoals = match.home_score ?? match.goals?.home ?? 0;
      const awayGoals = match.away_score ?? match.goals?.away ?? 0;

      const minute = match.minute ?? match.status?.elapsed ?? 0;

      text += `
🏆 ${home}
⚔️ ${away}

📊 ${homeGoals} - ${awayGoals}
⏱️ ${minute}'

━━━━━━━━━━━━━━
`;
    });

    bot.sendMessage(chatId, text);

  } catch