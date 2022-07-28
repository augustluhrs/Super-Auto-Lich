class Player {
    constructor(stats){
        this.userName = stats.userName || "player"; //user name
        this.tier = stats.tier || 1; //tier / challenge rating
        this.partyName = stats.partyName || "";
        this.id = stats.id || "noid";
        this.lobbyName = stats.lobbyName || this.id;
        this.gold = stats.gold || 10;
        this.hp = stats.hp || 10;
        this.turn = stats.turn || 1;
        this.hpLoss = stats.hpLoss || 1;
        this.hires = stats.hires || [null, null, null];
        this.party = stats.party || [null, null, null, null, null];
        this.battleParty = stats.battleParty || this.party;
        this.ready = stats.ready || false;
    }
  }

module.exports.Player = Player;