const fs = require("fs");
const tmi = require("tmi.js");
const logger = require("tmi.js/lib/logger");

const config = JSON.parse(fs.readFileSync("app.cfg.json"));
let commands = JSON.parse(fs.readFileSync(config.commands));
const strings = JSON.parse(fs.readFileSync(`./assets/strings.${config.language}.json`));
let viewers = [];

let client = new tmi.Client({
  identity: {
    username: config.username,
    password: config.password,
  },
  channels: [config.channel],
  options: {
    debug: true,
  },
  connection: {
    reconnect: true,
    secure: true,
  },
});

client.connect();

process.on("SIGINT", () => {
  client.disconnect().then(() => {
    fs.writeFileSync(
      config.commands,
      JSON.stringify(
        commands.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          } else if (a.name > b.name) {
            return 1;
          } else {
            return 0;
          }
        }),
        null,
        2
      ) + "\n",
      () => {
        logger.warn(`Could not save commands to ${config.commands} :( Will output here instead.`);
        logger.info(
          commands.sort((a, b) => {
            if (a.name < b.name) {
              return -1;
            } else if (a.name > b.name) {
              return 1;
            } else {
              return 0;
            }
          })
        );
      }
    );

    process.exit();
  });
});

client.on("chat", (channel, userstate, commandMessage, self) => {
  if (self) {
    return;
  }
  if (!config.verbose) {
    return;
  }

  const username = config.debug?.randomizeViewerName
    ? "User" + Math.random().toString().substr(2, 6)
    : userstate.username;

  if (config.greetNewViewers && !viewers.includes(username) && "#" + username !== config.channel) {
    viewers.push(username);

    const index = Math.floor(Math.random() * strings.greetings.length);
    const message = strings.greetings[index].replace("$VIEWER_NAME", userstate["display-name"]);
    client.say(channel, message);
  }

  if (!commandMessage.startsWith("!")) {
    return;
  }

  let commandName = commandMessage.split(/\s/)[0].toLowerCase();
  commandMessage = commandMessage.slice(commandName.length).trim();

  switch (commandName) {
    case `!${strings.defaultCommands.commands.name}`:
      (() => {
        let names =
          `!${strings.defaultCommands.commands.name} !${strings.defaultCommands.add.name} !${strings.defaultCommands.remove.name}`
            .split(/\s/)
            .concat(
              commands
                .map((c) => {
                  if (c.active) {
                    return c.name;
                  } else {
                    return null;
                  }
                })
                .filter((name) => {
                  return name !== null;
                })
            )
            .sort()
            .join(", ");

        client.say(channel, `@${username} ${strings.defaultCommands.commands.message}: ${names}`);
      })();
      break;
    case `!${strings.defaultCommands.add.name}`:
      (() => {
        const usage = `@${username} ${strings.defaultCommands.add.usage}`;

        if (!commandMessage) {
          client.say(channel, usage);
          return;
        }

        commandName = commandMessage.split(/\s/)[0];
        if (!commandName) {
          client.say(channel, usage);
          return;
        }

        commandMessage = commandMessage.substr(commandName.length);
        if (!commandMessage) {
          client.say(channel, usage);
          return;
        }

        commandName = (commandName.startsWith("!") ? "" : "!") + commandName;
        commandName = commandName.toLowerCase();

        let commandNames =
          `!${strings.defaultCommands.commands.name} !${strings.defaultCommands.add.name} !${strings.defaultCommands.remove.name}`
            .split(/\s/)
            .concat(
              commands
                .map((command) => {
                  if (!command.active) {
                    return null;
                  }
                  return command.name;
                })
                .filter((name) => {
                  return name !== null;
                })
            );

        if (commandNames.includes(commandName)) {
          client.say(
            channel,
            `@${username} ${strings.defaultCommands.add.alreadyExists.replace(
              "$COMMAND_NAME",
              commandName
            )}`
          );
          return;
        }

        commands.push({
          name: commandName,
          message: commandMessage,
          author: username,
          active: true,
        });

        client.say(
          channel,
          `@${username} ${strings.defaultCommands.add.success.replace(
            "$COMMAND_NAME",
            commandName
          )}`
        );
      })();
      break;
    case `!${strings.defaultCommands.remove.name}`:
      (() => {
        commandMessage = commandMessage.split(/\s/)[0];
        if (!commandMessage) {
          client.say(channel, `@${username} ${strings.defaultCommands.remove.usage}`);
          return;
        }

        commandMessage = (commandMessage.startsWith("!") ? "" : "!") + commandMessage.toLowerCase();

        if (
          `!${strings.defaultCommands.commands.name} !${strings.defaultCommands.add.name} !${strings.defaultCommands.remove.name}`
            .split(/\s/)
            .includes(commandMessage)
        ) {
          client.say(
            channel,
            `@${username} ${strings.defaultCommands.remove.isBuiltIn.replace(
              "$COMMAND_NAME",
              commandMessage
            )}`
          );
          return;
        }

        let command = commands.filter((c) => {
          return c.name === commandMessage && c.active;
        });

        if (command.length <= 0) {
          return;
        }

        command = command[0];

        if (command.author !== username) {
          client.say(
            channel,
            `@${username} ${strings.defaultCommands.remove.isNotAuthor
              .replace("$COMMAND_NAME", commandMessage)
              .replace("$COMMAND_AUTHOR", command.author)}`
          );
          return;
        }

        commands = commands.filter((c) => {
          return c.name !== command.name;
        });

        client.say(
          channel,
          `@${username} ${strings.defaultCommands.remove.success.replace(
            "$COMMAND_NAME",
            commandMessage
          )}`
        );
      })();
      break;
    default:
      (() => {
        let command = commands.filter((c) => {
          return c.name === commandName && c.active;
        });

        if (command.length <= 0) {
          return;
        }
        command = command[0];

        if (`#${command.author}` === channel) {
          client.say(channel, `${command.message}`);
        } else {
          client.say(channel, `${command.message} (${command.author})`);
        }
      })();
      break;
  }
});
