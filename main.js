process.env.NTBA_FIX_319 = 1;
const config = require('./config.json');
const fs = require("fs");
const { getTg } = require('./getTgImage');
const { createClient, User } = require("oicq");
// OICQ
const client = createClient(config.qq_bot_number, {
    platform: 2
});
// Redis
const redis = require('redis');
const redisClient = redis.createClient();
redisClient.on('connect', () => console.log('Connected to Redis.....'));
redisClient.connect();
// Telegram
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.telegram_bot_token, { polling: true });

bot.on("polling_error", console.log);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (chatId == config.tg_group) {
        let qqmsg;

        let redisMsgJson;
        try {
            let redisMsg = await redisClient.get(`tg${msg.reply_to_message.message_id}`)
            console.log(redisMsg);
            redisMsgJson = JSON.parse(redisMsg);
        } catch (e) { }

        if (msg.sticker != undefined) {
            let file_id = msg.sticker['file_id']
            let file_path = (await bot.getFile(file_id))['file_path'];
            getTg(`https://api.telegram.org/file/bot${config.telegram_bot_token}/${file_path}`).then(async (res) => {
                let m = [
                    {
                        type: 'image',
                        asface: true,
                        file: fs.readFileSync("./runtime/" + res)
                    }
                ];
                if (redisMsgJson != undefined) m.push({
                    type: 'reply',
                    id: redisMsgJson.message_id
                })

                client.pickGroup(config.qq_group).sendMsg(`${msg.from.first_name}${msg.from.last_name != undefined ? " " + msg.from.last_name : ""}:`)
                qqmsg = await client.pickGroup(config.qq_group).sendMsg(m)
            })
        }

        if (msg.photo != undefined) {
            let file_id = msg.photo[msg.photo.length - 1]['file_id']
            let file_path = (await bot.getFile(file_id))['file_path'];
            getTg(`https://api.telegram.org/file/bot${config.telegram_bot_token}/${file_path}`).then(async (res) => {
                let m = [
                    {
                        type: 'image',
                        file: fs.readFileSync("./runtime/" + res)
                    }
                ];
                if (redisMsgJson != undefined) m.push({
                    type: 'reply',
                    id: redisMsgJson.message_id
                })

                client.pickGroup(config.qq_group).sendMsg(`${msg.from.first_name}${msg.from.last_name != undefined ? " " + msg.from.last_name : ""}: ${msg.caption != undefined ? msg.caption : ""}`)
                qqmsg = await client.pickGroup(config.qq_group).sendMsg(m)
            })
        }

        if (msg.text != undefined) {
            let m = [
                {
                    type: 'text',
                    text: `${msg.from.first_name}${msg.from.last_name != undefined ? " " + msg.from.last_name : ""}: ${msg.text}`
                }
            ];
            if (redisMsgJson != undefined) m.push({
                type: 'reply',
                id: redisMsgJson.message_id
            })

            qqmsg = await client.pickGroup(config.qq_group).sendMsg(m)
        }

        if (qqmsg != undefined) {
            await redisClient.set(`qq${qqmsg.seq}`, String(msg.message_id));
            redisClient.expire(`qq${qqmsg.seq}`, 60 * 60 * 24 * 3);
            await redisClient.set(`tg${msg.message_id}`, JSON.stringify({
                message_id: qqmsg.message_id,
                user_id: config.qq_bot_number,
                time: qqmsg.time,
                seq: qqmsg.seq,
                rand: qqmsg.rand,
                text: msg.text != undefined ? msg.text : '[图片]',
            }));
            redisClient.expire(`tg${msg.message_id}`, 60 * 60 * 24 * 3);
        }
    }
});

client.on("system.online", () => console.log("QQ Logged in!"));

client.on("message", async (e) => {
    if (e.group_id == config.qq_group) {
        let redisMsgId;
        try {
            let redisMsg = await redisClient.get(`qq${e.source.seq}`)
            console.log(redisMsg);
            redisMsgId = !isNaN(Number(redisMsg)) ? Number(redisMsg) : undefined;
        } catch (e) { }

        let text = "";
        let n = 0;
        for (let i = 0; i < e.message.length; i++) {
            switch (e.message[i].type) {
                case "text":
                    n++
                    text += e.message[i].text
                    break
                case "image":
                    bot.sendPhoto(config.tg_group, e.message[i].url, {
                        caption: e.sender.nickname + ":"
                    })
                    break
                default:
                    n++
                    text += e.message[i].text
                    break
            }
        }
        if (n != 0) {
            let tgmsg = await bot.sendMessage(config.tg_group, `${e.sender.nickname}: ${text}`, redisMsgId != undefined ? {
                reply_to_message_id: redisMsgId
            } : undefined)
            await redisClient.set(`tg${tgmsg.message_id}`, JSON.stringify({
                message_id: e.message_id,
                user_id: e.user_id,
                time: e.time,
                seq: e.seq,
                rand: e.rand,
                text,
            }));
            redisClient.expire(`tg${tgmsg.message_id}`, 60 * 60 * 24 * 3);
            await redisClient.set(`qq${e.seq}`, String(tgmsg.message_id));
            redisClient.expire(`qq${e.seq}`, 60 * 60 * 24 * 3);
        }
    }
})

client.on("system.login.qrcode", function (e) {
    process.stdin.once("data", () => {
        this.login();
    });
}).login();

console.log("Start bot...")