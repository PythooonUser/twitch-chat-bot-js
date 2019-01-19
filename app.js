const fs = require("fs");
const tmi = require("tmi.js");
const logger = require("tmi.js/lib/logger");
const config = require("./app.cfg.json");

let commandsBasePath = config.commandsBasePath;
let commandsStreamPath = config.commandsStreamPath;
let hashtagPath = config.hashtagStreamPath;

let commandsBase = [];
let commandsStream = [];

let builtInCommandNames = ["!add", "!remove", "!commands", "!disconnect", "!hashtag"];

let timeBetweenHashtagChanges = config.timeBetweenHashtagChanges;
let timeOfLastHashtagChange = Date.now();

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

let initCommands = function () {
    commandsBase = require(commandsBasePath);
    commandsStream = require(commandsStreamPath);
};

let saveCommands = function () {
    fs.writeFile(
        commandsStreamPath,
        JSON.stringify(commandsStream, null, 4) + "\n",
        (error) => {
            if (error) { logger.info("Error writing commandsStream file: " + error); };
        }
    );
};

let getCommand = function (name) {
    for (let i = 0; i < commandsBase.length; i++) {
        if (commandsBase[i].name === name) {
            return commandsBase[i];
        }
    }

    for (let i = 0; i < commandsStream.length; i++) {
        if (commandsStream[i].name === name) {
            return commandsStream[i];
        }
    }

    return undefined;
};

let getCommands = function (active = true) {
    commands = [];
    commands = commands.concat(commandsBase);
    commands = commands.concat(commandsStream);
    return commands.filter(command => command.active === active);
};

let addCommand = function (name, message, author, authorDisplay) {
    commandsStream.push({
        name: name,
        message: message,
        author: author,
        authorDisplay: authorDisplay,
        active: true
    });
};

let removeCommand = function (name) {
    for (let i = 0; i < commandsStream.length; i++) {
        if (commandsStream[i].name === name) {
            commandsStream.splice(i, 1);
            return;
        }
    }
};

let handleCommandDisconnect = function (userstate, channel) {
    if ("#" + userstate["username"] === channel) {
        logger.info("Disconnecting from " + channel);
        saveCommands();
        client.disconnect();
    }
};

let handleCommandAdd = function (userstate, commandMessage, channel) {
    let commandName = commandMessage.split(/\s/)[0];
    let commandNameLength = commandName.length;
    if (!commandName) {
        if (config.verbose) {
            client.say(channel, "Usage: !add name message");
        }
        else {
            logger.info("Usage: !add name message");
        }
        return;
    }

    if (!commandName.startsWith("!")) {
        commandName = "!" + commandName;
    }

    commandName = commandName.toLowerCase();

    if (builtInCommandNames.includes(commandName)) {
        if (config.verbose) {
            client.say(channel, "@" + userstate["display-name"] + " This command already exists!");
        }
        else {
            logger.info("@" + userstate["display-name"] + " This command already exists!");
        }
        return;
    }

    let message = commandMessage.substr(commandNameLength);
    if (!message) {
        if (config.verbose) {
            client.say(channel, "Usage: !add name message");
        }
        else {
            logger.info("Usage: !add name message");
        }
        return;
    }

    message = message.trim();

    if (getCommand(commandName)) {
        if (config.verbose) {
            client.say(channel, "@" + userstate["display-name"] + " This command already exists!");
        }
        else {
            logger.info("@" + userstate["display-name"] + " This command already exists!");
        }
        return;
    }

    addCommand(commandName, message, userstate["username"], userstate["display-name"]);
    if (config.verbose) {
        client.say(channel, "@" + userstate["display-name"] + " Your command has been added and can now be used!");
    }
    else {
        logger.info("@" + userstate["display-name"] + " Your command has been added and can now be used!");
    }
};

