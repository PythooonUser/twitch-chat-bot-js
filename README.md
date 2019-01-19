# twitch-chat-bot-js
> A simple Chat Bot for a single Twitch Channel.

## Features
- Easy configuration using JSON files
- Users in chat can create custom commands

## Installation
1. Create configuration file `app.cfg.json` based on `app.cfg.example.json` contents and **adjust for your needs**.
1. Create command database file `commands-base.json` based on `commands.example.json` contents for your default commands.
1. Create command database file `commands-[stream].json` based on `commands.example.json` contents for your individual `[stream]` commands. User commands will be saved here. E.g. `commands-dark-souls-3.json`.
1. Create hashtag file `hashtag-[stream].json` for your individual `[stream]` hashtag. User hashtags will be saved here. E.g. `hashtag-dark-souls-3.json`.
1. Install dependencies using `$ npm install`
1. Run Chat Bot using `$ node app.js`
1. Stop Chat Bot by writing `!disconnect` in Twitch Chat

## Build-in Commands
- `!add`
- `!remove`
- `!commands`
- `!hashtag`
- `!disconnect`
