import dotenv from 'dotenv';
import express from 'express';
import ky from 'ky';
import { load } from 'cheerio';
import { format, fromUnixTime } from 'date-fns';
import TelegramBot from 'node-telegram-bot-api';
import { GoogleAuth } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { determineCategory } from './parser.helpers.js';

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
  const chatId = message?.chat?.id;

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, auth);

  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];

  let article = '';

  try {
    article = await ky.get(message.text).text();
  } catch (error) {
    return bot.sendMessage(chatId, '‼️ Something went wrong while fetching an article!');
  }

  const $ = load(article);

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text() ||
    $('meta[name="title"]').attr('content');

  const description =
    $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');

  const keywords =
    $('meta[property="og:keywords"]').attr('content') || $('meta[name="keywords"]').attr('content');

  try {
    await sheet.addRow({
      date: format(fromUnixTime(message?.date), 'dd/MM/yyyy'),
      title,
      description,
      link: message?.text,
      category: determineCategory(title, description, keywords),
    });

    bot.sendMessage(chatId, '✅ Link has been added successfully!');
  } catch (error) {
    bot.sendMessage(chatId, '🆘 Something went wrong while adding a link to the spreadsheet!');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
