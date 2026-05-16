const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

/*
====================================
 BETVISION AI - LIVE PRO VERSION
====================================
*/

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPORTDB_API_KEY = process.env.SPORTDB_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ================= MEMORY =================
let lastMatches = [];
let subscribers = {}; // { chatId: true }
let selectedLeague = {}; // { chatId: "Premier League" }

// ================= SAFE MODE =================
process.on("uncaughtException", (e) => console.log("❌", e));
process.on("unhandledRejection", (e) => console.log("❌", e));

// ================= FETCH LIVE =================
async function fetchLiveMatches() {
  const url = "https://api.sportdb.dev/v1/football/matches/live";

  const res = await axios.get(url, {
    headers: {
      "Authorization": `Bearer ${SPORTDB_API_KEY}`
    },
    timeout: 15000
  });

  return res.data?.data || res.data?.matches || [];
}

// ================= FORMAT =================
function formatMatch(m) {
  return {
    id: m?.id,
    league: m?.league?.name || "Unknown",
    home: m?.home_team?.name || m?.teams?.home?.name || "Inconnu",
    away: m?.away_team?.name || m?.teams?.away?.name || "Inconnu",
    homeGoals: Number(m?.home_score ?? m?.score?.home ?? 0),
    awayGoals: Number(m?.away_score ?? m?.score?.away ?? 0),
    minute: Number(m?.minute ?? m?.elapsed ?? 0),
  };
}

// ================= DETECT GOALS =================
function detectGoals(oldM, newM) {
  const oldMap = new Map(oldM.map(m => [m.id, m]));
  const alerts = [];

  for (const m of newM) {
    const old = oldMap.get(m.id);
    if (!old) continue;

    const oldScore = (old.homeGoals ?? 0) + (old.awayGoals ?? 0);
    const newScore = (m.homeGoals ?? 0) + (m.awayGoals ?? 0);

    if (newScore > oldScore) {
      alerts.push(`⚽ BUT ! ${m.home} ${m.homeGoals} - ${m.awayGoals} ${m.away}`);
    }
  }

  return alerts;
}

// ================= BROADCAST GOALS =================
function sendGoalAlerts(alerts) {
  if (!alerts.length) return;

  Object.keys(subscribers).forEach(chatId => {
    alerts.forEach(msg => {
      bot.sendMessage(chatId, `🔥 LIVE ALERT 🔥\n\n${msg}`);
    });
  });
}

// ================= AUTO REFRESH ENGINE =================
setInterval(async () => {
  try {
    const matches = (await fetchLiveMatches()).map(formatMatch);

    const alerts = detectGoals(lastMatches, matches);
    sendGoalAlerts(alerts);

    lastMatches = matches;
  } catch (e) {
    console.log("❌ refresh error", e.message);
  }
}, 20000); // 20 sec comme LiveScore

// ================= START =================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `
🔥 BETVISION AI PRO 🔥

⚽ LiveScore + IA + Alerts

Commandes :
/live - matchs
/predict - IA
/subscribe - alertes buts
/unsubscribe - stop alertes
/league - filtrer ligue
`);
});

// ================= LIVE =================
bot.onText(/\/live/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const matches = (await fetchLiveMatches()).map(formatMatch);

    if (!matches.length)
      return bot.sendMessage(chatId, "❌ Aucun match live.");

    let text = "🔥 MATCHS LIVE 🔥\n\n";

    matches.slice(0, 10).forEach((m, i) => {
      text += `${i+1}. ${m.home} vs ${m.away}\n`;
      text += `🏆 ${m.league}\n`;
      text += `📊 ${m.homeGoals} - ${m.awayGoals} | ⏱️ ${m.minute}'\n`;
      text += `━━━━━━━━━━━━━━\n`;
    });

    bot.sendMessage(chatId, text);

  } catch (e) {
    bot.sendMessage(chatId, "❌ erreur live");
  }
});

// ================= SUBSCRIBE =================
bot.onText(/\/subscribe/, (msg) => {
  subscribers[msg.chat.id] = true;
  bot.sendMessage(msg.chat.id, "🔔 Alertes BUT activées !");
});

// ================= UNSUBSCRIBE =================
bot.onText(/\/unsubscribe/, (msg) => {
  delete subscribers[msg.chat.id];
  bot.sendMessage(msg.chat.id, "❌ Alertes désactivées.");
});

// ================= LEAGUE FILTER =================
bot.onText(/\/league (.+)/, (msg, match) => {
  selectedLeague[msg.chat.id] = match[1];
  bot.sendMessage(msg.chat.id, `🏆 Ligue sélectionnée : ${match[1]}`);
});

// ================= IA PREDICT =================
bot.onText(/\/predict/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const matches = (await fetchLiveMatches()).map(formatMatch);

    if (!matches.length)
      return bot.sendMessage(chatId, "❌ Aucun match.");

    const m = matches[0];

    const prompt = `
Analyse match:
${m.home} vs ${m.away}
Score: ${m.homeGoals}-${m.awayGoals}
Minute: ${m.minute}

Donne :
- vainqueur
- over/under 2.5
- score final
`;

    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`
        }
      }
    );

    bot.sendMessage(chatId, "🤖 IA:\n\n" + res.data.choices[0].message.content);

  } catch (e) {
    bot.sendMessage(chatId, "❌ erreur IA");
  }
});