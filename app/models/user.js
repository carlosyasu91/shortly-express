var db = require('../config');
var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;
var Promise = require('bluebird');
var credentials = require('../credentials').credentials;

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,


});

passport.use(new GithubStrategy({
  clientID : credentials.GITHUB_CLIENT_ID,
  clientSecret: credentials.GITHUB_CLIENT_SECRET,
  callbackURL: 'http://127.0.0.1:4568/auth/github/callback'
}, 
function(accessToken, refreshToken, profile, done){
  User.where({oauthID: profile.id}).fetch().then( function(user) { // resolve
    if( user !== null) {
      done(null, user);
    } else {
      user = new User({
        oauthID: profile.id,
        name: profile.displayName
      });
      user.save().then( function() { // resolve
        console.log('Saving user ...');
        done(null, user);
      },
      function( err ) { // reject
        throw new Error( err );
      });
    }
  }, function( err ) { // reject
    throw new Error( err );
  });
}));

module.exports = User;
