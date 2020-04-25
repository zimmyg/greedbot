
var defaultPrefix = "!";
var serverSetupCommandName = "greedsetup";
var firstScoreDefaultThreshold = 500;
var maxScoreDefaultThreshold = 5000;

module.exports = {
    defaultPrefix: defaultPrefix,
    serverSetupCommandName: serverSetupCommandName,
    firstScoreDefaultThreshold: firstScoreDefaultThreshold,
    maxScoreDefaultThreshold: maxScoreDefaultThreshold,

    parseServerSetupCommand: function(args) {
        var resultObj = {
            channelPrefix: defaultPrefix,
            error: null
        };

        while (args &&  args.length) {
            var option = args.splice(0, 1)[0].trim();
            if (option === "-p" || option === "-prefix") {
                if (!args.length) {
                    resultObj.error = "Error: prefix parameter found, but no value provided";
                    return resultObj;
                }

                var value = args.splice(0, 1)[0];
                if (!value || !value.trim().length) {
                    resultObj.error = "Error: prefix parameter found, but no value provided";
                    return resultObj;
                }
                value = value.trim();
                resultObj.channelPrefix = value;
            }
        }

        return resultObj;
    },

    getDefaultServerSetupCommand:  function() {
        return this.getDefaultCommand(this.serverSetupCommandName);
    },

    getDefaultCommand:  function(name) {
        return this.getCommand(this.defaultPrefix, name);
    },

    getServerSetupCommand:  function(prefix) {
        return this.getCommand(prefix, this.serverSetupCommandName);
    },

    getCommand:  function(prefix, name) {
        return prefix + name;
    }
};