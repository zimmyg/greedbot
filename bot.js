var Discord = require('discord.io');
var auth = require('./auth.json');
var Game = require("./game.js");
var Common = require("./common.js");

var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

// channels where the bot resides
var channels = {  };

var handleDisconnect = function () {
    console.log("Bot disconnected");
    bot.connect(); // Auto reconnect
};

var handleAny = function (event) {
    /*console.log(rawEvent)*/ //Logs every event
};

var handleReady = function (event) {
    console.log("Connected!");
    console.log("Logged in as: ");
    console.log(bot.username + " - (" + bot.id + ")");
};

var handlePresence = function(user, userID, status, game, event) {
    /*console.log(user + " is now: " + status);*/
};

var handleMessage = async function(user, userID, channelID, message, event) {
    if (user.bot) return; // ignore messages from bots

    var setupCommand = Common.getDefaultServerSetupCommand();
    var channel = channels[channelID];
    if (!channel && message.startsWith(setupCommand)) {
        // create a new server channel
        var args = message.substring(setupCommand.length).split(" ");
        var serverConfig = Common.parseServerSetupCommand(args);
        channel = await createNewChannelWithConfig(channelID, serverConfig);
        channels[channelID] = channel;

    } else if (channel) {
        // channel already exists, just pass through to it
        await channel.handleMessage(user, userID, message, event)
            .catch(error => {
                console.log(error);
        });

    } else {
        // must have been an error or for someone else, ignore
    }
};

var createNewChannelWithConfig = async function (channelID, serverConfig) {
    if (!serverConfig || serverConfig.error) {
        var errorMsg = serverConfig ? serverConfig.error : "Invalid channel config passed";
        await sendMessage({
            to: channelID,
            message: errorMsg
        });
        return null;
    }

    var settingsStr = "Bot Prefix: " + serverConfig.channelPrefix;
    var channel = new Game(bot, channelID, serverConfig.channelPrefix);
    await sendMessage({
        to: channelID,
        message: "Created a new Greed config with settings:\n" + settingsStr
    });

    return channel;
};



var sendMessage = async function(options) {
    return new Promise((resolve, reject) => {
        bot.sendMessage(options, (options) => {
            resolve();
        });
    });
};



bot.on("ready", handleReady);
bot.on("message", handleMessage);
bot.on("presence", handlePresence);
bot.on("any", handleAny);
bot.on("disconnect", handleDisconnect);
