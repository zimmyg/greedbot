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

var Game = function (bot, channelID, channelPrefix) {
    this.bot = bot;
    this.channelID = channelID;
    this.channelPrefix = channelPrefix;
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
                await this.handleSetupCommand(user, userID, args);
                break;

            case 'init':
                await this.handleInitCommand(user, userID, args);
                break;

            case 'quit':
                await this.handleQuitCommand(user, userID, args);
                break;

            case 'roll':
                await this.handleRollCommand(user, userID, args);
                break;

            case 'hold':
                await this.handleHoldCommand(user, userID, args);
                break;

            case 'bank':
                await this.handleBankCommand(user, userID, args);
                break;

            case 'score':
                await this.handleScoreCommand(user, userID, args);
                break;

            case 'order':
                await this.handleOrderCommand(user, userID, args);
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

Game.prototype.handleScoreCommand = async function(user, userID, args) {
    // call to check the current scores for everyone
    if (!this.checkGameRunning()) {
        await this.sendMessage({
            message: "There is no game currently running, type !init to start a new game!"
        });
        return false;
    }

    var arrCpy = this.game.players.slice();
    var sorted = arrCpy.sort((a, b) => {return b.score - a.score}); // sort descending by score
    var message = "";
    var index = 1;
    for (var player of sorted) {
        message += index + ": <@" + player.id + "> - " + player.totalScore + "\n";
    }

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
        message += prefix + index + ": <@" + player.id + "> " + suffix + "\n";
    }

    await this.sendMessage({
        message: message
    });
};

Game.prototype.handleQuitCommand = async function(user, userID, args) {
    this.game = null;
    await this.sendMessage({
        message: "Thank you for playing Greed! Type !init to start a new game"
    });
};

