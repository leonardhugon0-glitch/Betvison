const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

/*
====================================
 BETVISION AI - API-FOOTBALL LIVE PRO
====================================
*/

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!TELEGRAM_TOKEN) console.error("❌ TELEGRAM_TOKEN manquante");
if (!API_FOOTBALL_KEY) console.error("❌ API_FOOTBALL_KEY manquante");

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ================= SAFE MODE =================
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
bot.on("polling_error", console.error);

console.log("✅ BETVISION AI (API-FOOTBALL) démarré");

// ================= FETCH LIVE MATCHES =================
async function fetchLiveMatches() {
  const url = "https://v3.football.api-sports.io/fixtures?live=all";

  const res = await axios.get(url, {
    headers: {
      "x-apisports-key": API_FOOTBALL_KEY
    },
    timeout: 15000
  });

  return res.data?.response || [];
}

// ================= FORMAT MATCH =================
function formatMatch(item) {
  return {
    home: item?.teams?.home?.name || "Inconnu",
    away: item?.teams?.away?.name || "Inconnu",
    homeGoals: item?.goals?.home ?? 0,
    awayGoals: item?.goals?.away ?? 0,
    minute: item?.fixture?.status?.elapsed ?? 0,
    league: item?.league?.name || "Unknown"
  };
}

// ================= /START =================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `
🔥 BETVISION AI ⚽

✔ LIVE MATCHS
✔ PRONOSTICS IA

Commandes:
/live - matchs live
/predict - analyse IA
/help - aide
`);
});

// ================= /HELP =================
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `
📘 COMMANDES :

/live → matchs en direct
/predict → pronostic IA
`);
});

// ================= /LIVE =================
bot.onText(/\/live/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(chatId, "🔍 Chargement des matchs live...");

    const matches = await fetchLiveMatches();

    if (!matches.length) {
      return bot.sendMessage(chatId, "❌ Aucun match en direct actuellement.");
    }

    let text = "🔥 MATCHS LIVE 🔥\n\n";

    matches.slice(0, 10).forEach((m, i) => {
      const f = formatMatch(m);

      text += `${i + 1}. ${f.home} vs ${f.away}\n`;
      text += `🏆 ${f.league}\n`;
      text += `📊 ${f.homeGoals} - ${f.awayGoals} | ⏱️ ${f.minute}'\n`;
      text += `━━━━━━━━━━━━━━\n`;
    });

    bot.sendMessage(chatId, text);

  } catch (err) {
    console.error("❌ LIVE ERROR:", err.response?.data || err.message);
    bot.sendMessage(chatId, "❌ Erreur API Football");
  }
});

// ================= /PREDICT (GROQ AI) =================
bot.onText(/\/predict/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(chatId, "🤖 Analyse IA...");

    const matches = await fetchLiveMatches();

    if (!matches.length) {
      return bot.sendMessage(chatId, "❌ Aucun match disponible.");
    }

    const m = formatMatch(matches[0]);

    const prompt = `
Tu es un expert en paris sportifs.

Match: ${m.home} vs ${m.away}
Score: ${m.homeGoals}-${m.awayGoals}
Minute: ${m.minute}

Donne :
- vainqueur probable
- over/under 2.5
- score final
`;

    const ai = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const result = ai.data?.choices?.[0]?.message?.content;

    bot.sendMessage(chatId, "🤖 PRONOSTIC IA:\n\n" + result);

  } catch (err) {
    console.error("❌ PREDICT ERROR:", err.response?.data || err.message);
    bot.sendMessage(chatId, "❌ Erreur IA");
  }
});