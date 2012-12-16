// ngaro module setup
var ngaro = require('./ngaro.js');
// node modules
var fs = require('fs');
var path = require('path');

//ngaro.setImage(); -will need to add this to ngaro
//ngaro.rxProcessImage();

// start retro.js
run();

function rxDivMod(a,b){

    var x = Math.abs(a);
    var y = Math.abs(b);
    var q = Math.floor(y/x);
    var r = y % x;

    if(a < 0 && b < 0){
        r = r * -1;
    } else if (a > 0 && b < 0){
        q = q * -1;
    } else if (a < 0 && b > 0){
        q = q * -1;
        r = r * -1;
    }

    return [r,q];
}

function getInputs(inputs){
    
    var a = 0;
    if(inputs[-1] != 0){
    } 

    return a;
}

function processor(memory,inputs){

    // set variables
    var ip = 0;
    var EXIT = memory.length;
    var stack = new Array(128);
    var address = new Array(1024);
    var ports = new Array(12);
    var files = new Array(8);
    
    while(ip < EXIT){
        var opcode = memory[ip];
        
        if(opcode > 30){
            //handle opcodes over 30
        } else {
            if(opcode === 0){ 
                //nop
            } else if (opcode === 1){
                //lit
                ip += 1;
                stack.append(memory[ip]);
            } else if (opcode === 2){
                //dup
                stack.append(stack[-1]);
            }
        }
    }
}

function dump(stack,address,memory){

    console.log('dump info');
}

function run(){

    var imageFile;
    var imageFileCheck;
    var dump_after = false;

    var list = new Array();

    var num = 2;
    while (num < process.argv.length){
        var args = process.argv[num];
        if (args === '--with') {
            num++;
            //list.append( //file ); 
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
    console.log(fileInfo.size);
    var cells = Math.ceil(fileInfo.size/4);
    console.log(cells);

    var memory = new Array();
    var fd = fs.openSync(imageFile,'r');
    if (!fd) {
        console.log('Unable to open file');
    } else {
        var bufsize = cells*4;
        var buffer = new Buffer(bufsize);
        fs.readSync(fd,buffer,0,bufsize,0);
        for (var i = 0; i < cells; i++) {
            memory[i] = buffer.readInt32LE(i*4);
        }
        fs.close(fd);
    }

    if(!dump_after){
       //stuff
    } else {
       // need to pass arrays to dump
       dump();
    }
}
