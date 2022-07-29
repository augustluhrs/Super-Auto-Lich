class Lobby {
    constructor(options){
        // this.id = options.id || "noid"; //idk
        this.lobbyName = options.lobbyName || "noname";
        // this.players = options.players || {};
        this.players = options.players || [];
        this.numPlayers = options.numPlayers || 2;
        this.parties = options.parties || [];
    }
}

module.exports.Lobby = Lobby;