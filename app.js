const fs = require("fs");
const path = require("path");
const tmi = require("tmi.js");

const config = require("./app.cfg.json");
let CommandManager = require("./twitch-chat-bot-js/commandmanager");

let currentFilePath = path.dirname(fs.realpathSync(__filename));

CommandManager.init(
    path.join(currentFilePath, config.baseCommands),
    path.join(currentFilePath, config.streamCommands)
);

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
client.connect();

let handleAddCommand = function(channel, userstate, message) {
    let commandName = message.split(/\s/)[1];
    if (commandName === undefined) {
        client.say(channel, "Usage: !add name message");
        return;
    }

    let messageIndex = "!add".length + commandName.length + 2;

    if (commandName.startsWith("!")) {
        commandName = commandName.substr(1);
    }

    commandName = commandName.toLowerCase();

    if (["hello", "add", "remove", "commands", "disconnect", "info"].includes(commandName)) {
        client.say(channel, "@" + userstate["display-name"] + " This command already exists!");
        return;
    }

    let commandMessage = message.substr(messageIndex);
    if (!commandMessage) {
        client.say(channel, "Usage: !add name message");
        return;
    }

    commandMessage = commandMessage.trim();

    if (CommandManager.getCommand("!" + commandName)) {
        client.say(channel, "@" + userstate["display-name"] + " This command already exists!");
        return;
    }

    CommandManager.addCommand(commandName, commandMessage, userstate["username"]);
    client.say(channel, "@" + userstate["display-name"] + " Your command has been added and can now be used!");
};

let handleRemoveCommand = function(channel, userstate, message) {
    let commandNameToRemove = message.split(/\s/)[1];
    if (commandNameToRemove === undefined) {
        client.say(channel, "Usage: !remove name");
        return;
    }

    if (commandNameToRemove.startsWith("!")) {
        commandNameToRemove = commandNameToRemove.substr(1);
    }

    commandNameToRemove = commandNameToRemove.toLowerCase();
    let [commandToRemove, commandToRemoveType] = CommandManager.getCommand("!" + commandNameToRemove);
    if (!commandToRemove) {
        if (["hello", "add", "remove", "commands", "disconnect"].includes(commandNameToRemove)) {
            client.say(channel, "@" + userstate["display-name"] + " This command cannot be removed!");
            return;
        }

        client.say(channel, "@" + userstate["display-name"] + " This command does not exist! Try out !commands to see a list of all available commands!");
        return;
    }
    if (commandToRemoveType === "base") {
        client.say(channel, "@" + userstate["display-name"] + " This command cannot be removed!");
        return;
    }
    if (commandToRemove.author !== userstate["username"]) {
        client.say(channel, "@" + userstate["display-name"] + " The command can only be removed by @" + commandToRemove.author);
        return;
    }

    CommandManager.removeCommand(commandToRemove.name);
    client.say(channel, "@" + userstate["display-name"] + " Your command has been removed!");
};

let handleCommandsCommand = function(channel) {
    let commandNames = ["!hello", "!add", "!remove", "!commands", "!disconnect", "!info"];
    CommandManager.getCommands().forEach(command => {
        if (command.active && command.public) {
            commandNames.push(command.name);
        }
    });
    client.say(channel, "Available commands: " + commandNames.sort().join(", "));
};

let handleDisconnectCommand = function(channel, userstate) {
    if ("#" + userstate["username"] === channel) {
        CommandManager.saveCommands();
        client.disconnect();
    }
};

let handleHelloCommand = function(channel, userstate) {
    let greeting = config.greetings[Math.floor(Math.random() * config.greetings.length)];
    greeting = greeting.replace(/\{name\}/, userstate["display-name"]);
    client.say(channel, greeting);
};

let handleInfoCommand = function(channel) {
    let infos = CommandManager.getCommands(false);
    let info = infos[Math.floor(Math.random() * infos.length)];
    client.say(channel, info.message);
};

client.on("chat", function(channel, userstate, message, self) {
    if (self) { return; };
    if (!message.startsWith("!")) { return; };

    let commandName = message.split(/\s/)[0].toLowerCase();
    switch(commandName) {
        case "!disconnect":
            handleDisconnectCommand(channel, userstate);
            break;

        case "!add":
            handleAddCommand(channel, userstate, message);
            break;

        case "!remove":
            handleRemoveCommand(channel, userstate, message);
            break;

        case "!commands":
            handleCommandsCommand(channel);
            break;

        case "!hello":
            handleHelloCommand(channel, userstate);
            break;

        case "!info":
            handleInfoCommand(channel)
            break;

        default:
            let [command, ] = CommandManager.getCommand(commandName);
            if (!command) {
                return;
            }
            if ("#" + command.author === channel) {
                client.say(channel, command.message);
            }
            else {
                client.say(channel, command.message + " (" + command.author + ")");
            }
            break;
    }
});
