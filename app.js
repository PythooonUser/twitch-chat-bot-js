const fs = require("fs");
const tmi = require("tmi.js");
const config = require("./app.cfg.json");
const commands = require("./commands.json");

let getCommandByName = function(name) {
    for (let i = 0; i < commands.length; i++) {
        if (commands[i].name === name) {
            return commands[i];
        }
    }
};

let removeCommandWithName = function(name) {
    for (let i = 0; i < commands.length; i++) {
        if (commands[i].name === name) {
            commands.splice(i, 1);
            return;
        }
    }
};

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

client.on("chat", function(channel, userstate, message, self) {
    if (self) { return; };
    if (!message.startsWith("!")) { return; };

    let commandName = message.split(/\s/)[0].toLowerCase();
    switch(commandName) {
        case "!disconnect":
            if ("#" + userstate["username"] === channel) {
                fs.writeFile("./commands.json", JSON.stringify(commands), (err) => {});
                client.disconnect();
            }
            break;

        case "!add":
            let newCommandName = message.split(/\s/)[1];
            if (newCommandName === undefined) {
                client.say(channel, "Usage: !add name message");
                return;
            }

            if (newCommandName.startsWith("!")) {
                newCommandName = newCommandName.substr(1);
            }

            newCommandName = newCommandName.toLowerCase();

            let newCommandMessage = message.substr(5 + newCommandName.length);
            if (!newCommandMessage) {
                client.say(channel, "Usage: !add name message");
                return;
            }

            newCommandMessage = newCommandMessage.trim();

            if (getCommandByName("!" + newCommandName)) {
                client.say(channel, "@" + userstate["display-name"] + " This command already exists!");
                return;
            }

            commands.push({
                name: "!" + newCommandName,
                message: newCommandMessage,
                author: userstate["username"],
                public: true,
                active: true
            });
            client.say(channel, "@" + userstate["display-name"] + " Your command has been added and can now be used!");
            break;

        case "!remove":
            let commandNameToRemove = message.split(/\s/)[1];
            if (commandNameToRemove === undefined) {
                client.say(channel, "Usage: !remove name");
                return;
            }

            if (commandNameToRemove.startsWith("!")) {
                commandNameToRemove = commandNameToRemove.substr(1);
            }

            commandNameToRemove = commandNameToRemove.toLowerCase();
            commandToRemove = getCommandByName("!" + commandNameToRemove);
            if (!commandToRemove) {
                client.say(channel, "@" + userstate["display-name"] + " This command does not exist! Try out !commands to see a list of all available commands!");
                return;
            }
            if (commandToRemove.author !== userstate["username"]) {
                client.say(channel, "@" + userstate["display-name"] + " The command can only be removed by @" + commandToRemove.author);
                return;
            }

            removeCommandWithName("!" + commandNameToRemove);
            client.say(channel, "@" + userstate["display-name"] + " Your command has been removed!");
            break;

        case "!commands":
            let commandNames = [];
            commands.forEach(command => {
                if (command.active && command.public) {
                    commandNames.push(command.name);
                }
            });
            client.say(channel, "Available commands: " + commandNames.join(", "));
            break;

        default:
            let command = getCommandByName(commandName);
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
