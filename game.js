var Common = require("./common.js");

var diceMap = Object.freeze({
    0: {
        letter: "$",
        colourType: "brainfuck",
        colourPrefix: ""
    },
    1: {
        letter: "G",
        colourType: "fix",
        colourPrefix: ""
    },
    2: {
        letter: "R",
        colourType: "diff",
        colourPrefix: "-"
    },
    3: {
        letter: "E",
        colourType: "css",
        colourPrefix: ""
    },
    4: {
        letter: "E",
        colourType: "glsl",
        colourPrefix: "#"
    },
    5: {
        letter: "D",
        colourType: "yaml",
        colourPrefix: ""
    }
});

var scoreList = [
    {
        name: "Six Of A Kind",
        score: 5000,
    },
    {
        name: "$GREED",
        dice: [0, 1, 2, 3, 4, 5],
        score: 1000
    },
    {
        name: "Three $'s",
        dice: [0, 0, 0],
        score: 600
    },
    {
        name: "Three G's",
        dice: [1, 1, 1],
        score: 500
    },
    {
        name: "Three R's",
        dice: [2, 2, 2],
        score: 400
    },
    {
        name: "Three Green E's",
        dice: [3, 3, 3],
        score: 300
    },
    {
        name: "Three Orange E's",
        dice: [4, 4, 4],
        score: 300
    },
    {
        name: "Four D's",
        dice: [5, 5, 5, 5],
        score: 800
    },
    {
        name: "One D",
        dice: [5],
        score: 100
    },
    {
        name: "One G",
        dice: [1],
        score: 50
    },

];

var Game = function (bot, channelID, channelPrefix) {
    this.bot = bot;
    this.channelID = channelID;
    this.channelPrefix = channelPrefix;
    this.firstScoreThreshold = Common.firstScoreDefaultThreshold;
    this.maxScoreThreshold = Common.maxScoreDefaultThreshold;
    this.leaderBoardStats = {
        totalGamesPlayed: 0,
        players: {}
    };
};

Game.prototype.handleDisconnect = function () {
    console.log("Bot disconnected");
    /*bot.connect()*/ //Auto reconnect
};

Game.prototype.handleAny = function (event) {
    /*console.log(rawEvent)*/ //Logs every event
};

Game.prototype.handleReady = function (event) {
    console.log("Connected!");
    console.log("Logged in as: ");
    console.log(this.bot.username + " - (" + this.bot.id + ")");
};

Game.prototype.handlePresence = function(user, userID, status, game, event) {
    /*console.log(user + " is now: " + status);*/
};

Game.prototype.handleMessage = async function(user, userID, message, event) {
    if (message.startsWith(this.channelPrefix)) {
        var args = message.substring(this.channelPrefix.length).split(' ');
        var cmd = args[0];

            args = args.splice(1);
                switch(cmd) {
            case 'ping':
                await this.sendMessage({
                    message: 'Pong!'
                });
                break;

            case Common.serverSetupCommandName:
                await this.handleSetupCommand(user, userID, args, event);
                break;

            case 'start':
                await this.handleInitCommand(user, userID, args, event);
                break;

            case 'rules':
                await this.handleRulesCommand(user, userID, args, event);
                break;

            case 'board':
                await this.handleLeaderBoardCommand(user, userID, args, event);
                break;

            case 'quit':
                await this.handleQuitCommand(user, userID, args, event);
                break;

            case 'roll':
                await this.handleRollCommand(user, userID, args, event);
                break;

            case 'hold':
                await this.handleHoldCommand(user, userID, args, event);
                break;

            case 'bank':
                await this.handleBankCommand(user, userID, args, event);
                break;

            case 'score':
                await this.handleScoreCommand(user, userID, args, event);
                break;

            case 'order':
                await this.handleOrderCommand(user, userID, args, event);
                break;
        }

    } else if (message.startsWith(Common.getDefaultServerSetupCommand())) {
        // someone has asked for the setup info but hasn't used the correct server prefix, remind them what it is so
        // they can use it next time
        this.sendMessage({
            message: "It looks like you're trying to talk to me, but the Greed bot prefix for this channel has been changed. \nPlease prefix all commands with " + this.channelPrefix
        })
    }
};



