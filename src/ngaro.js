/**********************************************************************
 * Ngaro Virtual Machine
 * Copyright (C) 2008 - 2011, Charles Childers
 * Copyright (C) 2012       , Michal J Wallace
 **********************************************************************/
var WEB_CONTEXT = typeof document != "undefined";


/**********************************************************************
 * Some constants useful to us for dealing with the VM settings.
 **********************************************************************/
  var IMAGE_SIZE    = 1000000;        /* Amount of simulated RAM    */
  var DATA_DEPTH    =     128;        /* Depth of data stack        */
  var ADDRESS_DEPTH =    1000;        /* Depth of call stack        */
  var TERM_WIDTH    =      79;        /* Width of virtual terminal  */
  var TERM_HEIGHT   =      18;        /* Height of virtual terminal */
  var FB_WIDTH      =     640;        /* Canvas Width               */
  var FB_HEIGHT     =     480;        /* Canvas Height              */
  var FB_EXISTS     =      -1;        /* Is Canvas Present?         */


/**********************************************************************
 * Stack object. Provides an easy way to create and work with LIFO
 * stacks.
 **********************************************************************/
function Stack(size)
{
  this.sp    = 0;
  this.data  = new Int32Array(size);
  this.push  = function(n) { this.sp++; this.data[this.sp] = n; }
  this.pop   = function()  { return this.data[this.sp--]; }
  this.depth = function()  { return this.sp; }
  this.tos   = function()  { return this.data[this.sp]; }
  this.nos   = function()  { return this.data[this.sp - 1]; }
  this.dup   = function()  { this.push(this.tos()); }
  this.drop  = function()  { this.sp--; }
  this.swap  = function()  { var a = this.nos();
			     this.data[this.sp - 1] = this.tos();
			     this.data[this.sp] = a;
			   }
  this.inc   = function()  { this.data[this.sp]++; }
  this.dec   = function()  { this.data[this.sp]--; }
  this.reset = function()  { this.sp = 0; }

  this.dump = function() {
    var res = [ '[' ];
    for( var i = 0; i <= this.sp; i++ ) res.push( this.data[ i ]);
    res.push( '] ');
    return res.join( ' ' );
  }
}


/**********************************************************************
 * Symbolic constants for each instruction.
 **********************************************************************/
function Opcodes()
{
  this.NOP = 0;       this.LIT = 1;         this.DUP = 2;
  this.DROP = 3;      this.SWAP = 4;        this.PUSH = 5;
  this.POP = 6;       this.LOOP = 7;        this.JUMP = 8;
  this.RETURN = 9;    this.GT_JUMP = 10;    this.LT_JUMP = 11;
  this.NE_JUMP = 12;  this.EQ_JUMP = 13;    this.FETCH = 14;
  this.STORE = 15;    this.ADD = 16;        this.SUB = 17;
  this.MUL = 18;      this.DIVMOD = 19;     this.AND = 20;
  this.OR = 21;       this.XOR = 22;        this.SHL = 23;
  this.SHR = 24;      this.ZERO_EXIT = 25;  this.INC = 26;
  this.DEC = 27;      this.IN = 28;         this.OUT = 29;
  this.WAIT = 30;
}



/**********************************************************************
 * Internal registers, flags, and variables
 **********************************************************************/
var ip = 0;
var data    = new Stack(DATA_DEPTH);
var address = new Stack(ADDRESS_DEPTH);
var ports   = new Int32Array(64);
var portHandlers = new Array(64); // array of functions
var ram = { image : new Int32Array( IMAGE_SIZE ) };
var vm = new Opcodes();



// start with no hardware attached.
// ( devices are filled in below )
//  TODO: move this loop to rxPrepareVM
var doNothingHandler = function () { }
for ( var i = 0; i < 64; ++i )
{
  portHandlers[ i ] = doNothingHandler;
}



