var ejs = require('ejs'),
	express = require('express');
	
var Trump = require('./Trump').Trump;

var RedisStore = require('connect-redis')(express);

var app = module.exports = express.createServer();

var io = require('socket.io').listen(app);

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: 'ihas1337code', store: new RedisStore }));

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.set('view options', {layout: false});
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

var trump = new Trump('localhost', 27017);

// Routes

app.get('/create', function(req, res) {
	res.render('create');
});

app.post('/create', function(req, res) {
	trump.createGame(req.body.player_name, function(game_id) {
		req.session.player_name = req.body.player_name;
		req.session.player_id = 0;
        console.log('*****' + req.session.player_name);
        console.log('*****' + req.session.player_id);
		res.redirect('/game/' + game_id);
	});
});

app.get('/join/:id', function(req, res) {
	res.render('join', {locals: {game_id: req.params.id, target: '/join/' + req.params.id}});
});

app.post('/join/:id', function(req, res) {
	trump.addPlayerToGame(req.params.id, req.body.player_name, function(game) {
		var idx = trump.findIndexByName(game, req.body.player_name);
		trump.pushPlayerDetails(game);
		req.session.player_name = req.body.player_name;
		req.session.player_id = idx;
		res.redirect('/game/' + req.params.id);
	});
});

app.get('/game/:id', function(req, res) {
    console.log('#####' + req.session.player_name);
    console.log('#####' + req.session.player_id);
	res.render('game', { locals: {game_id: req.params.id, player_name: req.session.player_name, player_id: req.session.player_id} });
});

io.sockets.on('connection', function (socket) {
	socket.on('handshake', function(data) {
		console.log(data);
		trump.addSocket(data.game_id, socket, function() {
			socket.set('game_id', data.game_id, function () {
				socket.set('player_name', data.player_name, function() {
					trump.pushPlayerDetailsToId(data.game_id, data.player_id);
					trump.tryGameStart(data.game_id);
				});
			});
		});
	});
	socket.on('bid', function(data) {
		trump.addBid(data.game_id, data.player_id, data.bid_value);
	});
    socket.on('trump_card', function(data) {
        trump.chooseTrump(data.game_id, data.player_id, data.trump_card);
    });
});

app.listen(process.env.PORT || 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