Game.prototype.getPlayerLeaderBoardStats = function(userId) {
    var stats = this.leaderBoardStats.players[userId];
    if (!stats) {
        stats = {
            id: userId,
            lifetimeGamesPlayed: 0,
            lifetimeGamesWon: 0,
            lifetimeTotalScore: 0
        };
        this.leaderBoardStats.players[userId] = stats;
    }

    return stats;
};

Game.prototype.updatePlayerLeaderBoard = function(player, wasWinner) {
    var stats = this.getPlayerLeaderBoardStats(player.id);
    stats.lifetimeTotalScore += player.totalScore;
    stats.lifetimeGamesPlayed++;
    if (wasWinner) {
        stats.lifetimeGamesWon++;
    }
};

Game.prototype.formatLeaderBoardHeaderText = function(totalGamesPlayed) {
    return "LeaderBoard\n\nTotal Games Played: " + totalGamesPlayed + "\n\nPlayer Stats:\n";
};

Game.prototype.formatLeaderBoardPlayerStatsText = function(userID, totalPlayed, totalWon, totalScore) {
    return "<@" + userID + ">\nTotal Games Played: " + totalPlayed
        + "\nTotal Games Won: " + totalWon
        + "\nTotalScore: " + totalScore + "\n\n";
};

Game.prototype.handleLeaderBoardCommand = async function(user, userID, args, event) {
    var text = this.formatLeaderBoardHeaderText(this.leaderBoardStats.totalGamesPlayed);
    if (this.leaderBoardStats && this.leaderBoardStats.players) {
        for (var player of Object.values(this.leaderBoardStats.players)) {
            text += this.formatLeaderBoardPlayerStatsText(player.id, player.lifetimeGamesPlayed, player.lifetimeGamesWon, player.lifetimeTotalScore);
        }
    } else {
        text = "No games played yet";
    }

    await this.sendMessage({
        message: text
    });
};

Game.prototype.handleRulesCommand = async function(user, userID, args, event) {
    var text = "Welcome to Greed! The dice game where you compete against others as well as your own avarice to see who can get the highest score.";
    text += "\nIn each round, the player whose turn it is gets to roll 6 dice to see what score they can get (see score chart).";
    text += "\nA player must hold at least one valid score before re-rolling the remaining dice until one of two scenarios occur:";
    text += "\n\t1. The player does not roll any scoring dice combinations - At this point the player's turn is over and all the points held in this round are lost";
    text += "\n\t2. The player chooses to bank their current round total and add to their total score for the game - the player's turn is then over";
    text += "\nIf they player manages to score all six dice  in a round, they get all 6 sice back and can continue playing until one of the above conditions is met.";
    text += "\nOnce any player banks a score above the threshold of " + this.maxScoreThreshold + ", each player in the turn order after them has one more chance to bring their total above the leading player before the game ends and the person with the highest score is named the winner.";
    text += "\nUntil a player totals at least " + this.firstScoreThreshold + " points in the current round, they cannot bank their score. Once a player has banked over " + this.firstScoreThreshold + " they are free to bank whatever value they like";

    text += "\n\nScore Chart";
    for (var score of scoreList) {
        text += "\n\t" + score.name + " - " + score.score;
    }

    this.sendMessage({
        message: text
    });
};

Game.prototype.getServerConfig = function() {
    return {
        channelPrefix: this.channelPrefix
    };
};

