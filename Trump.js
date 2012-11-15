var Db = require('mongodb').Db;
var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var rooms = {};

var DB_NAME = 'trump';
var COLLECTION_NAME = 'games';

var sockets = {};

Trump = function (host, port) {
	this.db = new Db(DB_NAME, new Server(host, port, {
        auto_reconnect: true
    }, {}));
    this.db.open(function () {});
};

Trump.prototype.getDbObject = function (callback) {
    this.db.collection(COLLECTION_NAME, function (error, trump_db) {
        callback(trump_db);
    });
};

Trump.prototype.addSocket = function(game_id, socket, callback) {
	if(!sockets[game_id])
		sockets[game_id] = [];
	sockets[game_id].push(socket);
	callback();
};

Trump.prototype.pushPlayerDetails = function(game) {
	for(var i = 0; i < sockets[game.game_id].length; i++) {
		sockets[game.game_id][i].emit('player_details', {player_names: game.player_names});
	}
};

Trump.prototype.pushBid = function(game_id, player_id, bid_value) {
	for(var i = 0; i < sockets[game_id].length; i++) {
		sockets[game_id][i].emit('player_bid_value', {player_id: player_id, bid_value: bid_value});
	}
	// ask next player to bid
	if(player_id != 3) {
		sockets[game_id][player_id + 1].emit('player_bid', {player_id: player_id + 1});
	} else {
		this.computeAndPushTeamBids(game_id);
	}
};

function max(a, b) {
	return (a>b)?a:b;
}

Trump.prototype.computeAndPushTeamBids = function(game_id) {
	var base = this;
	this.db.collection(COLLECTION_NAME, function(error, trump_db) {
		base.getGame(game_id, function(game) {
			var team0bid = max(game.player_bids[0], game.player_bids[2]);
			var team1bid = max(game.player_bids[1], game.player_bids[3]);
			var winning_bid, winning_bid_team, winning_bid_player;
			if(team0bid > team1bid) {
				game.team_bids[0] = team0bid;
				game.team_bids[1] = 0;
				winning_bid = team0bid;
				winning_bid_team = 0;
				winning_bid_player = (game.player_bids[0] > game.player_bids[2])?0:2;
			} else {
				game.team_bids[0] = 0;
				game.team_bids[1] = team1bid;
				winning_bid = team1bid;
				winning_bid_team = 1;
				winning_bid_player = (game.player_bids[1] > game.player_bids[3])?1:3;
			}
			trump_db.update({game_id: game_id}, game, function(error, game) {
				for(var i = 0; i < sockets[game_id].length; i++) {
					sockets[game_id][i].emit('bid_results', { winning_bid: winning_bid, winning_bid_team: winning_bid_team, winning_bid_player: winning_bid_player });
				}
			});
		});
	});
};

Trump.prototype.tryGameStart = function(game_id) {
	this.getGame(game_id, function(game) {
		if(game.player_names.length < 4)
			return;
		//start game by sending signal to all players by sending their cards
		for(var i = 0; i < sockets[game.game_id].length; i++) {
			sockets[game.game_id][i].emit('start_game', {player_cards: game.player_cards[i]});
		}
		//ask player 0 to bid
		sockets[game.game_id][0].emit('player_bid', {player_id: 0});
	});
};

Trump.prototype.addBid = function(game_id, player_id, bid_value) {
	var base = this;
	this.db.collection(COLLECTION_NAME, function(error, trump_db) {
		base.getGame(game_id, function(game) {
			game.player_bids[player_id] = bid_value;
			trump_db.update({game_id: game_id}, game, function(error, game) {
				base.pushBid(game_id, player_id, bid_value);
			});
		});
	});
};

Trump.prototype.getGame = function(game_id, callback) {
	this.db.collection(COLLECTION_NAME, function(error, trump_db) {
		trump_db.findOne({game_id: game_id}, function(err, game) {
			callback(game);
		});
	});
};

Trump.prototype.pushPlayerDetailsToId = function(game_id, index) {
	this.getGame(game_id, function(game) {
		sockets[game.game_id][index].emit('player_details', {player_names: game.player_names});
	});
};

Trump.prototype.findIndexByName = function(game, player_name) {
	var idx = -1;
	for(var i = 0; i < game.player_names.length; i++) {
		if(game.player_names[i] == player_name) {
			return i;
		}
	}
	return -1;
};

Trump.prototype.chooseTrump(function(game_id, player_id, trump_card) {
    for(var i = 0; i < 4; i++) {
        if(i != player_id) {
            sockets[game_id][player_id].emit('trump_chosen', {chosen: true});
        }
    }
});

Trump.prototype.addPlayerToGame = function(game_id, player_name, callback) {
	var base = this;
	this.db.collection(COLLECTION_NAME, function(error, trump_db) {
		base.getGame(game_id, function(game) {
			game.player_names.push(player_name);
			trump_db.update({game_id: game_id}, game, function(error, game) {
				base.getGame(game_id, function(game) {
					callback(game);
				});
			});
		});
	});
};

Trump.prototype.shuffleAndDeal = function() {
	var cards = ['2', '3', '9', '10', 'j', 'q', 'k', 'a'];
	var symbols = ['s', 'd', 'c', 'h'];
	var deck = [];
	// initialize the deck
	for(var i = 0; i < cards.length; i++) {
		for(var j = 0; j < symbols.length; j++) {
			deck.push(cards[i] + symbols[j]);
		}
	}
	// shuffle the pack using knuth shuffle
	for(var i = deck.length - 1; i >= 0; i--) {
		var k = Math.floor(Math.random()*i);
		var temp = deck[k];
		deck[k] = deck[i];
		deck[i] = temp;
	}
	// split the array into 4
	var finaldeck = [];
	var k = 0;
	for(var i = 0; i < 4; i++) {
		var tempdeck = []
		for(var j = 0; j < deck.length / 4; j++) {
			tempdeck.push(deck[k++]);
		}
		finaldeck.push(tempdeck);
	}
	return finaldeck;
};

Trump.prototype.createGame = function(player_name, callback) {
	// initialize the data structure
	var game = {};
	game.game_id = '' + new Date().getTime();
	game.status = "WAITING";
	game.player_cards = this.shuffleAndDeal();
	game.player_names = [];
	game.player_names.push(player_name);
	game.player_bids = [];
	for(var i = 0; i < 4; i++)
		game.player_bids.push(0);
	game.team_bids = [];
	for(var i = 0; i < 2; i++)
		game.team_bids.push(0);
	game.team_points = [];
	for(var i = 0; i < 4; i++)
		game.team_points.push(0);
	game.team_cards_collected = [];
	for(var i = 0; i < 4; i++)
		game.team_cards_collected.push([]);
	game.team_won = -1;
	sockets[game.game_id] = [];
	console.log(game);
	// insert it into the database
	this.getDbObject(function (trump_db) {
		trump_db.insert(game, function() {
			callback(game.game_id);
		});
	});
};

exports.Trump = Trump;
