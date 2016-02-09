var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize: function() {
    this.savePassword(this.get('password')).then( function( encrypted ) {
    },
    function ( err ) {
      throw new Error( 'There was a problem creating a new model instance password' );
    } );
  },

  savePassword: function( password ) {
    var self = this;
    return new Promise( function( resolve, reject ) {
      bcrypt.genSalt( 8, function( err, salt ) {
        if ( err ) {
          reject( new Error('Problem generating salt') );
        } else {
          bcrypt.hash( password, salt, function() {}, function( err, encrypted ) {
            if ( err ) {
              reject( new Error('Problem hashing password'));
            } else {
              // save salt
              self.set( 'salt', salt );
              // save hashed
              self.set( 'password', encrypted );
              // resolve encrypted
              resolve( encrypted );
            }
          } );
        }
      } );
    } );
  },

  checkPassword: function( password ) {
    var salt = this.get('salt');
    var encrypted = this.get('password');
    return new Promise( function(resolve, reject) {
      if (!salt || !encrypted) {
        reject(new Error('Password does not exist'));
      } else {
        bcrypt.compare( password, encrypted, function(err, same) {
          if (err) {
            reject(err);
          } else {
            resolve(same);
          }
        });
      }
    });
  },

});

module.exports = User;