Game.prototype.handleSetupCommand = async function(user, userID, args) {
    var updated = false;
    var serverConfig;
    if (args.length) {
        // they're asking for the setup, just return it without updating anything
        serverConfig = Common.parseServerSetupCommand(args);
        if (!serverConfig || serverConfig.error) {
            var errorMsg = serverConfig ? serverConfig.error : "Invalid server config passed";
            await this.sendMessage({
                message: errorMsg
            });
            return null;
        }

        this.channelPrefix = serverConfig.channelPrefix;
        updated = true;
    } else {
        // not updated, return the current settings
        serverConfig = this.getServerConfig();
    }

    var message = "";
    var settingsStr = "Bot Prefix: " + serverConfig.channelPrefix;
    if (updated) {
        message = "Channel config updated, new config is: \n" + settingsStr;
    } else {
        message = "Current channel config is: \n" + settingsStr;
    }


    await this.sendMessage({
        message: message
    });
};

Game.prototype.printScores = function() {
    var arrCpy = this.game.players.slice();
    var sorted = arrCpy.sort((a, b) => {return b.totalScore - a.totalScore}); // sort descending by score
    var message = "";
    var index = 1;
    for (var player of sorted) {
        message += index++ + ": <@" + player.id + "> - " + player.totalScore + "\n";
    }

    return message;
}

Game.prototype.handleScoreCommand = async function(user, userID, args) {
    // call to check the current scores for everyone
    if (!this.checkGameRunning()) {
        await this.sendMessage({
            message: "There is no game currently running, type !init to start a new game!"
        });
        return false;
    }

    var message = this.printScores();
    await this.sendMessage({
        message: message
    });
};

Game.prototype.handleOrderCommand = async function(user, userID, args) {
    // call to check the current order of play
    if (!this.checkGameRunning()) {
        await this.sendMessage({
            message: "There is no game currently running, type !init to start a new game!"
        });
        return false;
    }

    var arrCpy = this.game.players.slice();
    var sorted = arrCpy.sort((a, b) => {return a.order - b.order}); // sort ascending by order
    var message = "";
    var index = 1;
    for (var player of sorted) {
        var prefix = "", suffix = "" ;
        if (player.order === this.game.currentRound.playerOrder) {
            prefix = suffix = "**";
        }
        message += prefix + (index++) + ": <@" + player.id + "> " + suffix + "\n";
    }

    await this.sendMessage({
        message: message
    });
};

Game.prototype.handleQuitCommand = async function(user, userID, args) {
    this.game = null;
    await this.sendMessage({
        message: "Thank you for playing Greed! Type " + Common.getCommand(this.channelPrefix, "start") + " to start a new game"
    });
};

Game.prototype.handleBankCommand = async function(user, userID, args) {
    // the user is attempting to take what score they have held and then move to the next round
    if (!(await this.doCommonChecks(user, userID))) {
        return;
    }

    var roundScore = this.game.currentRound.totalScore;
    var curPlayer = this.getCurrentPlayerObj();
    if (curPlayer.totalScore < this.firstScoreThreshold && roundScore < this.firstScoreThreshold) {
        // the user has not scored enough points for their first bank yet, reject the bank and tell them not to be a bitch
        var embed;
        if (this.game.currentRound.currentRoll && this.game.currentRound.currentRoll.length) {
            embed = {
                title: "Remaining Dice",
                fields: this.renderDice(this.game.currentRound.currentRoll)
            };
        }
        await this.sendMessage({
            message: "Cannot bank for the first time until reaching " + this.firstScoreThreshold + " points. Don't be a bitch, keep rolling!",
            embed: embed
        });
        return;
    }

    this.bankCurrentScore();

    await this.sendMessage({
        message: "<@" + curPlayer.id + "> has banked " + roundScore + " points, bringing their total to " + curPlayer.totalScore
    })
    await this.handleNextRoundCommand(user, userID, args);
};

