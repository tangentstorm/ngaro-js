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
    if (inputs[-1] != 0) {
    } 

    return a;
}

function processor(memory,inputs){

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

    if(!dump_after){
       //stuff
    } else {
       // need to pass arrays to dump
       dump();
    }
}
