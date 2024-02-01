import dotenv from 'dotenv';
import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { GoogleAuth } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';

dotenv.config();

const PORT = process.env.PORT || 3000;

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  credentials: {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    client_id: process.env.GOOGLE_CLIENT_ID,
    token_url: process.env.GOOGLE_TOKEN_URL,
    universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join('\n'),
  },
});

const bot = new TelegramBot(process.env.TELEGRAM_API_TOKEN, { polling: true });

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

bot.on('message', async message => {
  console.log('message', message);

  const messageText = message?.text;
  const chatId = message?.chat?.id;

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, auth);

  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  const dataFromSpreadsheet = rows.reduce((acc, row) => {
    const rowDate = row.get('date');

    if (rowDate) {
      const linkEntry = {
        title: row.get('title'),
        description: row.get('description'),
        category: row.get('category'),
      };

      acc[rowDate] = acc[rowDate] ? [...acc[rowDate], linkEntry] : [linkEntry];
    }

    return acc;
  }, {});

  bot.sendMessage(chatId, JSON.stringify({ dataFromSpreadsheet }));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