Game.prototype.handleHoldCommand = async function(user, userID, args) {
    // this one is complicated, need to check multiple sets of args and validate them
    if (!(await this.doCommonChecks(user, userID))) {
        return;
    }

    var parsedHolds = this.parseHolds(args);
    if (!parsedHolds.holdsList || !parsedHolds.holdsList.length) {
        var embed;
        if (this.game.currentRound.currentRoll && this.game.currentRound.currentRoll.length) {
            embed = {
                title: "Remaining Dice",
                fields: this.renderDice(this.game.currentRound.currentRoll)
            };
        }

        await this.sendMessage({
            message: "Invalid holds, please try again",
            embed: embed
        });
        return;
    }

    var holdValidation = this.getValidatedHoldScore(parsedHolds.holdsList);
    if (holdValidation.reason) {
        // not valid, we have a reason
        var embed;
        if (this.game.currentRound.currentRoll && this.game.currentRound.currentRoll.length) {
            embed = {
                title: "Remaining Dice",
                fields: this.renderDice(this.game.currentRound.currentRoll)
            };
        }
        await this.sendMessage({
            message: holdValidation.reason,
            embed: embed
        });
        return;
    }

    // update the total round score, update the round state
    this.game.currentRound.totalScore += holdValidation.score;
    this.game.currentRound.hasHeld = true;
    this.game.currentRound.currentDice -= holdValidation.usedDiceIndices.length; // take away the dice used
    for (var usedIndex of holdValidation.usedDiceIndices.sort().reverse()) {
        // go in reverse order so that we can remove the indices without issue
        this.game.currentRound.currentRoll.splice(usedIndex - 1, 1);
    }

    // send info message
    var curPlayer = this.getCurrentPlayerObj();
    var potentialScore = this.game.currentRound.totalScore + curPlayer.totalScore;
    await this.sendMessage({
        message: "<@" + curPlayer.id + "> held " + parsedHolds.holdsList.length + " for a score of " +
            holdValidation.score + ". Their round total is now "
            + this.game.currentRound.totalScore + ", which would put them at " + potentialScore + " if they banked now."
    });

    if (parsedHolds.afterCommand && "roll" === parsedHolds.afterCommand) {
        // immediately re-roll the dice
        await this.handleRollCommand(user, userID, []);

    } else if (parsedHolds.afterCommand && "bank" === parsedHolds.afterCommand) {
        // immediately bank after holding
        await this.handleBankCommand(user, userID, []);

    } else {
        // render the next state so the user knows what they can do
        var embed;
        var message;
        if (this.game.currentRound.currentRoll && this.game.currentRound.currentRoll.length) {
            embed = {
                title: "Remaining Dice",
                fields: this.renderDice(this.game.currentRound.currentRoll)
            };
        } else {
            message = "All dice held, roll again or bank. Don't be a big puss and hold though.";
        }
        await this.sendMessage({
            message: message,
            embed: embed
        })
    }
};

Game.prototype.parseHolds = function(argsArr) {
    var holdsArr = [];
    var afterCommand = '';

    while(argsArr && argsArr.length) {
        var holdSetStr = argsArr.splice(0, 1)[0];

        var isNum = /^\d+$/.test(holdSetStr);
        if (!isNum) {
            // this is a command to be executed immediately after the hold
            afterCommand = holdSetStr;
        } else {
            var holdSet = [];
            var nums = holdSetStr.split("");
            var currentDiceNum = this.game.currentRound.currentRoll.length;

            if (!nums.length) {
                return null;
            }

            for (var num of nums) {
                if (num < 1 || num > (currentDiceNum + 1)) {
                    return null;
                }

                holdSet.push(+num);
            }
            holdsArr.push(holdSet);
        }
    }

    return {
        holdsList: holdsArr,
        afterCommand: afterCommand
    };
};

Game.prototype.renderDice = function(diceArr) {
    var fieldsArr = [];

    if (!diceArr.length) {
        fieldsArr.push({
            name: "None, roll again or bank!",
            inline: true
        })
    } else {
        var i = 1;
        for (var die of diceArr) {
            var obj = diceMap[die];
            fieldsArr.push({
                name: i++,
                value: this.renderDiceValue(obj.letter, obj.colourType, obj.colourPrefix),
                inline: true
            })
        }
    }

    return fieldsArr;
};

Game.prototype.renderDiceValue = function(letter, type, prefix) {
    return "```" + type + "\n" + prefix + letter + "```";
};

Game.prototype.createRound = function(playerOrder) {
    this.game.currentRound = {
        playerOrder: playerOrder,
        totalScore: 0,
        currentDice: 6,
        currentRoll: [],
        hasRolled: false,
        hasHeld: false
    };
};

