console.log(process.argv);
// ngaro setup
var ngaro = require( './ngaro.js' );

// import functions from ngaro
//ngaro.setImage(); -will need to add this to ngaro
//ngaro.rxProcessImage();

// test for ngaro module
ngaro.hello();

// test divmod
rxDivMod(25,6);

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

    // test divmod
    console.log('r value= ' + r + ' q value= ' + q);

    return [r,q];
}

function getInputs(inputs){

    var a = 0;
    if (inputs[-1] != 0) {
    } 

    return a;
}

function process(memory,inputs){

}

function dump(stack,address,memory){
    console.log('dump info');
}

function run(){
    var ImagePath;
    var dump_after = false;

    var inputs = new Array();
    for (var i = 0; i < 12; i++) {
        inputs[i] = 0;
    }
    inputs.push(0);
   
    var num = 0;
    while (num < process.argv.length){
        var args = process.argv[num];
        if (process.argv[num] === '--dump'){
            dump();
        } else {
            console.log(process.argv[num]);
        }
        num++;
    }
    
}
