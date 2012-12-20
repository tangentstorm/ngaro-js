var
  fs = require('fs'),
  path = require('path'),
  ngaro = require('./ngaro.js');


/**
 * join a typed array with spaces
 */
function join(a) {
  var chars = [ ];
  for(var i = 0; i < a.length; i++) {
    chars.push(a[i]);
  }
  return chars.join(' ');
}

function chr(n) {
  return String.fromCharCode(n);
}


/**
 * dump the virtual machine state, for ngarotest.py
 */
function dump() {
  console.log([
    chr(28),
    join(ngaro.data.data.slice(1, ngaro.data.sp + 1 )),
    chr(29),
    join(ngaro.address.data.slice(1, ngaro.address.sp + 1 )),
    chr(29),
    join(ngaro.ram.image)
  ].join(''));
}

function run(){

    var imageFile;
    var imageFileCheck;
    var dump_after = false;
    var num = 2;

    // parse args
    while (num < process.argv.length){
        var args = process.argv[num];
        if (args === '--with') {
            //needs implementation
        } else if (args === '--dump'){
            dump_after = true;
        } else if (args === '--image'){
            num++;
            args = process.argv[num];
            imageFileCheck = fs.existsSync(args,function(exists){});
            if(imageFileCheck){
                imageFile = args;
            } else {
                console.log('File not found');
                process.exit(2);
            }
        }
        num++;
    }

    // default image
    if(!imageFile) {
        imageFile = path.resolve(__dirname,'retro-11.5.img');
    }


    // load the specified image
    var fileInfo = fs.statSync(imageFile);
    var cells = Math.ceil(fileInfo.size/4);
    var fd = fs.openSync(imageFile,'r');
    var ok = false;
    var imageArray;


    if (!fd) {
        console.log('Unable to open file');
    } else {
        var bufsize = cells*4;
        var buffer = new Buffer(bufsize);
        fs.readSync(fd,buffer,0,bufsize,0);

	imageArray = new Int32Array(cells);
        for (var i = 0; i < cells; i++) {
            imageArray[i] = buffer.readInt32LE(i*4);
        }
        fs.close(fd);
	ok = true;
    }


    if ( ok ) {
        ngaro.setImage(imageArray);
        ngaro.rxPrepareVM();
        ngaro.rxProcessImage();
        if(dump_after) {
           dump(cells);
        }
    }
}



// start retro.js
if (require.main === module) {
  run();
}