/**********************************************************************
 * Control (and fine tuning) of the VM Processing
 *
 * Specifically, these routines will use form elements to alter the
 * number of instructions processed per cycle.
 *
 * This implementation has a timer, by default called every 75 ms. If
 * the prior run has not completed, it exits. Otherwise, it processes
 * a specific number of instructions (5000 by default) and then returns.
 *
 * A variable 'frequency' is used to set the number of times each second
 * that the processor runs. A second variable 'cycles' controls the
 * number of instructions processed per cycle.
 *
 * You can start or suspend execution with rxStartVM() and rxStopVM().
 * The state can be toggled via rxToggleVM().
**********************************************************************/
var interval;
var frequency;
var RUNNING = false;
var WAITING = false; // awaiting keyboard input
//  TODO : this is a delay, not a frequency
var DEFAULT_FREQUENCY = 25;
var DEFAULT_CYCLES = 50000;
var cycles = DEFAULT_CYCLES;

function rxStartVM()
{
  interval = setInterval("rxProcessImage()", frequency);
  run = 1;
  tib += "  ";
}

function rxStopVM()
{
  clearInterval(interval);
  interval = null;
  run = 0;
}

function rxToggleVM()
{
  if (run == 0)
  {
    rxStartVM();
    if ( WEB_CONTEXT )
      document.getElementById("vmtoggle").value = "pause vm";
  }
  else
  {
    rxStopVM();
    if ( WEB_CONTEXT )
      document.getElementById("vmtoggle").value = "resume vm";
  }
}

if ( WEB_CONTEXT )
{
  function rxSetInterval()
  {
    rxStopVM();
    frequency = document.getElementById('frequency').value;
    try
    {
      localStorage.setItem("rxFrequency", frequency);
    }
    catch (e)
    {
      alert("Sorry, but we couldn't save the frequency settings for later use.");
    }
    rxStartVM();
  }

  function rxSetCyclesPerInterval()
  {
    rxStopVM();
    cycles = document.getElementById('cycles').value;
    try
    {
      localStorage.setItem("rxCycles", cycles);
    }
    catch (e)
    {
      alert("Sorry, but we couldn't save the cycle settings for later   use.");
    }
    rxStartVM();
  }
}

function rxPrepareVM()
{
  ip  = 0;
  ports[0] = 0;
  width = 0;
  var i = 0;
  while (i < 64)
  {
    ports[i] = 0;
    i++;
  }
  data.reset();
  address.reset();

  frequency = localStorage.getItem("rxFrequency") || DEFAULT_FREQUENCY;
  cycles = localStorage.getItem("rxCycles") || DEFAULT_CYCLES;

  if ( WEB_CONTEXT )
  {
    document.getElementById("frequency").value = frequency;
    document.getElementById("cycles").value = cycles;
  }
}



/**********************************************************************
 * Keyboard Handling
 *
 * We have two approaches to handling the keyboard. The default is to
 * store a string containing input read from a text box, and extract
 * the characters from this. This is the "buffered" input model. The
 * alternate (and original method) uses a custom keyboard handler to
 * catch keystrokes and stores the most recent one in a variable.
 *
 * There are merits to both approaches. We use the buffered model as
 * the default as it works on more devices (tablets and phones without
 * a physical keyboard won't work with the non-buffered input).
 **********************************************************************/
var inputMethod = 1;
var kbdQueue = []; // queue for direct input
var tib = "";

// this is the javascript event handler for the direct method
function rxReadKeyboard(e, special)
{
  var code = e.keyCode ? e.keyCode : e.charCode;
  if (special) code -= 64;
  e.preventDefault(); // all keys go to the terminal
  if (WAITING) {
      ports[1] = code;
      WAITING = false;
  } else kbdQueue.push(code);
  return false;
}

// this is the port handler for the direct method
function kbdDirectMethod()
{
  if (kbdQueue.length > 0) ports[1] = kbdQueue.shift();
  else WAITING = true;
}

