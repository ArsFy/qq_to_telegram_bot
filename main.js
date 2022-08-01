process.env.NTBA_FIX_319 = 1;
const config = require('./config.json');
const fs = require("fs");
const { getTg } = require('./getTgImage');
const { createClient, User } = require("oicq");
const client = createClient(config.qq_bot_number);
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.telegram_bot_token, { polling: true });

bot.on("polling_error", console.log);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (chatId == config.tg_group) {
        if (msg.sticker != undefined) {
            let file_id = msg.sticker['file_id']
            let file_path = (await bot.getFile(file_id))['file_path'];
            getTg(`https://api.telegram.org/file/bot${config.telegram_bot_token}/${file_path}`).then(res => {
                client.pickGroup(config.qq_group).sendMsg(`${msg.from.first_name}${msg.from.last_name != undefined ? " " + msg.from.last_name : ""}:`)
                client.pickGroup(config.qq_group).sendMsg([
                    {
                        type: 'image',
                        file: fs.readFileSync("./runtime/" + res)
                    }
                ])
            })
        }

        if (msg.photo != undefined) {
            let file_id = msg.photo[msg.photo.length - 1]['file_id']
            let file_path = (await bot.getFile(file_id))['file_path'];
            getTg(`https://api.telegram.org/file/bot${config.telegram_bot_token}/${file_path}`).then(res => {
                client.pickGroup(config.qq_group).sendMsg(`${msg.from.first_name}${msg.from.last_name != undefined ? " " + msg.from.last_name : ""}: ${msg.caption != undefined ? msg.caption : ""}`)
                client.pickGroup(config.qq_group).sendMsg([
                    {
                        type: 'image',
                        file: fs.readFileSync("./runtime/" + res)
                    }
                ])
            })
        }

        if (msg.text != undefined) {
            client.pickGroup(config.qq_group).sendMsg(`${msg.from.first_name}${msg.from.last_name != undefined ? " " + msg.from.last_name : ""}: ${msg.text}`)
        }
    }
});

client.on("system.online", () => console.log("QQ Logged in!"));

client.on("message", async (e) => {
    if (e.group_id == config.qq_group) {
        console.log(e)
        let text = "";
        for (let i = 0; i < e.message.length; i++) {
            switch (e.message[i].type) {
                case "text":
                    text += e.message[i].text
                    break
                case "image":
                    bot.sendPhoto(config.tg_group, e.message[i].url, {
                        caption: e.sender.nickname + ":"
                    })
                    break
                default:
                    text += e.message[i].text
                    break
            }
        }
        bot.sendMessage(config.tg_group, `${e.sender.nickname}: ${text}`)
    }
})

client.on("system.login.qrcode", function (e) {
    process.stdin.once("data", () => {
        this.login();
    });
}).login();

console.log("Start bot...")