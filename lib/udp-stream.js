var
	dgram  = require('dgram'),
	stream = require('readable-stream'),
	util   = require('util')
;

var UDPStream = module.exports = function UDPStream(opts)
{
	stream.Writable.call(this);
	this.socket = dgram.createSocket('udp4');
	this.host = opts.host;
	this.port = opts.port;

	process.nextTick(this.emit.bind(this, 'connect')); // because our socket sure won't!
};
util.inherits(UDPStream, stream.Writable);

UDPStream.prototype._write = function _write(event, encoding, callback)
{
	var payload = new Buffer(event);
	this.socket.send(payload, 0, payload.length, this.port, this.host, callback);
};
