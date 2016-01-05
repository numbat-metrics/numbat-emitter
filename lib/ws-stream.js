var
	WebSocket = require('ws'),
	stream    = require('readable-stream'),
	util      = require('util')
	;

var WSStream = module.exports = function WSStream(opts)
{
	var self = this;

	stream.Writable.call(this);
	this.socket = new WebSocket('ws://' + opts.host + ':' + opts.port + '/numbat-socket');
	this.host = opts.host;
	this.port = opts.port;

	this.socket.on('open', function open() {
		self.emit.call(self, 'connect');
	});

	this.socket.on('close', function () {
		self.emit.call(self, 'close', null);
	});

	this.socket.on('error', function (error) {
		// ws does emit an error when a connecton fails to be established.
		// the reconnect function in the emitter expect a close event
		// on feiled connection to reconnet. due to this we emit a close.
		self.emit.call(self, 'close', error);
	});
};
util.inherits(WSStream, stream.Writable);

WSStream.prototype._write = function _write(event, encoding, callback)
{
	this.socket.send(new Buffer(event), {binary: true, mask: true}, callback);
};
