const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const API_KEY = process.env.FOOTBALL_DATA_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ================= STATE =================
let userFavorites = {};
let lastGoals = {};

// ================= SAFE MODE =================
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
bot.on("polling_error", console.error);

axios.defaults.timeout = 15000;

console.log("🔥 BETVISION AI FIXED STARTED");

// ================= FETCH LIVE (FIXED) =================
async function fetchLiveMatches() {
  try {
    const res = await axios.get(
      "https://api.football-data.org/v4/matches",
      {
        headers: { "X-Auth-Token": API_KEY }
      }
    );

    const data = res.data;

    if (!data || !Array.isArray(data.matches)) return [];

    return data.matches;

  } catch (e) {
    console.error("LIVE ERROR:", e.response?.data || e.message);
    return [];
  }
}

// ================= FORMAT (FIXED) =================
function formatMatch(m) {
  return {
    id: m.id || 0,
    home: m.homeTeam?.name || "Inconnu",
    away: m.awayTeam?.name || "Inconnu",
    league: m.competition?.name || "League",
    homeGoals: m.score?.fullTime?.home ?? 0,
    awayGoals: m.score?.fullTime?.away ?? 0,
    status: m.status || "UNKNOWN"
  };
}

// ================= GROQ IA =================
async function getPrediction(match) {
  const prompt = `
Tu es expert en paris sportifs.

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

// ================= START =================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `
🔥 BETVISION AI ⚽

⚽ /live → matchs live
🔍 /search x → recherche
⭐ /follow ID → suivre match
🤖 /predict → IA
🔔 /alerts on/off
`);
});

// ================= LIVE =================
bot.onText(/\/live/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const raw = await fetchLiveMatches();
    const matches = raw.map(formatMatch);

    if (!matches.length)
      return bot.sendMessage(chatId, "❌ Aucun match live actuellement.");

    let text = "🔥 MATCHS LIVE 🔥\n\n";

    matches.slice(0, 10).forEach((m, i) => {
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
    const raw = await fetchLiveMatches();
    const matches = raw.map(formatMatch);

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

// ================= ALERT SYSTEM FIXED =================
async function goalWatcher() {
  try {
    const raw = await fetchLiveMatches();

    raw.forEach(m => {
      const id = m.id;

      const home = m.score?.fullTime?.home ?? 0;
      const away = m.score?.fullTime?.away ?? 0;

      const score = home + away;

      if (!lastGoals[id]) lastGoals[id] = score;

      if (score > lastGoals[id]) {
        lastGoals[id] = score;

        Object.keys(userFavorites).forEach(chatId => {
          bot.sendMessage(
            chatId,
            `⚽ BUT ! ${m.homeTeam.name} ${home} - ${away} ${m.awayTeam.name}`
          );
        });
      }
    });

  } catch (e) {
    console.log("alert error");
  }
}

setInterval(goalWatcher, 60000);

// ================= PREDICT (GROQ FIXED) =================
bot.onText(/\/predict/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(chatId, "🤖 Analyse IA...");

    const raw = await fetchLiveMatches();
    if (!raw.length)
      return bot.sendMessage(chatId, "❌ aucun match live");

    const m = formatMatch(raw[0]);

    const result = await getPrediction(m);

    bot.sendMessage(chatId, `🤖 PRONOSTIC IA:\n\n${result}`);

  } catch (e) {
    bot.sendMessage(chatId, "❌ erreur IA");
  }
});