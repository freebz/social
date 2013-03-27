
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
//var ObjectId = require('mongodb').ObjectID;
//var ObjectId = mongoose.Types.ObjectId;

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

    models.Account.login(email, password, function(account) {
	if( !account ) {
	    res.send(401);
	    return;
	}
	console.log('login was successful');
	req.session.loggedIn = true;
	req.session.accountId = account._id;
	res.send(200);
    });
});

app.post('/register', function(req, res){
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

app.get('/account/:id/contacts', function(req, res) {
    var accountId = req.params.id == 'me'
	? req.session.accountId
	: req.params.id;
    models.Account.findById(accountId, function(account) {
	res.send(account.contacts);
    });
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

	console.log(account);
	console.log(account.name);

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

app.get('/accounts/:id/contacts', function(req, res) {
    var accountId = req.params.id == 'me'
	? req.session.accountId
	: req.params.id;
    models.Account.findById(accountId, function(account) {
	res.send(account.contacts);
    });
});

app.post('/accounts/:id/contact', function(req, rs) {
    var accountId = req.params.id == 'me'
	? req.session.accountId
	: req.params.id;
    var contactId = req.param('contactId', null);

    if ( null == contactId ) {
	res.send(400);
	return;
    }

    models.Account.findById(accountId, function(account) {
	if ( account ) {
	    models.Account.findById(contactId, function(contact) {
		models.Account.addContact(account, contact);

		models.Account.addContact(contact, account);
		account.save();
	    });
	}
    });

    res.send(200);
});

app.delete('/accounts/:id/contact', function(req, res) {
    var accountId = req.params.id == 'me'
	? req.session.accountId
	: req.params.id;
    var contactId = req.param('contactId', null);

    if ( null == contactId ) {
	res.send(400);
	return;
    }

    models.Account.findById(accountId, function(account) {
	if ( !account ) return;
	models.Account.findById(contactId, function(contact, err) {
	    if ( !contact ) return;

	    models.Account.removeContact(account, contactId);
	    models.Account.removeContact(contact, accountId);
	});
    });

    res.send(200);
});

app.get('/accounts/:id', function(req, res){
    var accountId = req.params.id == 'me'
	? req.session.accountId
	: req.params.id;
    models.Account.findById(accountId, function(account){
	if ( accountId == 'me'
	     || models.Account.hasContact(account, req.session.accountId) ) {
	    account.isFriend = true;
	}
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

app.post('/contacts/find', function(req, res) {
    var searchStr = req.param('searchStr', null);
    if ( null == searchStr ) {
	res.send(400);
	return;
    }

    models.Account.findByString(searchStr, function onSearchDone(err, accounts) {
	if (err || accounts.length == 0) {
	    res.send(404);
	} else {
	    res.send(accounts);
	}
    });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