// this version uses an html form
function kbdWidgetMethod()
{
  var res = tib.charCodeAt( 0 );
  tib = tib.substr(1, tib.length - 1);
  return res;
}

// set up the keyboard handler
portHandlers[ 1 ] = kbdWidgetMethod;

function rxToggleInputMethod()
{
  if ( inputMethod == 0 )
  {
    document.onkeypress = document.onkeydown = document.onkeyup = null;
    inputMethod = 1;
    portHandlers[ 1 ] = kbdWidgetMethod;
  }
  else
  {
    document.onkeypress = rxReadKeyboard;
    document.onkeyup = function (e) {
	e.preventDefault();
	return false;
    }
    document.onkeydown = function (e) {
	// 17 == control key
	if (e.ctrlKey && e.keyCode !== 17) {
	    rxReadKeyboard(e, true);
	    return false;
	}
    }
    inputMethod = 0;
    portHandlers[ 1 ] = kbdDirectMethod;
  }
}

function rxProcessInput()
{
  tib = tib + document.getElementById('tib').value + "  ";
  document.getElementById('tib').value = "";
}





/**********************************************************************
 * Image Management
 *
 * Functions for loading a saved image, saving the image, and restoring
 * to a clean image are here.
 **********************************************************************/
function rxHTTPLoadImage( url )
{
  WAITING = true;
  var xhr = new XMLHttpRequest();
  xhr.open( "GET", url, true );
  xhr.responseType = "arraybuffer";
  xhr.onload = function ( e )
  {
    var raw = xhr.response;
    if ( raw )
    {
      var ints = new Int32Array( raw );
      ram.image.set( ints );
      WAITING = false;
    }
  }
  xhr.send( null );
}

// this is just the java string hashing algorithm applied to arrays
function hashCode(ints)
{
      var hash = 0;
      for (var i = 0; i < ints.length; i++)
      {
	  if (isNaN( ints[ i ])) {
	     console.log("found NaN at position: " + i + ". exiting loop." );
	     break;
	  }
	  hash = ((hash<<5)-hash)+ints[ i ];
      }
      return hash.toString( 16 );
}

function hashes()
{
  console.log(
    "m: ", hashCode( ram.image ), "  ",
    "d: ", hashCode( data.data ), "  ",
    "a: ", hashCode( address.data ), "  " );
  // console.log( ports );
}


function rxLoadImage()
{
  rxClearCanvas();
  rxStopVM();
  ip = 0;
  tib = "";
  try
  {
    ram.image.set( localStorage['retroImage'].split(';').map( parseInt ));
  }
  catch (e)
  {
    alert("Sorry, but we couldn't find a saved image.");
  }
  data.reset();
  address.reset();
  rxStartVM();
}

function rxSaveImage()
{
  rxStopVM();
  try
  {
    localStorage.setItem("retroImage", ram.image.join(";"));
  }
  catch (e)
  {
    alert("Sorry, but we couldn't save your image.");
  }
  rxStartVM();
}

function rxLoadCleanImage( url )
{
  rxClearCanvas();
  rxStopVM();
  rxHTTPLoadImage( url );
  ip = 0;
  tib = "";
  data.reset();
  address.reset();
  rxStartVM();
}

function rxClearCanvas()
{
    ngterm.cls();
}


function setImage(newImage){
    ram.image = newImage;
}

/**********************************************************************
 * Simulated Device Handlers
 *
 * We have a function for each I/O port, and a generalized dispatch
 * loop.
 *
 * Due to technical constraints, the keyboard input is handled by the
 * dispatch loop, and port 3 for display updating is handled by the
 * rxProcessImage() function.
 *
 * See "The Ngaro Language" for a description of each port.
 *
 * Canvas and Mouse devices are handled via a handler in canvas.js
 * currently.
 **********************************************************************/

