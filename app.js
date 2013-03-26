
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();
var nodemailer = require('nodemailer');
var MemoryStore = require('connect').session.MemoryStore;
var dbPath = 'mongodb://localhost/nodebackbone';

// Import the data layer
var mongoose = require('mongoose');
var config = {
    mail: require('./config/mail')
};

// Import the models
var models = {
    Account: require('./models/Account')(config, mongoose, nodemailer)
};

app.configure(function(){
  app.set('port', process.env.PORT || 8080);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: "SocialNet secret key",
    store: new MemoryStore()
  }));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
  mongoose.connect(dbPath, function onMongooseError(err){
    if (err) throw err;
  });
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

//app.get('/', routes.index);
//app.get('/users', user.list);

app.get('/', function(req, res){
    res.render("index.jade");
});

app.post('/login', function(req, res){
    console.log('login request');
    var email = req.param('email', null);
    var password = req.param('password', null);

    if ( null == email || email.length < 1
	 || null == password || password.length < 1) {
	res.send(400);
	return;
    }

    models.Account.login(email, password, function(success) {
	if( !success ) {
	    res.send(401);
	    return;
	}
	console.log('login was successful');
	erq.session.loggedIn = true;
	req.session.accountId = account._id;
	res.send(200);
    });
});

app.post('register', function(req, res){
    var firstName = req.param('firstName', '');
    var lastName = req.param('lastName', '');
    var email = req.param('email', null);
    var password = req.param('password', null);

    if ( null == email || null == password ) {
	res.send(400);
	return;
    }

    models.Account.register(email, password, firstName, lastName);
    res.send(200);
});

app.get('/account/authenticated', function(req, res){
    if ( req.session.loggedIn ){
	res.send(200);
    } else {
	res.send(401);
    }
});

//Getting the activity list
app.get('/accounts/:id/activity', function(req, res) {
    var accontId = req.params.id == 'me'
	? req.session.accountId
	: req.params.id;
    models.Account.findById(accountId, function(account) {
	res.send(account.activity);
    });
});

app.get('/accounts/:id/status', function(req, res){
    var accountId = req.params.id == 'me'
	? req.session.accountId
	: req.params.id;
    models.Account.findById(accountId, function(account) {
	res.send(account.status);
    });
});

app.post('/accounts/:id/status', function(req, res) {
    var accountId = req.params.id == 'me'
	? req.session.accountId
	: req.params.id;
    models.Account.findById(accountId, function(account) {
	status = {
	    name: account.name,
	    status: req.param('stauts', '')
	};
	account.status.push(status);

	// Push ther status to all friends
	account.activity.push(status);
	account.save(function (err) {
	    if (err) {
		console.log('Error saving account: ' + err);
	    }
	});
    });
    res.send(200);
});

app.get('/accounts/:id', function(req, res){
    var accountId = req.params.id == 'me'
	? req.session.accountId
	: req.params.id;
    Account.findOne({_id:accountId}, function(account){
	res.send(account);
    });
});

app.post('/forgotpassword', function(req, res){
    var hostname = req.headers.host;
    var resetPasswordUrl = 'http://' + hostname + '/resetPassword';
    var email = req.param('email', null);
    if ( null == email || email.length < 1) {
	res.send(400);
	return;
    }
    
    Account.forgotPassword(email, resetPasswordUrl, function(success){
	if (success) {
	    res.send(200);
	} else {
	    // Username or password not found
	    res.send(404);
	}
    });
});

app.get('/resetPassword', function(req, res){
    var accountId = req.param('account', null);
    res.render('resetPassword.jade', {locals:{accountId:accountId}});
});

app.post('/resetPassword', function(req, res){
    var accountId = req.param('accountId', null);
    var password = req.param('password', null);
    if ( null != accountId && null != password ) {
	Account.changePassword(accountId, password);
    }
    res.render('resetPasswordSuccess.jade');
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
