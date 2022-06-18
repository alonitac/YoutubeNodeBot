const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const AWS = require('aws-sdk');
var ffmpeg = require('fluent-ffmpeg');

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_API_TOKEN || fs.readFileSync('.token');

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

const s3 = new AWS.S3();

// Listen for any kind of message. There are different kinds of messages.
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    console.log(`Incoming message: ${msg.text}`);

    bot.sendMessage(chatId, 'Downloading....');

    ytsr(msg.text, {limit: 1, pages: 1}).then((result) => {
        console.log(result.items[0]);

        if (result.items.length > 0){
            const filename = `${result.items[0].id}.mp4`;
            const frames_dir = result.items[0].id;

            ytdl(result.items[0].url)
                .pipe(fs.createWriteStream(filename)).on('finish', () => {
                    console.log(`File downloaded: ${filename}`);

                    if (!fs.existsSync(frames_dir)){
                        fs.mkdirSync(frames_dir);
                    }

                    console.log(`Extracting frames from ${filename}`);

                    ffmpeg(filename).addOptions(['-r 1']).output(`${frames_dir}/%d.png`)
                        .on('progress', function(info) {
                            console.log('progress ' + info.percent + '%');
                        })
                        .on('end', function () {


                        fs.readdir(frames_dir, (err, files) => {
                            files.forEach(file => {
                                const frame_file = `${frames_dir}/${file}`;
                                console.log(`Uploading ${frame_file}`);

                                s3.upload({
                                    Bucket: process.env.BUCKET_NAME,
                                    Key: frame_file,
                                    Body: fs.readFileSync(frame_file)
                                }, function(err, data) {
                                    if (err) {
                                        console.log(`Failed to upload file ${frame_file} ${err}`);
                                    } else {
                                        console.log(`File uploaded successfully. ${frame_file}`);
                                    }
                                });
                            });
                        });

                        bot.sendMessage(chatId, `${result.items[0].title} done! \n\n ${result.items[0].url}`);
                    }).run();
            });
        } else {
            bot.sendMessage(chatId, `No video found for ${msg.text}... `);
        }

    }).catch((err) => {
        console.log(err);
        bot.sendMessage(chatId, 'Something went wrong... please try again');
    });
});