// portHandler[ 2 ] is down by handler 8, since they're both part
// of the enhanced text terminal

portHandlers[4] = function()
{
  rxSaveImage();
  return 0;
}

portHandlers[5] = function()
{
  switch ( ports[ 5 ])
  {
    case -1 : ports[5] = IMAGE_SIZE; break;
    case -2 : ports[5] = FB_EXISTS; break;
    case -3 : ports[5] = FB_WIDTH; break;
    case -4 : ports[5] = FB_HEIGHT; break;
    case -5 : ports[5] = data.depth(); break;
    case -6 : ports[5] = address.depth(); break;
    case -7 : ports[5] = -1; break;
    case -8 :
    {
      var foo = new Date;
      var unixtime_ms = foo.getTime();
      var unixtime = parseInt(unixtime_ms / 1000);
      ports[5] = unixtime;
    }; break;
    case -9  : ports[5] = 0; break;
    case -11 : ports[5] = TERM_WIDTH; break;
    case -12 : ports[5] = TERM_HEIGHT; break;

    //case -15 : ports[5] = 1; break;
  }
  return ports[ 5 ];
}


function handleDevices()
{
  ports[ 0 ] = 1;
  for ( var i = 1;  i < 64 && ports[ i ] == 0; i++ ) { }
  if ( i < 64 ) {
    ports[ i ] = portHandlers[ i ]( ) || 0;
  }
}


/**********************************************************************
 * The Opcode Processor
 *
 * This is the heart of Ngaro. It handles carrying out the operations of
 * each of the instructions.
 *
 * See "The Ngaro Virtual Machine" for details on the behavior of each
 * instruction.
 **********************************************************************/
