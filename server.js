// a simple web server for retro.js
//
// retro will run directly from the file system. this
// file merely provides remote access over http if
// you don't have another webserver set up
//
// setup:             ( requires node from http://nodejs.org/ )
//
//    npm install     # install dependencies from package.json
//
// usage:
//
//    node server.js  # run this file
//
var connect = require( 'connect' );


var app = connect()
  .use(connect.directory( 'src' ))
  .use(connect.static( 'src' ))
  .listen( 8080 );