let handleCommandRemove = function (userstate, commandMessage, channel) {
    let commandNameToRemove = commandMessage.split(/\s/)[0];
    if (!commandNameToRemove) {
        if (config.verbose) {
            client.say(channel, "Usage: !remove name");
        }
        else {
            logger.info("Usage: !remove name");
        }
        return;
    }

    if (!commandNameToRemove.startsWith("!")) {
        commandNameToRemove = "!" + commandNameToRemove;
    }

    commandNameToRemove = commandNameToRemove.toLowerCase();

    let commandToRemove = getCommand(commandNameToRemove);
    if (!commandToRemove) {
        if (builtInCommandNames.includes(commandNameToRemove)) {
            if (config.verbose) {
                client.say(channel, "@" + userstate["display-name"] + " This command cannot be removed!");
            }
            else {
                logger.info("@" + userstate["display-name"] + " This command cannot be removed!");
            }
        }
        else {
            if (config.verbose) {
                client.say(channel, "@" + userstate["display-name"] + " This command does not exist! Try out !commands to see a list of all available commands!");
            }
            else {
                logger.info("@" + userstate["display-name"] + " This command does not exist! Try out !commands to see a list of all available commands!");
            }
        }
        return;
    }

    if (commandToRemove.author !== userstate["username"]) {
        if (config.verbose) {
            client.say(channel, "@" + userstate["display-name"] + " This command can only be removed by @" + commandToRemove.authorDisplay + " !");
        }
        else {
            logger.info("@" + userstate["display-name"] + " This command can only be removed by @" + commandToRemove.authorDisplay + " !");
        }
        return;
    }

    removeCommand(commandToRemove.name);
    if (config.verbose) {
        client.say(channel, "@" + userstate["display-name"] + " Your command has been removed!");
    }
    else {
        logger.info("@" + userstate["display-name"] + " Your command has been removed!");
    }
};

let handleCommandCommands = function (channel) {
    let commandNames = builtInCommandNames.slice();
    getCommands().forEach(command => {
        if (command.active) {
            commandNames.push(command.name);
        }
    });
    if (config.verbose) {
        client.say(channel, "Available commands: " + commandNames.sort().join(", "));
    }
    else {
        logger.info("Available commands: " + commandNames.sort().join(", "));
    }
};

let handleCommandHashtag = function (userstate, commandMessage, channel) {
    commandMessage = commandMessage.trim();
    if (!commandMessage) {
        if (config.verbose) {
            client.say(channel, "Usage: !hashtag message");
        }
        else {
            logger.info("Usage: !hashtag message");
        }
        return;
    }

    if (!commandMessage.startsWith("#")) {
        commandMessage = "#" + commandMessage;
    }

    commandMessage = commandMessage.split(/\s/).map(function(element) {
        if (element) {
            return element[0].toUpperCase() + element.slice(1);
        }
    }).join("");

    let timeDelta = Date.now() - timeOfLastHashtagChange;

    if (timeDelta < timeBetweenHashtagChanges * 1000) {
        if (config.verbose) {
            client.say(channel, "@" + userstate["display-name"] + " The hashtag can be changed again in " + (timeBetweenHashtagChanges - Math.floor(timeDelta / 1000)) + " seconds!");
        }
        else {
            logger.info("@" + userstate["display-name"] + " The hashtag can be changed again in " + (timeBetweenHashtagChanges - Math.floor(timeDelta / 1000)) + " seconds!");
        }
        return;
    }

    timeOfLastHashtagChange = Date.now();

    fs.writeFile(
        hashtagPath,
        commandMessage,
        (error) => {
            if (error) { logger.info("Error writing hashtag fille: " + error); }
        }
    );

    if (config.verbose) {
        client.say(channel, "@" + userstate["display-name"] + " Your hashtag has been set!");
    }
    else {
        logger.info("@" + userstate["display-name"] + " Your hashtag has been set!");
    }
};

let handleCommand = function (commandName, channel) {
    let command = getCommand(commandName);
    if (!command) { return; }

    if ("#" + command.author === channel) {
        if (config.verbose) {
            client.say(channel, command.message);
        }
        else {
            logger.info(command.message);
        }
    }
    else {
        if (config.verbose) {
            client.say(channel, command.message + " (" + command.authorDisplay + ")");
        }
        else {
            logger.info(command.message + " (" + command.authorDisplay + ")");
        }
    }
};

client.on("join", function (channel, username, self) {
    if (!self) {
        logger.info("[" + channel + "] " + username + " joined");
    }
});

client.on("part", function (channel, username, self) {
    if (!self) {
        logger.info("[" + channel + "] " + username + " left");
    }
});

client.on("chat", function (channel, userstate, message, self) {
    if (self) { return; };
    if (!message.startsWith("!")) { return; };

    let commandName = message.split(/\s/)[0].toLowerCase();
    let commandMessage = message.slice(commandName.length).trim();

    switch (commandName) {
        case ("!disconnect"):
            handleCommandDisconnect(userstate, channel);
            break;

        case ("!add"):
            handleCommandAdd(userstate, commandMessage, channel);
            break;

        case ("!remove"):
            handleCommandRemove(userstate, commandMessage, channel);
            break;

        case ("!commands"):
            handleCommandCommands(channel);
            break;

        case ("!hashtag"):
            handleCommandHashtag(userstate, commandMessage, channel);
            break;

        default:
            handleCommand(commandName, channel);
            break;
    }
});

initCommands();
client.connect();
