const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, {
  polling: true
});

bot.onText(/\/start/, (msg) => {

  bot.sendMessage(
    msg.chat.id,
    `⚽ Bienvenue sur BetVision AI

Commandes :

/live -> Matchs live
/predict -> Pronostics IA`
  );

});

bot.onText(/\/live/, async (msg) => {

  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "⏳ Recherche des matchs live...");

  try {

    const response = await axios.get(
      'https://v3.football.api-sports.io/fixtures?live=all',
      {
        headers: {
          'x-apisports-key': FOOTBALL_API_KEY
        }
      }
    );

    const matches = response.data.response;

    if(matches.length === 0){
      return bot.sendMessage(chatId, "❌ Aucun match live");
    }

    let text = "🔥 MATCHS LIVE\n\n";

    matches.forEach(match => {

      text += `
🏆 ${match.teams.home.name}
⚔️ ${match.teams.away.name}

📊 ${match.goals.home} - ${match.goals.away}
⏱️ ${match.fixture.status.elapsed}'

`;
    });

    bot.sendMessage(chatId, text);

  } catch(error){

    bot.sendMessage(chatId, "❌ Erreur API Football");

  }

});

bot.onText(/\/predict/, async (msg) => {

  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "🤖 Analyse IA en cours...");

  try {

    const response = await axios.get(
      'https://v3.football.api-sports.io/fixtures?live=all',
      {
        headers: {
          'x-apisports-key': FOOTBALL_API_KEY
        }
      }
    );

    const matches = response.data.response;

    if(matches.length === 0){
      return bot.sendMessage(chatId, "❌ Aucun match live");
    }

    const match = matches[0];

    const home = match.teams.home.name;
    const away = match.teams.away.name;

    const prompt = `
Analyse ce match :

${home} vs ${away}

Donne :
- gagnant probable
- over 2.5
- BTTS
- confiance %

Réponse courte.
`;

    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const prediction =
      groqResponse.data.choices[0].message.content;

    bot.sendMessage(
      chatId,
      `🤖 PRONOSTIC IA

⚽ ${home} vs ${away}

${prediction}`
    );

  } catch(error){

    console.log(error.response?.data || error.message);

    bot.sendMessage(chatId, "❌ Erreur IA");

  }

});

console.log("✅ BetVision AI lancé");
