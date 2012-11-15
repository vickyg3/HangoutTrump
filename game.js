var socket = io.connect('http://localhost:3000');;
var game_state = "WAITING";
var player_cards = [];
var player_names = [];
var click_state = "none";

function card_clicked() {
    if(click_state == "none") {
        return;
    }
    var cardno = parseInt(this.id.substring(3);
    if(click_state == "choose_trump") {
        var result = confirm('Are you sure you want to choose ' + player_cards[cardno] + ' as trump?');
        if(!result) {
            return;
        }
        socket.emit('trump_card', {game_id: game_id, player_id: player_id, trump_card: player_cards[cardno]});
    }
}

$(function() {
	socket.emit('handshake', { game_id: game_id, player_name: player_name, player_id: player_id });
    for(var i = 0; i < 8; i++) {
        $('#p0c' + i).click(card_clicked);
    }
});

socket.on('player_details', function(data) {
	player_names = data.player_names;
	var wstr = "<li>";
	wstr += "New players: " + JSON.stringify(data.player_names);
	wstr += "</li>";
	wstr = "<li>";
	var wait = 4 - data.player_names.length;
	wstr += "Waiting for " + wait + " more players";
	wstr += "</li>";
	$('#status').append(wstr);
});

socket.on('start_game', function(data) {
	var wstr = "<li>Game started!</li>";
	if(player_id != 0) {
		wstr += "<li>Waiting for " + player_names[0] + " to bid!</li>";
	}
	$('#status').html(wstr);
	player_cards = data.player_cards;
	for(var i = 0; i < player_cards.length; i++) {
        $('#p0c' + i).attr('src', '/images/cards/' + player_cards[i] + '.png');
        $('#p0c' + i).attr('data-card', player_cards[i]);
	}
	for(var i = 0; i < player_names.length; i++) {
        $('#playername' + i).html(player_names[i]);
	}
});

socket.on('player_bid', function(data) {
	if(data.player_id == player_id) {
		$('#status').append('<li>Waiting for you to bid!</li>');
		var bid_value = prompt('Enter your bid value: ');
		socket.emit('bid', {game_id: game_id, player_id: player_id, bid_value: bid_value});
		$('#status').append('<li>You bidded ' + bid_value + '!</li>');
		if(player_id != 3) {
			$('#status').append("<li>Waiting for " + player_names[player_id + 1] + " to bid!</li>");
		}
	}
});

socket.on('player_bid_value', function(data) {
	if(data.player_id != player_id) {
		$('#status').append("<li>" + player_names[data.player_id] + " bidded " + data.bid_value + "!</li>");
		if(data.player_id != 3) {
			$('#status').append("<li>Waiting for " + player_names[data.player_id + 1] + " to bid!</li>");
		}
	}
});

socket.on('bid_results', function(data) {
	$('#status').html('<li>Bidding Complete!</li>');
	$('#status').append('<li>' + player_names[data.winning_bid_player] + ' won the bid. Points required by team ' + data.winning_bid_team + ' to win: ' + data.winning_bid + '</li>');
	$('#status').append('<li>Waiting for ' + player_names[data.winning_bid_player] + ' to choose the trump</li>');
	if(data.winning_bid_player == player_id) {
		$('#status').append('<li>Click on a card to choose it as trump!</li>');
	}
});

socket.on('trump_chosen', function(data) {
    
});
