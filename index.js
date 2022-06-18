const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');


// replace the value below with the Telegram token you receive from @BotFather
const token = fs.readFileSync('.token');

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});


// Listen for any kind of message. There are different kinds of messages.
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    console.log(`Incoming message: ${msg.text}`);

    bot.sendMessage(chatId, 'Downloading....');

    ytsr(msg.text, {limit: 1, pages: 1}).then((result) => {
        console.log(result.items[0]);

        if (result.items.length > 0){
            const filename = `${result.items[0].id}.mp4`;
            ytdl(result.items[0].url)
                .pipe(fs.createWriteStream(filename)).on('finish', () => {
                    console.log(`File downloaded: ${filename}`);
                    bot.sendMessage(chatId, `${result.items[0].title} Downloaded: \n\n ${result.items[0].url}`);
            });
        } else {
            bot.sendMessage(chatId, `No video found for ${msg.text}... `);
        }

    }).catch((err) => {
        console.log(err);
        bot.sendMessage(chatId, 'Something went wrong... please try again');
    });
});