Game.prototype.updateRound = function(playerOrder) {
    this.game.currentRound.playerOrder = playerOrder;
    this.game.currentRound.totalScore = 0;
    this.game.currentRound.currentDice = 6;
    this.game.currentRound.currentRoll = [];
    this.game.currentRound.hasRolled = false;
    this.game.currentRound.hasHeld = false;
};

Game.prototype.isGameRunning = function() {
    return this.game != null;
}
Game.prototype.getSpecifiedUsers = function(event) {
    var specifiedUserIds = [];
    if (event && event.d && event.d.mentions && event.d.mentions.length) {
        for (var mention of event.d.mentions) {
            specifiedUserIds.push(mention.id);
        }
    }

    return specifiedUserIds;
};

Game.prototype.checkPreReqs = async function(event) {
    // check that there is not a game already running
    if (this.isGameRunning()) {
        await this.sendMessage({
            message: 'There is already a game running, please end the current game to start a new one'
        });
        return false;
    }

    // check that there are at least two players
    var activeUsers = this.getPlayersFromStartCommand((event));
    if (!activeUsers || !activeUsers.length || activeUsers.length < 1) {
        // technically the game can work with one player, It'll just be really boring. Leaving this off to make it
        // easier to test

        await this.sendMessage({
            message: 'Cannot start game with less than one player'
        });
        return false;
    }

    return true;
};

Game.prototype.getCurrentChannelActiveUsers = function() {
    var users = [];
    var serverId = this.bot.channels[this.channelID].guild_id;
    for (var member of Object.values(this.bot.servers[serverId].members)) {
        var user = this.bot.users[member.id];
        if (!user.bot && member.status && member.status !== 'offline' ) {
            users.push(user);
        }
    }

    return users;
};

Game.prototype.randomise = function(arr) {
    var array = arr.slice(); // make a copy and work on that
    var currentIndex = array.length;
    var temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
};

Game.prototype.getPlayersFromStartCommand = function(event) {
    var activeUsers = this.getCurrentChannelActiveUsers();
    var usersSpecified = this.getSpecifiedUsers(event);
    if (usersSpecified && usersSpecified.length) {
        activeUsers = activeUsers.filter(user => usersSpecified.indexOf(user.id) >= 0);
    }

    return activeUsers;
};

Game.prototype.handleInitCommand = async function(commandUser, commandUserID, commandArgs, event) {
    if (!(await this.checkPreReqs(event))) {
        return;
    }

    this.game = {
        players: [],
    };
    this.createRound(0);

    var playersStr = '';
    var order = 0;
    var activePlayers = this.getPlayersFromStartCommand(event);
    activePlayers = this.randomise(activePlayers);
    for (var activeUser of activePlayers) {
        this.game.players.push({
            id: activeUser.id,
            order: order++,
            totalScore: 0
        });

        playersStr += order + ': <@' +  activeUser.id + '>\n';
    }

    var curUser = this.getCurrentPlayerUser();
    var message = "Initialising game with players \n" + playersStr + "\n";
    message += "Game started, it is <@" + curUser.id + ">'s turn!";
    await this.sendMessage({
        message: message
    });
};

Game.prototype.checkPlayerTurn = function(userId) {
    var curPlayer = this.getCurrentPlayerObj();
    return curPlayer.id === userId;
};

Game.prototype.getPlayerObjByOrder = function(order) {
    var foundPlayer;
    for (var player of this.game.players) {
        if (player.order === order) {
            foundPlayer = player;
            break;
        }
    }

    return foundPlayer;
}

Game.prototype.getCurrentPlayerObj = function() {
    var curOrder = this.game.currentRound.playerOrder;
    return this.getPlayerObjByOrder(curOrder);
};

Game.prototype.getCurrentPlayerUser = function() {
    var curPlayer = this.getCurrentPlayerObj();
    return this.bot.users[curPlayer.id];
};

