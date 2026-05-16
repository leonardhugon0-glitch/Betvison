const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

/*
====================================
        BETVISION AI
====================================
*/

// VARIABLES

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// BOT TELEGRAM

const bot = new TelegramBot(TELEGRAM_TOKEN, {
  polling: true
});

// DEBUG

process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

bot.on("polling_error", console.log);

console.log("✅ BETVISION AI lancé");

/*
====================================
            /START
====================================
*/

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

/*
====================================
            /HELP
====================================
*/

bot.onText(/\/help/, async (msg) => {

  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `
📘 AIDE BETVISION AI

/live
➡️ Voir les matchs live

/predict
➡️ Générer un pronostic IA

/start
➡️ Redémarrer le bot
`
  );

});

/*
====================================
            /LIVE
====================================
*/

bot.onText(/\/live/, async (msg) => {

  const chatId = msg.chat.id;

  try {

    bot.sendMessage(
      chatId,
      "🔍 Recherche des matchs live..."
    );

    const response = await axios.get(
      "https://v3.football.api-sports.io/fixtures",
      {
        headers: {
          "x-apisports-key": FOOTBALL_API_KEY
        },
        params: {
          live: "all"
        }
      }
    );

    console.log(
      JSON.stringify(response.data, null, 2)
    );

    const matches = response.data.response;

    if (!matches || matches.length === 0) {

      return bot.sendMessage(
        chatId,
        "❌ Aucun match live actuellement"
      );

    }

    let text = "🔥 MATCHS LIVE 🔥\n\n";

    matches.slice(0, 10).forEach(match => {

      const home = match.teams.home.name;
      const away = match.teams.away.name;

      const homeGoals = match.goals.home;
      const awayGoals = match.goals.away;

      const minute =
        match.fixture.status.elapsed || 0;

      text += `
🏆 ${home}
⚔️ ${away}

📊 ${homeGoals} - ${awayGoals}
⏱️ ${minute}'

━━━━━━━━━━━━━━
`;

    });

    bot.sendMessage(chatId, text);

  } catch (error) {

    console.log(
      error.response?.data || error.message
    );

    bot.sendMessage(
      chatId,
      "❌ Erreur récupération matchs"
    );

  }

});

/*
====================================
            /PREDICT
====================================
*/

bot.onText(/\/predict/, async (msg) => {

  const chatId = msg.chat.id;

  try {

    bot.sendMessage(
      chatId,
      "🤖 Analyse IA en cours..."
    );

    // MATCHS LIVE

    const response = await axios.get(
      "https://v3.football.api-sports.io/fixtures",
      {
        headers: {
          "x-apisports-key": FOOTBALL_API_KEY
        },
        params: {
          live: "all"
        }
      }
    );

    const matches = response.data.response;

    if (!matches || matches.length === 0) {

      return bot.sendMessage(
        chatId,
        "❌ Aucun match live disponible"
      );

    }

    // PREMIER MATCH

    const match = matches[0];

    const home = match.teams.home.name;
    const away = match.teams.away.name;

    const homeGoals = match.goals.home;
    const awayGoals = match.goals.away;

    const minute =
      match.fixture.status.elapsed || 0;

    // PROMPT IA

    const prompt = `
Analyse ce match de football :

${home} vs ${away}

Score actuel :
${homeGoals} - ${awayGoals}

Minute :
${minute}

Donne :

- gagnant probable
- over 2.5
- BTTS
- niveau de confiance %

Réponse courte et propre.
`;

    // IA GROQ

    const groqResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      },
      {
        headers: {
          "Authorization":
            `Bearer ${GROQ_API_KEY}`,
          "Content-Type":
            "application/json"
        }
      }
    );

    const prediction =
      groqResponse.data
      .choices[0]
      .message
      .content;

    // MESSAGE FINAL

    const finalMessage = `
🤖 PRONOSTIC IA

⚽ ${home}
vs
${away}

📊 Score :
${homeGoals} - ${awayGoals}

⏱️ ${minute}'

━━━━━━━━━━━━━━

${prediction}

━━━━━━━━━━━━━━

⚠️ Jouez responsablement
`;

    bot.sendMessage(chatId, finalMessage);

  } catch (error) {

    console.log(
      error.response?.data || error.message
    );

    bot.sendMessage(
      chatId,
      "❌ Erreur analyse IA"
    );

  }

});

/*
====================================
        MESSAGE SERVEUR
====================================
*/

console.log(`
====================================
      BETVISION AI ONLINE
====================================
`);