var TRACE = false;
var log = []
function traceback( msg ) {
   if ( TRACE ) log.push( msg + " | ip: " + ip + " | addr: " + address.dump( ));
}
function processOpcode()
{
  if ( ip >= ram.image.length ) {  return; }
  var op = ram.image[ip];

  if (op > vm.WAIT)
  {
    address.push(ip);
    ip = op - 1;
    if (ram.image[ip + 1] == 0) ip++;
    if (ram.image[ip + 1] == 0) ip++;
    traceback('entered');
  }
  else switch( op )
  {
    case vm.NOP :
    break;

    case vm.LIT :
      ip++;
      data.push(ram.image[ip]);
    break;

    case vm.DUP :
      data.dup();
    break;

    case vm.DROP :
      data.drop();
    break;

    case vm.SWAP :
      data.swap();
    break;

    case vm.PUSH :
      address.push(data.pop());
    break;

    case vm.POP :
      data.push(address.pop())
    break;

    case vm.LOOP :
      data.dec();
      if (data.tos() != 0)
      {
	ip++;
	ip = ram.image[ip] - 1;
      }
      else
      {
	ip++;
	data.drop();
      }
    break;

    case vm.JUMP :
      ip++;
      ip = ram.image[ip] - 1;
      if (ram.image[ip + 1] == 0) ip++;
      if (ram.image[ip + 1] == 0) ip++;
    break;

    case vm.RETURN :
      ip = address.pop();
      if (ram.image[ip + 1] == 0) ip++;
      if (ram.image[ip + 1] == 0) ip++;
      traceback('returned');
    break;

    case vm.GT_JUMP :
      ip++;
      if (data.nos() > data.tos())
	ip = ram.image[ip] - 1;
      data.drop();
      data.drop();
    break;

    case vm.LT_JUMP :
      ip++;
      if (data.nos() < data.tos())
	ip = ram.image[ip] - 1;
      data.drop();
      data.drop();
    break;

    case vm.NE_JUMP :
      ip++;
      if (data.nos() != data.tos())
	ip = ram.image[ip] - 1;
      data.drop();
      data.drop();
    break;

    case vm.EQ_JUMP :
      ip++;
      if (data.nos() == data.tos())
	ip = ram.image[ip] - 1;
      data.drop();
      data.drop();
    break;

    case vm.FETCH :
      var x = data.pop();
      data.push(ram.image[x]);
    break;

    case vm.STORE :
      ram.image[data.tos()] = data.nos();
      data.drop();
      data.drop();
    break;

    case vm.ADD :
      var x = data.pop();
      var y = data.pop();
      data.push(x + y);
    break;

    case vm.SUB :
      var x = data.pop();
      var y = data.pop();
      data.push(y - x);
    break;

    case vm.MUL :
      var x = data.pop();
      var y = data.pop();
      data.push(y * x);
    break;

    case vm.DIVMOD :
      var b = data.pop();
      var a = data.pop();
      if (b == 0)
      {
	ip = 0;
	data.sp = 0;
	address.sp = 0;
      }
      else
      {
	var x = Math.abs(b);
	var y = Math.abs(a);
	var q = Math.floor(y / x);
	var r = y % x;
	if (a < 0 && b < 0)
	  r = r * -1;
	if (a > 0 && b < 0)
	  q = q * -1;
	if (a < 0 && b > 0)
	{
	  r = r * -1;
	  q = q * -1;
	}
	data.push(r);
	data.push(q);
      }
    break;

    case vm.AND :
      var x = data.pop();
      var y = data.pop();
      data.push(x & y);
    break;

    case vm.OR :
      var x = data.pop();
      var y = data.pop();
      data.push(x | y);
    break;

    case vm.XOR :
      var x = data.pop();
      var y = data.pop();
      data.push(x ^ y);
    break;

    case vm.SHL :
      var x = data.pop();
      var y = data.pop();
      data.push(y << x);
    break;

    case vm.SHR :
      var x = data.pop();
      var y = data.pop();
      data.push(y >>= x);
    break;

    case vm.ZERO_EXIT :
      if (data.tos() == 0)
      {
	data.drop();
	ip = address.pop();
      }
    break;

    case vm.INC :
      data.inc();
    break;

    case vm.DEC :
      data.dec();
    break;

    case vm.IN :
      var x = data.pop();
      data.push(ports[x]);
      ports[x] = 0;
    break;

    case vm.OUT :
      var x = data.pop();
      var y = data.pop();
      ports[x] = y;
    break;

    case vm.WAIT :
      handleDevices();
    break;

    default :
       console.log( "unrecognized opcode: " + op );
       debugger; // would only happen on negative numbers...
    break;
  }
  ip++;
  checkStack();
}

function checkStack()
{
  var depth  = data.depth();
  var adepth = address.depth();
  var flag = 0;
  if (depth < 0 || adepth < 0)
  {
    flag = -1;
  }
  if (depth > DATA_DEPTH || adepth > DATA_DEPTH)
  {
    flag = -1;
  }

  if (flag == -1)
  {
    ip = 0;
    data.sp = 0;
    address.sp = 0;
  }
}

function rxProcessImage()
{
  if (WAITING || RUNNING)
    return;

  RUNNING = true;
  for (var a = cycles; a > 0 && (! WAITING ); a--)
    processOpcode();
  RUNNING = false;
}



/**********************************************************************
 * Mouse / Touch Support
 **********************************************************************/
if ( typeof document != "undefined" )
{
  var mx, my, mb;

  document.onmousedown = function (e)
  {
    mb = 1;
    return true;
  };

  document.onmousemove = function (e)
  {
    if (e.offsetX)
    {
      mx = e.offsetX;
      my = e.offsetY;
    }
    else if (e.layerX)
    {
      mx = e.layerX;
      my = e.layerY;
    }
    return true;
  }

  document.onmouseup = function (e)
  {
    mb = 0;
    return true;
  }

  // touchscreen / tablet support:
  document.touchstart = document.onmousedown;
  document.touchend = document.onmouseup;

  // mouse handler port
  portHandlers[7] = function()
  {
    if (ports[7] == 1)
    {
      data.push(mx);
      data.push(my);
      ports[7] = 0;
    }
    if (ports[7] == 2)
    {
      data.push(mb);
      ports[7] = 0;
    }
  }

}



