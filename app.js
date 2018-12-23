const fs = require("fs");
const tmi = require("tmi.js");
const config = require("./app.cfg.json");

let CommandManager = (function() {
    let commandsBase;
    let commandsStream;

    let loadCommands = function(pathBase, pathStream) {
        commandsBase = require(pathBase);
        commandsStream = require(pathStream);
    };

    let saveCommands = function(pathStream) {
        fs.writeFile(pathStream, JSON.stringify(commandsStream, null, 4) + "\n", (err) => {});
    };

    let getCommand = function(name) {
        commands = [];
        commands = commands.concat(commandsBase);
        commands = commands.concat(commandsStream);
        for (let i = 0; i < commands.length; i++) {
            if (commands[i].name === name) {
                return commands[i];
            }
        }
    };

    let getCommands = function() {
        commands = [];
        commands = commands.concat(commandsBase);
        commands = commands.concat(commandsStream);
        return commands;
    };

    let addCommand = function(name, message, author) {
        commandsStream.push({
            name: "!" + name,
            message: message,
            author: author,
            public: true,
            active: true
        });
    };

    let removeCommand = function(name) {
        for (let i = 0; i < commandsStream.length; i++) {
            if (commandsStream[i].name === name) {
                commandsStream.splice(i, 1);
                return;
            }
        }
    };

    return {
        loadCommands: loadCommands,
        saveCommands: saveCommands,
        getCommand: getCommand,
        getCommands: getCommands,
        removeCommand: removeCommand,
        addCommand: addCommand
    };
})();
CommandManager.loadCommands(config.baseCommands, config.streamCommands);

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
    commandToRemove = CommandManager.getCommand("!" + commandNameToRemove);
    if (!commandToRemove) {
        client.say(channel, "@" + userstate["display-name"] + " This command does not exist! Try out !commands to see a list of all available commands!");
        return;
    }
    if (commandToRemove.author !== userstate["username"]) {
        client.say(channel, "@" + userstate["display-name"] + " The command can only be removed by @" + commandToRemove.author);
        return;
    }

    CommandManager.removeCommand("!" + commandNameToRemove);
    client.say(channel, "@" + userstate["display-name"] + " Your command has been removed!");
};

let handleCommandsCommand = function(channel) {
    let commandNames = [];
    CommandManager.getCommands().sort(
        (a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)
    ).forEach(command => {
        if (command.active && command.public) {
            commandNames.push(command.name);
        }
    });
    client.say(channel, "Available commands: " + commandNames.join(", "));
};

let handleDisconnectCommand = function(channel, userstate) {
    if ("#" + userstate["username"] === channel) {
        CommandManager.saveCommands(config.streamCommands);
        client.disconnect();
    }
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

        default:
            let command = CommandManager.getCommand(commandName);
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
