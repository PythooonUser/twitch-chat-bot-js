const fs = require("fs");

let CommandManager = (function() {
    let _pathBase;
    let _pathStream;
    let _commandsBase;
    let _commandsStream;

    let init = function(pathBase, pathStream) {
        _pathBase = pathBase;
        _pathStream = pathStream;

        _loadCommands();
    };

    let _loadCommands = function() {
        _commandsBase = require(_pathBase);
        _commandsStream = require(_pathStream);
    };

    let saveCommands = function() {
        fs.writeFile(_pathStream, JSON.stringify(_commandsStream, null, 4) + "\n", (err) => {});
    };

    let getCommand = function(name) {
        for (let i = 0; i < _commandsBase.length; i++) {
            if (_commandsBase[i].name === name) {
                return [_commandsBase[i], "base"];
            }
        }

        for (let i = 0; i < _commandsStream.length; i++) {
            if (_commandsStream[i].name === name) {
                return [_commandsStream[i], "stream"];
            }
        }

        return [undefined, undefined];
    };

    let getCommands = function(public=true) {
        commands = [];
        commands = commands.concat(_commandsBase);
        commands = commands.concat(_commandsStream);
        return commands.filter(command => command.active && command.public === public);
    };

    let addCommand = function(name, message, author) {
        _commandsStream.push({
            name: "!" + name,
            message: message,
            author: author,
            public: true,
            active: true
        });
    };

    let removeCommand = function(name) {
        for (let i = 0; i < _commandsStream.length; i++) {
            if (_commandsStream[i].name === name) {
                _commandsStream.splice(i, 1);
                return;
            }
        }
    };

    return {
        init: init,
        saveCommands: saveCommands,
        getCommand: getCommand,
        getCommands: getCommands,
        removeCommand: removeCommand,
        addCommand: addCommand
    };
})();

module.exports = CommandManager;
