var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require( 'cookie-parser' );
var session = require( 'express-session' );
var url = require( 'url' );

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use( cookieParser( 'short.ly' ) );
app.use( session( { secret: 'short.ly' } ) );
app.use(express.static(__dirname + '/public'));


var restrict = function( request, response, next ) {
  if( request.session.user ) {
    next();
  } else {
    request.session.target = url.parse( request.url ).pathname;
    request.session.error = 'Please log in.';
    response.redirect( '/login' );
  }
};


app.get('/', restrict,
function(req, res) {
  res.render('index');
});

app.get('/create', restrict,
function(req, res) {
  res.render('index');
});

app.get('/links', restrict,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get( '/login', function( request, response ) {
  response.render( 'login' );
} );

app.post( '/login', function( request, response ){
  var username = request.body.username;
  var password = request.body.password;
  User.where( { username: username } ).fetch().then( function( user ) {
    // user is now the model object
    // or null if user was not found
    // if null,
    console.log( user );
    if( user === null ) {
      // redirect to signup -- the user does not exist
      response.redirect( '/signup' );
    // otherwise,
    } else {
      // check the password
      user.checkPassword( password ).then( function( same ) {

        // if the password is correct,
        if ( same ) {
          // save user to session
          request.session.regenerate( function() {
            request.session.user = user.get( 'username' );
            // redirect to home
            response.redirect( '/' ); 
          } );
        // otherwise,
        } else {
          // redirect to login 
          response.redirect( '/login' );
        }
          
      },
      function( err ) {
        throw new Error( 'Error checking password.' );
      } );
    }
  }, function( err ) {
    throw new Error( 'Error fetching user' );
  } ); 

} );

app.get( '/signup', function(request, response){
  response.render('signup');
});

app.post('/signup', function(request, response){
  var username = request.body.username;
  var password = request.body.password;
  User.where({username: username}).fetch().then( function(user){
    //if user already exists
    if (user) {
      //redirect to signup and give an error
      request.session.error = 'User already exists';
      response.redirect('/signup');
    //otherwise
    } else {
      //create a new user with username and password
      new User({
        'username': username,
        'password': password
      }).save().then(function(reply){
        //sign the user in and redirect to /index
        console.log('New user created ' + username);
        request.session.regenerate( function(){
          request.session.user = username;
          response.redirect('/');
        }, function(error){
          throw new Error(error + 'Problem creating new user');
        });
      });
    }
  });
});

app.get( '/logout', function(request, response){
  request.session.destroy(function(){
    response.redirect('/login');
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