Game.prototype.checkGameRunning = function() {
    return this.game && this.game.players.length && this.game.currentRound;
};

Game.prototype.doCommonChecks = async function(user, userID) {
    if (!this.checkGameRunning()) {
        await this.sendMessage({
            message: "There is no game currently running, type !start to start a new game!"
        });
        return false;
    }

    var curUser = this.getCurrentPlayerUser();
    if (!this.checkPlayerTurn(userID)) {
        await this.sendMessage({
            message: "It is <@" + curUser.id + ">'s turn!"
        });
        return false;
    }

    return true;
};

Game.prototype.arraysEqual = function(a, b) {
    /*
        Array-aware equality checker:
        Returns whether arguments a and b are == to each other;
        however if they are equal-lengthed arrays, returns whether their
        elements are pairwise == to each other recursively under this
        definition.
    */
    if (a instanceof Array && b instanceof Array) {
        if (a.length !== b.length)  // assert same length
            return false;
        for(var i = 0; i < a.length; i++)  // assert each element equal
            if (!this.arraysEqual(a[i], b[i]))
                return false;
        return true;
    } else {
        return a == b;  // if not both arrays, should be the same
    }
}

Game.prototype.containsSubset = function(sortedArr, sortedSubset) {
    var first = sortedArr.indexOf(sortedSubset[0])
    if (first < 0) {
        return false;
    }

    while(first >= 0 && sortedArr.length >= sortedSubset.length) {
        // remove all elements before first
        sortedArr = sortedArr.slice(first);

        // check if the current position matches the subset
        if (this.arraysEqual(sortedSubset, sortedArr.slice(0, sortedSubset.length))) {
            return true;
        }

        // doesn't match, advance by one and loop again, will fall out if the first value is no longer there or if the
        // length is now too short
        sortedArr = sortedArr.slice(1);
        first = sortedArr.indexOf(sortedSubset[0])
    }

    return false;
};

Game.prototype.getDiceSetFromHoldSet = function(holdSet) {
    // this is a hold set, so something like 123 or 5, each number refers to a dice index in the current roll
    // need to convert it into a die set to evaluate value, also make sure the dice aren't being used multiple times

    var usedIndices = [];
    var diceSet = [];
    for (var dieIndex of holdSet) {
        usedIndices.push(dieIndex);
        diceSet.push(this.game.currentRound.currentRoll[dieIndex - 1]);
    }

    return {
        usedIndices: usedIndices,
        diceSet: diceSet
    }
};

Game.prototype.getValidatedHoldScore = function(holdDiceArr) {
    var usedIndices = [];
    var score = 0;
    var reason;
    for (var holdDiceSet of holdDiceArr) {
        // this is a hold set, so something like 123 or 5, each number refers to a dice index in the current roll
        // need to convert it into a die set to evaluate value, also make sure the dice aren't being used multiple times

        var eval = this.getDiceSetFromHoldSet(holdDiceSet);

        // check if a dice has been used more than once
        for (var diceIndex of eval.usedIndices) {
            if (usedIndices.indexOf(diceIndex) >= 0) {
                // invalid, can only use a dice once
                return {
                    score: 0,
                    reason: 'Can only hold a dice once, tried to hold multiple times'
                };
            }
            usedIndices.push(diceIndex);
        }

        // need to check if the hold arr matches any scoring combos
        var matchingScore = this.getDiceScore(eval.diceSet, true);
        if (!matchingScore) {
            score = 0;
            reason = 'No valid scoring dice in one or more holds';
            break;
        } else {
            score += matchingScore.score;
        }
    }

    return {
        score: score,
        reason: reason,
        usedDiceIndices: usedIndices
    };
};

