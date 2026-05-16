const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

/*
====================================
 BETVISION AI - FULL PRO VERSION
====================================
*/

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_KEY = process.env.API_FOOTBALL_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ================= STATE =================
let userLeague = {};
let userFavorites = {};
let lastGoals = {};
let lastMatchesCache = [];

// ================= LEAGUES =================
const LEAGUES = {
  EPL: 39,
  LIGUE_1: 61,
  LA_LIGA: 140,
  SERIE_A: 135,
  UCL: 2
};

// ================= SAFE MODE =================
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
bot.on("polling_error", console.error);

console.log("✅ BETVISION AI FULL STARTED");

// ================= FETCH LIVE =================
async function fetchLiveMatches() {
  const res = await axios.get(
    "https://v3.football.api-sports.io/fixtures?live=all",
    {
      headers: { "x-apisports-key": API_KEY },
      timeout: 15000
    }
  );

  return res.data.response || [];
}

// ================= FORMAT =================
function formatMatch(m) {
  return {
    id: m.fixture.id,
    home: m.teams.home.name,
    away: m.teams.away.name,
    league: m.league.name,
    homeGoals: m.goals.home ?? 0,
    awayGoals: m.goals.away ?? 0,
    minute: m.fixture.status.elapsed ?? 0
  };
}

// ================= MENU START =================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `
🔥 BETVISION AI ⚽

📱 MENU

⚽ /live → matchs live
🏆 /league → choisir ligue
🔍 /search nom → recherche
⭐ /follow ID → suivre match
🤖 /predict → IA
🔔 /alerts on/off
`);
});

// ================= LIVE =================
bot.onText(/\/live/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const matches = (await fetchLiveMatches()).map(formatMatch);
    lastMatchesCache = matches;

    if (!matches.length)
      return bot.sendMessage(chatId, "❌ Aucun match live");

    let text = "🔥 MATCHS LIVE 🔥\n\n";

    matches.slice(0, 10).forEach((m, i) => {
      text += `${i + 1}. ${m.home} vs ${m.away}\n`;
      text += `🏆 ${m.league}\n`;
      text += `📊 ${m.homeGoals} - ${m.awayGoals} | ⏱️ ${m.minute}'\n`;
      text += `⭐ /follow ${m.id}\n\n`;
    });

    bot.sendMessage(chatId, text);

  } catch (e) {
    bot.sendMessage(chatId, "❌ erreur live");
  }
});

// ================= LEAGUE =================
bot.onText(/\/league/, (msg) => {
  bot.sendMessage(msg.chat.id, "🏆 Choisis une ligue :", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "EPL", callback_data: "EPL" }],
        [{ text: "Ligue 1", callback_data: "LIGUE_1" }],
        [{ text: "La Liga", callback_data: "LA_LIGA" }],
        [{ text: "Serie A", callback_data: "SERIE_A" }],
        [{ text: "UCL", callback_data: "UCL" }]
      ]
    }
  });
});

bot.on("callback_query", (q) => {
  const chatId = q.message.chat.id;

  if (LEAGUES[q.data]) {
    userLeague[chatId] = LEAGUES[q.data];
    bot.sendMessage(chatId, `🏆 Ligue sélectionnée : ${q.data}`);
  }
});

// ================= SEARCH =================
bot.onText(/\/search (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1].toLowerCase();

  try {
    const matches = (await fetchLiveMatches()).map(formatMatch);

    const filtered = matches.filter(m =>
      m.home.toLowerCase().includes(query) ||
      m.away.toLowerCase().includes(query)
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

// ================= ALERTS TOGGLE =================
let alerts = {};

bot.onText(/\/alerts on/, (msg) => {
  alerts[msg.chat.id] = true;
  bot.sendMessage(msg.chat.id, "🔔 Alertes ON");
});

bot.onText(/\/alerts off/, (msg) => {
  alerts[msg.chat.id] = false;
  bot.sendMessage(msg.chat.id, "❌ Alertes OFF");
});

// ================= GOAL DETECTOR =================
async function goalWatcher() {
  try {
    const matches = (await fetchLiveMatches()).map(formatMatch);

    matches.forEach(m => {
      const id = m.id;
      const total = m.homeGoals + m.awayGoals;

      if (!lastGoals[id]) lastGoals[id] = total;

      if (total > lastGoals[id]) {
        lastGoals[id] = total;

        Object.keys(alerts).forEach(chatId => {
          if (alerts[chatId]) {
            bot.sendMessage(
              chatId,
              `⚽ BUT ! ${m.home} ${m.homeGoals} - ${m.awayGoals} ${m.away}`
            );
          }
        });
      }
    });

  } catch (e) {}
}

setInterval(goalWatcher, 15000);

// ================= IA PREDICT =================
bot.onText(/\/predict/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const matches = await fetchLiveMatches();
    if (!matches.length)
      return bot.sendMessage(chatId, "❌ aucun match");

    const m = formatMatch(matches[0]);

    const prompt = `
Match: ${m.home} vs ${m.away}
Score: ${m.homeGoals}-${m.awayGoals}
Minute: ${m.minute}

Donne un pronostic clair.
`;

    const ai = await axios.post(
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

    bot.sendMessage(chatId, "🤖 IA:\n\n" +
      ai.data.choices[0].message.content);

  } catch (e) {
    bot.sendMessage(chatId, "❌ erreur IA");
  }
});