portHandlers[6] = function()
{
  switch (ports[6])
  {
    case 1:
      rxCanvasSetColor(data.pop());
      break;
    case 2:
      var x, y;
      y = data.pop();
      x = data.pop();
      fb.fillRect(x, y, 2, 2);
      break;
    case 3:
      var x, y, h, w;
      w = data.pop();
      h = data.pop();
      y = data.pop();
      x = data.pop();
      fb.strokeRect(x, y, w, h);
      break;
    case 4:
      var x, y, h, w;
      w = data.pop();
      h = data.pop();
      y = data.pop();
      x = data.pop();
      fb.fillRect(x, y, w, h);
      break;
    case 5:
      var x, y, h;
      h = data.pop();
      y = data.pop();
      x = data.pop();
      fb.fillRect(x, y, 2, h);
      break;
    case 6:
      var x, y, w;
      w = data.pop();
      y = data.pop();
      x = data.pop();
      fb.fillRect(x, y, w, 2);
      break;
    case 7:
      var x, y, w;
      w = data.pop();
      y = data.pop();
      x = data.pop();
      fb.beginPath();
      fb.arc(x, y, w, 0, Math.PI*2, true);
      fb.closePath();
      fb.stroke();
      break;
    case 8:
      var x, y, w;
      w = data.pop();
      y = data.pop();
      x = data.pop();
      fb.beginPath();
      fb.arc(x, y, w, 0, Math.PI*2, true);
      fb.closePath();
      fb.fill();
      break;
    default:
      // do nothing
  }
  return 0;
}



// enhanced text device : ngterm.js

if ( WEB_CONTEXT )
{
  ngterm = new Term( new Canvas( 80 * FONT_WIDTH, 30 * FONT_HEIGHT ), VGAFont );

  // normal output device:
  portHandlers[2] = function()
  {
    ngterm.emit( data.pop() );
    return 0;
  }

  // enhanced text:
  portHandlers[ 8 ] = function( )
  {
    switch ( ports[ 8 ])
    {
	case 1 : ngterm.xy( data.pop(), data.pop() ); break;
	case 2 : ngterm.fg( data.pop() ); break;
	case 3 : ngterm.bg( data.pop() ); break;
	default: // ignore
    }
    return 0;
  }
}



/**********************************************************************
 * Save and/or Run A Project
 **********************************************************************/

if ( WEB_CONTEXT )
{
  function rxSaveProject()
  {
    var project = "rx_project";
    try
    {
      localStorage.setItem(project, document.getElementById('project').value);
    }
    catch (e)
    {
      alert("Sorry, but we couldn't save your project.");
    }
  }

  function rxLoadSavedProject()
  {
    var project = "rx_project";
    if (localStorage.getItem(project) === null)
    {
      document.getElementById('project').value = "";
    }
    else
    {
      document.getElementById('project').value = localStorage[project];
    }
  }

  function rxRunProject()
  {
    tib += document.getElementById('project').value + "  ";
  }

  function rxNewProject()
  {
    document.getElementById('project').value = "";
  }
}


/**********************************************************************
 * Misc. Other Routines
 **********************************************************************/

if ( WEB_CONTEXT )
{
  function toggleVisibilityOf(id)
  {
    var e = document.getElementById(id);
    if (e.style.display == 'block')
      e.style.display = 'none';
    else
      e.style.display = 'block';
  }
}

/* Exported modules */
if (typeof exports != 'undefined')
{
  exports.ram = ram;
  exports.address = address;
  exports.data = data;
  exports.setImage = setImage;
  exports.rxProcessImage = rxProcessImage;
  exports.rxPrepareVM = rxPrepareVM;
}
