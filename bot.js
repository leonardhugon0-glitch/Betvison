const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

/*
====================================
 BETVISION AI - FULL PRO (FOOTBALL-DATA + GROQ)
====================================
*/

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const API_KEY = process.env.FOOTBALL_DATA_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ================= STATE =================
let userFavorites = {};
let userLeague = {};
let lastGoals = {};

// ================= SAFE MODE =================
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
bot.on("polling_error", console.error);

console.log("🔥 BETVISION AI FULL STARTED");

// ================= FETCH LIVE =================
async function fetchLiveMatches() {
  const res = await axios.get(
    "https://api.football-data.org/v4/matches?status=IN_PLAY",
    {
      headers: { "X-Auth-Token": API_KEY },
      timeout: 15000
    }
  );

  return res.data.matches || [];
}

// ================= FORMAT =================
function formatMatch(m) {
  return {
    id: m.id,
    home: m.homeTeam.name,
    away: m.awayTeam.name,
    league: m.competition.name,
    homeGoals: m.score.fullTime.home ?? 0,
    awayGoals: m.score.fullTime.away ?? 0,
    status: m.status
  };
}

// ================= GROQ IA =================
async function getPrediction(match) {
  const prompt = `
Tu es un expert en paris sportifs.

Match: ${match.home} vs ${match.away}
Score: ${match.homeGoals}-${match.awayGoals}
Statut: ${match.status}

Donne :
- vainqueur probable
- over/under 2.5
- score final
- confiance (faible/moyen/fort)
`;

  const res = await axios.post(
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

  return res.data.choices[0].message.content;
}

// ================= START MENU =================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `
🔥 BETVISION AI ⚽

📱 MENU

⚽ /live → matchs live
🏆 /league → ligues
🔍 /search nom → recherche
⭐ /follow ID → suivre match
🤖 /predict → IA pronostics
🔔 /alerts on/off
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

    matches.forEach((m, i) => {
      text += `${i + 1}. ${m.home} vs ${m.away}\n`;
      text += `🏆 ${m.league}\n`;
      text += `📊 ${m.homeGoals} - ${m.awayGoals} | ${m.status}\n`;
      text += `━━━━━━━━━━━━━━\n`;
    });

    bot.sendMessage(chatId, text);

  } catch (e) {
    bot.sendMessage(chatId, "❌ erreur live");
  }
});

// ================= SEARCH =================
bot.onText(/\/search (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const q = match[1].toLowerCase();

  try {
    const matches = (await fetchLiveMatches()).map(formatMatch);

    const filtered = matches.filter(m =>
      m.home.toLowerCase().includes(q) ||
      m.away.toLowerCase().includes(q)
    );

    if (!filtered.length)
      return bot.sendMessage(chatId, "❌ aucun match trouvé");

    let text = "🔍 RESULTATS\n\n";

    filtered.forEach(m => {
      text += `${m.home} vs ${m.away}\n`;
      text += `${m.homeGoals}-${m.awayGoals}\n\n`;
    });

    bot.sendMessage(chatId, text);

  } catch (e) {
    bot.sendMessage(chatId, "❌ erreur search");
  }
});

// ================= FOLLOW =================
bot.onText(/\/follow (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const id = match[1];

  if (!userFavorites[chatId]) userFavorites[chatId] = [];
  userFavorites[chatId].push(id);

  bot.sendMessage(chatId, "⭐ Match suivi !");
});

// ================= ALERT SYSTEM =================
async function goalWatcher() {
  try {
    const matches = await fetchLiveMatches();

    matches.forEach(m => {
      const id = m.id;
      const score = (m.score.fullTime.home || 0) + (m.score.fullTime.away || 0);

      if (!lastGoals[id]) lastGoals[id] = score;

      if (score > lastGoals[id]) {
        lastGoals[id] = score;

        Object.keys(userFavorites).forEach(chatId => {
          bot.sendMessage(
            chatId,
            `⚽ BUT ! ${m.homeTeam.name} ${m.score.fullTime.home} - ${m.score.fullTime.away} ${m.awayTeam.name}`
          );
        });
      }
    });

  } catch (e) {}
}

setInterval(goalWatcher, 60000);

// ================= PREDICT =================
bot.onText(/\/predict/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(chatId, "🤖 Analyse IA...");

    const matches = await fetchLiveMatches();

    if (!matches.length)
      return bot.sendMessage(chatId, "❌ aucun match live");

    const m = formatMatch(matches[0]);

    const result = await getPrediction(m);

    bot.sendMessage(chatId, `🤖 PRONOSTIC IA:\n\n${result}`);

  } catch (e) {
    bot.sendMessage(chatId, "❌ erreur IA");
  }
});