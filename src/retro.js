// ngaro module
var ngaro = require('./ngaro.js');
// node modules
var fs = require('fs');
var path = require('path');

// start retro.js
if (require.main === module) {
    run();
}

function dump(){

    var dumpArray = convertArray(ngaro.ram.image);
    console.log(dumpArray.join("|"));
    dumpArray = convertArray(ngaro.address.data);
    console.log(dumpArray.join("|"));
    dumpArray = convertArray(ngaro.data.data);
    console.log(dumpArray.join("|"));
}

function convertArray(typedArray){

    var newArray = [];
    for(var i = 0; i < typedArray.length; i++){
        newArray.push(typedArray[i]);
    }
    return newArray;
}

function run(){

    var imageFile;
    var imageFileCheck;
    var dump_after = false;
    var num = 2;

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

    if(!imageFile) {
        imageFile = path.resolve(__dirname,'retro-11.5.img');
    }

    var fileInfo = fs.statSync(imageFile);
    var cells = Math.ceil(fileInfo.size/4);
    var imageArray = new Array();
    var fd = fs.openSync(imageFile,'r');

    if (!fd) {
        console.log('Unable to open file');
    } else {
        var bufsize = cells*4;
        var buffer = new Buffer(bufsize);
        fs.readSync(fd,buffer,0,bufsize,0);
        for (var i = 0; i < cells; i++) {
            imageArray[i] = buffer.readInt32LE(i*4);
        }
        fs.close(fd);
        ngaro.setImage(imageArray);
        ngaro.rxProcessImage();
    }

    if(!dump_after){
       //do other stuff
    } else {
       dump();
    }
}