Game.prototype.getDiceScore = function(diceArr, validateLength) {
    // need to check if the dice arr matches any scoring combos - this could be tricky
    var sorted = diceArr.slice().sort();

    // 6 of a kind
    var unique = new Set(sorted);
    if (unique.size === 1 && sorted.length === 6) {
        return scoreList[0];
    }
    // $GREED
    if (this.containsSubset(sorted, [0, 1, 2, 3, 4, 5]) && (!validateLength || sorted.length === 6)) {
        // sort greed so it looks nice and is easier to identify
        diceArr.sort();
        return scoreList[1];
    }
    // $$$
    if (this.containsSubset(sorted, [0, 0, 0]) && (!validateLength || sorted.length === 3)) {
        return scoreList[2];
    }
    // GGG
    if (this.containsSubset(sorted, [1, 1, 1]) && (!validateLength || sorted.length === 3)) {
        return scoreList[3];
    }
    // RRR
    if (this.containsSubset(sorted, [2, 2, 2]) && (!validateLength || sorted.length === 3)) {
        return scoreList[4];
    }
    // E1E1E1
    if (this.containsSubset(sorted, [3, 3, 3]) && (!validateLength || sorted.length === 3)) {
        return scoreList[5];
    }
    // E2E2E2
    if (this.containsSubset(sorted, [4, 4, 4]) && (!validateLength || sorted.length === 3)) {
        return scoreList[6];
    }
    // DDDD
    if (this.containsSubset(sorted, [5, 5, 5, 5]) && (!validateLength || sorted.length === 4)) {
        return scoreList[7];
    }
    // D
    if (sorted.indexOf(5) >= 0 && (!validateLength || sorted.length === 1)) {
        return scoreList[8];
    }
    // G
    if (sorted.indexOf(1) >= 0 && (!validateLength || sorted.length === 1)) {
        return scoreList[9];
    }
};

Game.prototype.handleRollCommand = async function(user, userID, args) {
    if (!(await this.doCommonChecks(user, userID))) return;

    var round = this.game.currentRound;
    if (round.hasRolled && !round.hasHeld) {
        // user has rolled but not held anything and is capable of holding, must submit a hold first before rolling
        await this.sendMessage({
            message: "Must hold at least one scoring dice before rolling again, you can also bank the current score if you don't wish to roll",
        });
        return;
    }

    if (round.currentDice === 0) {
        // we've run out of dice, reset to six
        // Not sure if this is correct in all cases, keep an eye on it
        round.currentDice = 6;
    }

    var hadRolled = round.hasRolled;

    var dice = this.rollDice(round.currentDice);
    round.currentRoll = dice;
    round.hasRolled = true;
    round.hasHeld = false;

    var anyScoringDice = this.getDiceScore(dice, false);

    var curUser = this.getCurrentPlayerUser();
    var message = "<@" + curUser.id + "> rolled";
    if (!anyScoringDice) {
        if (!hadRolled) {
            message += "\nOh no, that's a bust! Wow, you're terrible at this game...";

        } else if (round.totalScore < this.firstScoreThreshold) {
            message += "\nOh no, that's a bust! Hate to not break 500 in one roll...";

        } else {
            message += "\nOh no, that's a bust! Don't be so greedy next time...";
        }
    }

    var fields = this.renderDice(dice);
    await this.sendMessage({
        message: message,
        embed: {
            fields: fields
        },
    });

    if (!anyScoringDice) {
        this.bustCurrentScore();
        await this.handleNextRoundCommand(user, userID, null);
    }
};

Game.prototype.handleNextRoundCommand = async function(user, userID, args) {
    if (!(await this.doCommonChecks(user, userID))) return;

    // bank the current score for the current player
    this.bankCurrentScore();

    // check if the game is finished
    if ((await this.checkGameFinished())) return;

    // advance to next round if game not finished
    this.updateRound(this.getNextPlayerOrder());

    var currentPlayer = this.getCurrentPlayerObj();
    var currentUser = this.getCurrentPlayerUser();
    var message = "It is now <@" + currentUser.id + ">'s turn. Current score is " + currentPlayer.totalScore;
    await this.sendMessage({
        message: message
    });
};

Game.prototype.getUsername = function(userID) {
    return this.bot.users[userID].username;
};

