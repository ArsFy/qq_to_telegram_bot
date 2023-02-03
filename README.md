# Telegram QQ 互通 Bot

- Message 同步
- 雙向回覆
- TG -> QQ
    - 貼紙
    - 圖片
    - 文字
- QQ -> TG
    - 圖片
    - 文字

### 修改配置檔案（config.json）

```json
{
    "telegram_bot_token": "",
    "qq_bot_number": "",
    "tg_group": -1000000000,
    "qq_group": 0
}
```

### Install Redis
本專案使用 Redis 存放 3 天內的 message_id 實現回覆

請開放 `127.0.0.1:6379` 作爲 Redis Server

### run

```
npm i
node main.js
```