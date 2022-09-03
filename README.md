# twitch-chat-bot-js

> A simple Twitch chat bot that can be run from the command-line.

![Chat Bot](./.media/TwitterPost.png)

## Features

- Easy configuration using JSON files
- Users in chat can create custom commands
  - Using `!add` or `!remove`
- Viewers writing their first message in current stream session are greeted
  - Welcome to the stream, `username` HeyGuys
- Verbose option to toggle whether chat bot can send messages to chat
- Chat log of stream in command-line

## Installation and Setup

1. Create configuration file `app.cfg.json` based on `app.cfg.json.dist` contents and **adjust based on your needs**
1. Create command database file `commands.json` based on `commands.json.dist` contents for your default commands. In addition all user commands will be saved here
1. Install dependencies using `$ npm install`
1. Run chat bot using `$ node app.js`
1. Stop chat bot by using keyboard interrupt `Ctrl+C`

The config file contains the following properties:

- username: Twitch bot username
- password: Twitch bot password
- channel: Channel name
- verbose: Whether to send messages to chat
- commands: Path to command database file

## Build-in Commands

- `!add`
- `!remove`
- `!commands`