Game.prototype.getGameWinnerStats = function() {
    // find the player(s) with the highest score and return their details as well as the score
    var maxPlayers = [];
    for (var player of this.game.players) {
        if (!maxPlayers.length) {
            maxPlayers.push(player);
        } else if (maxPlayers[0].totalScore < player.totalScore) {
            maxPlayers = [ player ];
        } else if (maxPlayers[0].totalScore === player.totalScore) {
            maxPlayers.push(player);
        }
    }

    return maxPlayers;
};

Game.prototype.getNextPlayerId = function() {
    var order = this.getNextPlayerOrder();
    return this.getPlayerObjByOrder(order).id;
};

Game.prototype.getWinnerIds = function(gameWinnerStats) {
    return gameWinnerStats.map(player => player.id);
}

Game.prototype.updateLeaderBoards = function(gameWinnerStats) {
    var winnerIds = this.getWinnerIds(gameWinnerStats);
    for (var player of this.game.players) {
        var wasWinner = winnerIds.indexOf(player.id) >= 0;
        this.updatePlayerLeaderBoard(player, wasWinner);
    }
    this.leaderBoardStats.totalGamesPlayed++;
};

Game.prototype.checkGameFinished = async function() {
    var isFinished = false;

    // game is finished if we have come back around to the player who first tripped the threshold
    var currPlayer = this.getCurrentPlayerObj();
    if (currPlayer.totalScore >= this.maxScoreThreshold && !this.game.thresholdBreach) {
        this.game.thresholdBreach = true;
        this.game.thresholdBreachUserId = currPlayer.id;

        // send a warning message that there is one round left until the end
        await this.sendMessage({
            message: "<@" + currPlayer.id + "> has reached the maximum score of " + this.maxScoreThreshold + ". Each player will have one more round to beat their score, then the game is over!"
        });
    } else if (this.game.thresholdBreach && this.game.thresholdBreachUserId === this.getNextPlayerId()) {
        // have come back around to the user who tripped the threshold, so it's over
        isFinished = true;
    }

    if (isFinished) {
        var gameWinnerStats = this.getGameWinnerStats();
        // update leaderboards
        this.updateLeaderBoards(gameWinnerStats);

        var message = '';
        if (gameWinnerStats.length > 1) {
            var playernames = "<@" + gameWinnerStats[0].id + ">";
            for (var i = 1; i < gameWinnerStats.length; i++) {
                var winner = gameWinnerStats[i];
                playernames += " and <@" + winner.id + ">";
            }

            message = "It's a " + gameWinnerStats.length + " way tie! Congrats " + playernames + "! You won with " + gameWinnerStats[0].totalScore + " points!";
        } else {
            message = "Congrats <@" + gameWinnerStats[0].id + ">! You won with " + gameWinnerStats[0].totalScore + " points!";
        }

        // print final scores
        message += "\nThe final tally was:\n";
        message += this.printScores();

        await this.sendMessage({
            message: message
        });
        this.game = null;
    }

    return isFinished;
};

Game.prototype.bankCurrentScore = function() {
    var currPlayer = this.getCurrentPlayerObj();
    currPlayer.totalScore += this.game.currentRound.totalScore;
    this.game.currentRound.totalScore = 0;
};

Game.prototype.bustCurrentScore = function() {
    this.game.currentRound.totalScore = 0;
};

Game.prototype.getNextPlayerOrder = function() {
    var nextOrder = this.game.currentRound.playerOrder + 1;
    if (nextOrder === this.game.players.length) {
        // reset to zero
        nextOrder = 0;
    }

    return nextOrder;
};

Game.prototype.rollDice = function(numDice) {
    var arr = [];
    for (var i = 0; i < numDice; i++) {
        arr.push(Math.floor(Math.random() * 6));
    }
    return arr;
};

Game.prototype.sendMessage = async function(options) {
    // extend the passed options with the channel id so that it doesn't need to be passed everywhere
    var opts = Object.assign({to: this.channelID}, options);
    return new Promise((resolve, reject) => {
        this.bot.sendMessage(opts, (error) => {
            if (!error) {
                resolve();
            } else {
                reject(error);
            }
        });
    });
};

module.exports = Game;