Game.prototype.handleBankCommand = async function(user, userID, args) {
    // the user is attempting to take what score they have held and then move to the next round
    if (!(await this.doCommonChecks(user, userID))) {
        return;
    }

    var roundScore = this.game.currentRound.totalScore;
    var curPlayer = this.getCurrentPlayerObj();
    var firstScoreThreshold = 500; // TODO make this config
    if (curPlayer.totalScore < firstScoreThreshold && roundScore < firstScoreThreshold) {
        // the user has not scored enough points for their first bank yet, reject the bank and tell them not to be a bitch
        await this.sendMessage({
            message: "Cannot bank for the first time until reaching " + firstScoreThreshold + " points. Don't be a bitch, keep rolling!",
            embed: {
                title: "Remaining Dice",
                fields: this.renderDice(this.game.currentRound.currentRoll)
            }
        })
        return;
    }

    this.bankCurrentScore();

    var curPlayer = this.getCurrentPlayerObj();
    var curUsername = this.getUsername(curPlayer.id);
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
    if (!parsedHolds || !parsedHolds.length) {
        await this.sendMessage({
            message: "Invalid holds, please try again",
            embed: {
                title: "Remaining Dice",
                fields: this.renderDice(this.game.currentRound.currentRoll)
            }
        });
        return;
    }

    var holdValidation = this.getValidatedHoldScore(parsedHolds);
    if (holdValidation.reason) {
        // not valid, we have a reason
        await this.sendMessage({
            message: holdValidation.reason,
            embed: {
                title: "Remaining Dice",
                fields: this.renderDice(this.game.currentRound.currentRoll)
            }
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

    // render the next state so the user knows what they can do
    var curPlayer = this.getCurrentPlayerObj();
    var curUsername = this.getUsername(curPlayer.id);
    var potentialScore = this.game.currentRound.totalScore + curPlayer.totalScore;
    await this.sendMessage({
        message: "<@" + curPlayer.id + "> held " + parsedHolds.length + " for a score of " + holdValidation.score + ". Their round total is now " + this.game.currentRound.totalScore + ", which would put them at " + potentialScore + " if they banked now.",
        embed: {
            title: "Remaining Dice",
            fields: this.renderDice(this.game.currentRound.currentRoll)
        }
    })
};

Game.prototype.parseHolds = function(argsArr) {
    var holdsArr = [];
    for (var holdSetStr of argsArr) {
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

    return holdsArr;
};

Game.prototype.renderDice = function(diceArr) {
    var fieldsArr = [];

    var i = 1;
    for (var die of diceArr) {
        var obj = diceMap[die];
        fieldsArr.push({
            name: i++,
            value: this.renderDiceValue(obj.letter, obj.colourType, obj.colourPrefix),
            inline: true
        })
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

Game.prototype.checkPreReqs = async function() {
    // check that there is not a game already running
    if (this.isGameRunning()) {
        await this.sendMessage({
            message: 'There is already a game running, please end the current game to start a new one'
        });
        return false;
    }

    // check that there are at least two players
    var activeUsers = this.getCurrentChannelActiveUsers();
    if (!activeUsers || !activeUsers.length || activeUsers.length < 2) {
        // technically the game can work with one player, It'll just be really boring. Leaving this off to make it
        // easier to test

        // await this.sendMessage({
        //     message: 'Cannot start game with less than two players'
        // });
        // return false;
    }

    return true;
};

Game.prototype.getCurrentChannelActiveUsers = function() {
    var users = [];
    for (var activeUser of Object.values(this.bot.users)) {
        if (!activeUser.bot) {
            users.push(activeUser);
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

Game.prototype.handleInitCommand = async function(commandUser, commandUserID, commandArgs) {
    if (!(await this.checkPreReqs())) {
        return;
    }

    this.game = {
        players: [],
    };
    this.createRound(0);

    var playersStr = '';
    var order = 0;
    var activePlayers = this.getCurrentChannelActiveUsers();
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

Game.prototype.getCurrentPlayerObj = function() {
    var curOrder = this.game.currentRound.playerOrder;
    var curPlayer;
    for (var player of this.game.players) {
        if (player.order === curOrder) {
            curPlayer = player;
            break;
        }
    }

    return curPlayer;
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
            message: "There is no game currently running, type !init to start a new game!"
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

Game.prototype.getValidatedHoldScore = function(holdDiceArr) {
    var usedIndices = [];
    var score = 0;
    var reason;
    for (var holdDiceSet of holdDiceArr) {
        // this is a hold set, so something like 123 or 5, each number refers to a dice index in the current roll
        // need to convert it into a die set to evaluate value, also make sure the dice aren't being used multiple times

        var diceSet = [];
        for (var dieIndex of holdDiceSet) {
            if (usedIndices.indexOf(dieIndex) >= 0) {
                // invalid, can only use a dice once
                return {
                    score: 0,
                    reason: 'Can only hold a dice once, tried to hold ' + die + ' multiple times'
                };
            }
            usedIndices.push(dieIndex);
            diceSet.push(this.game.currentRound.currentRoll[dieIndex - 1]);
        }

        // need to check if the hold arr matches any scoring combos
        var sorted = diceSet.sort();

        // 6 of a kind
        var unique = new Set(diceSet);
        if (unique.size === 1 && sorted.length === 6) {
            score += 5000;
            continue;
        }
        // $GREED
        if (this.containsSubset(sorted, [0, 1, 2, 3, 4, 5]) && sorted.length === 6) {
            score += 1000;
            continue;
        }
        // $$$
        if (this.containsSubset(sorted, [0, 0, 0]) && sorted.length === 3) {
            score += 600;
            continue;
        }
        // GGG
        if (this.containsSubset(sorted, [1, 1, 1]) && sorted.length === 3) {
            score += 500;
            continue;
        }
        // RRR
        if (this.containsSubset(sorted, [2, 2, 2]) && sorted.length === 3) {
            score += 400;
            continue;
        }
        // E1E1E1
        if (this.containsSubset(sorted, [3, 3, 3]) && sorted.length === 3) {
            score += 300;
            continue;
        }
        // E2E2E2
        if (this.containsSubset(sorted, [4, 4, 4]) && sorted.length === 3) {
            score += 300;
            continue;
        }
        // DDDD
        if (this.containsSubset(sorted, [5, 5, 5, 5]) && sorted.length === 4) {
            score += 400;
            continue;
        }
        // D
        if (sorted.indexOf(5) >= 0 && sorted.length === 1) {
            score += 100;
            continue;
        }
        // G
        if (sorted.indexOf(1) >= 0 && sorted.length === 1) {
            score += 50;
            continue;
        }

        score = 0;
        reason = 'No valid scoring dice in one or more holds';
        break;
    }

    return {
        score: score,
        reason: reason,
        usedDiceIndices: usedIndices
    };
};



Game.prototype.isAnyScoringDice = function(diceArr) {
    // need to check if the dice arr matches any scoring combos - this could be tricky
    var sorted = diceArr.sort();

    // 6 of a kind
    var unique = new Set(diceArr);
    if (unique.size === 1 && diceArr.length === 6) {
        return true;
    }
    // $GREED
    if (this.containsSubset(sorted, [0, 1, 2, 3, 4, 5])) {
        return true;
    }
    // $$$
    if (this.containsSubset(sorted, [0, 0, 0])) {
        return true;
    }
    // GGG
    if (this.containsSubset(sorted, [1, 1, 1])) {
        return true;
    }
    // RRR
    if (this.containsSubset(sorted, [2, 2, 2])) {
        return true;
    }
    // E1E1E1
    if (this.containsSubset(sorted, [3, 3, 3])) {
        return true;
    }
    // E2E2E2
    if (this.containsSubset(sorted, [4, 4, 4])) {
        return true;
    }
    // DDDD
    if (this.containsSubset(sorted, [5, 5, 5, 5])) {
        return true;
    }
    // D
    if (sorted.indexOf(5) >= 0) {
        return true;
    }
    // G
    if (sorted.indexOf(1) >= 0) {
        return true;
    }

    return false;
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

    var dice = this.rollDice(round.currentDice);
    round.currentRoll = dice;
    round.hasRolled = true;
    round.hasHeld = false;

    var anyScoringDice = this.isAnyScoringDice(dice);

    var curUser = this.getCurrentPlayerUser();
    var message = "<@" + curUser.id + "> rolled";
    if (!anyScoringDice) {
        message += "\nOh no, that's a bust! Don't be so greedy next time...";
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

Game.prototype.checkGameFinished = async function() {
    var isFinished = false;

    // game is finished if we have come back around to the player who first tripped the threshold
    var scoreThreshold = 5000; // TODO make this config
    var currPlayer = this.getCurrentPlayerObj();
    if (currPlayer.totalScore >= scoreThreshold) {
        this.game.thresholdBreach = true;
        if (!this.game.thresholdBreachUserId) {
            this.game.thresholdBreachUserId = currPlayer.id;

            // send a warning message that there is one round left until the end
            var curUserName = this.getUsername(currPlayer.id);
            await this.sendMessage({
                message: "<@" + currPlayer.id + "> has reached the maximum score of " + scoreThreshold + ". Each player will have one more round to beat their score, then the game is over!"
            });
        } else if (this.game.thresholdBreachUserId === currPlayer.id) {
            // have come back around to the user who tripped the threshold, so it's over
            isFinished = true;
        }
    }

    if (isFinished) {
        var gameWinnerStats = this.getGameWinnerStats();
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

        await this.sendMessage({
            message: message
        });
        this.game = null;
    }

    return isFinished;
}

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
                reject();
            }
        });
    });
};

module.exports = Game;