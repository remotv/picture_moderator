# [Remo.TV](https://remo.tv) Picture Approval Helper

Sends pictures awaiting moderation from Remo to a private Discord channel to allow moderators to view and approve/deny pictures as they see fit.

## Commands
-  `approve image_id` Approves the image with the image ID specified

- `deny image_id` Denies the image with the image ID specified

## `settings.json`
- `discord_token` the bot's login token
- `ws_url` the URL to initialize websockets to
- `ws_token` the Internal Listener authorization key.

## Running
`node index.js`