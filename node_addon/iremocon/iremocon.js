
var iRemocon = require('./build/Release/iremocon').iRemocon;
var ir = new iRemocon('192.168.0.2', 51013);

if (!ir.send(1)) {
	console.log("inncorect ip:port");
}


