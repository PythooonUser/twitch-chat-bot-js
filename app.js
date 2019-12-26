const fs = require("fs");
const tmi = require("tmi.js");
const logger = require("tmi.js/lib/logger");

const config = JSON.parse(fs.readFileSync("app.cfg.json"));

let commands = JSON.parse(fs.readFileSync(config.commands));
let hashtag = fs.readFileSync(config.hashtag, "utf8");

let viewers = [];
const emotes = { HeyGuys: "HeyGuys" };

let client = new tmi.Client({
    options: {
        debug: true
    },
    connection: {
        reconnect: true
    },
    identity: {
        username: config.username,
        password: config.password
    },
    channels: [config.channel]
});

process.on("SIGINT", () => {
    client.disconnect()
        .then((data) => {
            process.exit();
        });
});

client.on("join", (channel, username, self) => {
    if (!self) {
        logger.info(`[${channel}] ${username} joined`);
    }
});

client.on("part", function (channel, username, self) {
    if (!self) {
        logger.info(`[${channel}] ${username} left`);
    }
});

client.on("chat", function (channel, userstate, commandMessage, self) {
    if (self) { return; };
    if (!config.verbose) { return; };

    if (!viewers.includes(userstate.username)) {
        viewers.push(userstate.username);
        client.say(config.channel, `Welcome to the stream, ${userstate["display-name"]} ${emotes.HeyGuys}`);
    }

    if (!commandMessage.startsWith("!")) { return; };

    let commandName = commandMessage.split(/\s/)[0].toLowerCase();
    commandMessage = commandMessage.slice(commandName.length).trim();

    switch (commandName) {
        case ("!commands"):
            (() => {
                let commandNames = "!commands !hashtag !add !remove"
                    .split(/\s/)
                    .concat(
                        commands.map(command => {
                            if (!command.active || !command.public) { return null; }
                            return command.name;
                        }).filter(name => {
                            return name !== null
                        })
                    ).sort().join(", ");

                client.say(
                    channel,
                    `@${userstate.username} The following commands are available: ${commandNames}`
                );
            })();
            break;
        case ("!hashtag"):
            (() => {
                if (!commandMessage) { client.say(channel, `Usage: !hashtag message`); return; }

                hashtag = (commandMessage.startsWith("#") ? "" : "#") + commandMessage.split(/\s/).map(part => {
                    return part[0].toUpperCase() + part.slice(1);
                }).join("");

                fs.writeFile(
                    config.hashtag,
                    hashtag,
                    (error) => {
                        if (error) { client.say(channel, `@${userstate.username} An error occured while setting your hashtag. Please try again!`); return; }
                        client.say(channel, `@${userstate.username} Your hashtag has been set!`);
                    }
                );
            })();
            break;
        case ("!add"):
            (() => {
                if (!commandMessage) { client.say(channel, `Usage: !add command message`); return; }

                commandName = commandMessage.split(/\s/)[0];
                if (!commandName) { client.say(channel, `Usage: !add command message`); return; }

                commandMessage = commandMessage.substr(commandName.length);
                if (!commandMessage) { client.say(channel, `Usage: !add command message`); return; }

                commandName = (commandName.startsWith("!") ? "" : "!") + commandName;
                commandName = commandName.toLowerCase();

                let commandNames = "!commands !hashtag !add !remove"
                    .split(/\s/)
                    .concat(
                        commands.map(command => {
                            if (!command.active || !command.public) { return null; }
                            return command.name;
                        }).filter(name => {
                            return name !== null
                        })
                    );

                if (commandNames.includes(commandName)) {
                    client.say(channel, `@${userstate.username} The command ${commandName} already exists!`); return;
                }

                commands.push({
                    name: commandName,
                    message: commandMessage,
                    author: userstate.username,
                    public: true,
                    active: true
                });

                client.say(channel, `@${userstate.username} The command ${commandName} has been added!`);

                fs.writeFile(
                    config.commands,
                    JSON.stringify(commands, null, 4) + "\n",
                    (error) => {
                        if (error) { logger.warn(`[${channel}] An error occured while adding the command ${commandName}!`); }
                    }
                );
            })();
            break;
        case ("!remove"):
            (() => {
                if (!commandMessage) { client.say(channel, `Usage: !remove command`); return; }

                commandMessage = (commandMessage.startsWith("!") ? "" : "!") + commandMessage.toLowerCase();

                if ("!commands !hashtag !add !remove".split(/\s/).includes(commandMessage)) {
                    client.say(channel, `@${userstate.username} The command ${commandMessage} cannot be removed!`);
                    return;
                }

                let command = commands
                    .filter(element => {
                        return element.name === commandMessage && element.active && element.public;
                    });

                if (command.length <= 0) { client.say(channel, `@${userstate.username} The command ${commandMessage} does not exist!`); return; }

                command = command[0];

                if (command.author !== userstate.username) { client.say(channel, `@${userstate.username} The command ${commandMessage} cannot be removed by you. @${command.author} is the owner!`); return; }

                commands = commands
                    .filter(element => {
                        return element.name !== command.name;
                    });

                client.say(channel, `@${userstate.username} The command ${commandMessage} has been removed!`);

                fs.writeFile(
                    config.commands,
                    JSON.stringify(commands, null, 4) + "\n",
                    (error) => {
                        if (error) { logger.warn(`[${channel}] An error occured while removing the command ${commandMessage}!`); }
                    }
                );
            })();
            break;
        default:
            (() => {
                let command = commands
                    .filter(element => {
                        return element.name === commandName && element.active && (element.public || `#${userstate.username}` === channel);
                    });

                if (command.length <= 0) {
                    // client.say(channel, `@${userstate.username} The command ${commandName} does not exist!`);
                    return;
                }

                command = command[0];

                if (`#${command.author}` === channel) {
                    client.say(channel, `${command.message}`);
                }
                else {
                    client.say(channel, `${command.message} (${command.author})`);
                }
            })();
            break;
    }
});

client.connect();
