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
var path = __dirname + '/src';
var port = 8080;

connect.createServer(connect.static(path)).listen(port,function(){
    console.log('Running server at http://localhost:'
                + port + '/index.html')
    console.log('Press Ctl-C to stop the server')
});
