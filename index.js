var
	_      = require('lodash'),
	assert = require('assert'),
	dgram  = require('dgram'),
	events = require('events'),
	net    = require('net'),
	stream = require('readable-stream'),
	url    = require('url'),
	util   = require('util')
;

var Emitter = module.exports = function Emitter(opts)
{
	assert(opts && _.isObject(opts), 'you must pass an options object to the Emitter constructor');
	assert((opts.host && opts.port) || opts.path || opts.uri, 'you must pass uri, path, or a host/port pair');
	assert(opts.node && _.isString(opts.node), 'you must pass a `node` option naming this host');

	events.EventEmitter.call(this);

	if (opts.uri) Emitter.parseURI(opts);

	this.options = opts;
	this.defaults = {};
	this.defaults.host = opts.node;
	this.defaults.tags = opts.tags; // optional
	this.backlog = [];
	this.output = new JSONOutputStream();

	this.connect();
};
util.inherits(Emitter, events.EventEmitter);

Emitter.prototype.defaults = null;
Emitter.prototype.backlog  = null;
Emitter.prototype.client   = null;
Emitter.prototype.ready    = false;
Emitter.prototype.retries  = 0;

Emitter.parseURI = function(options)
{
	var parsed = url.parse(options.uri);

	switch (parsed.protocol)
	{
		case 'udp:':
			options.udp = true;
			options.host = parsed.hostname;
			options.port = parsed.port;
			break;

		case 'sock:':
		case 'socket:':
			options.path = parsed.pathname;
			break;

		case 'tcp:':
			options.host = parsed.hostname;
			options.port = parsed.port;
			break;

		default:
			throw(new Error('unsupported destination uri: ' + options.uri));
	}

	delete options.uri;
	return options;
};

Emitter.prototype.connect = function connect()
{
	if (this.ready) return; // TODO might throw an error instead

	if (this.client)
	{
		this.client.removeAllListeners();
		this.output.unpipe();
		this.client = null;
	}

	if (this.options.udp)
	{
		this.client = new UDPStream(this.options);
	}
	else
	{
		this.client = net.connect(this.options);
	}

	this.output.pipe(this.client);
	this.client.on('connect', this.onConnect.bind(this));
	this.client.on('error', this.onError.bind(this));
	this.client.on('close', this.onClose.bind(this));
};

Emitter.prototype.destroy = function destroy()
{
	if (!this.client) return;
	this.output.unpipe();
	this.client.removeAllListeners();
	this.client.end();
	this.client = null;
};

Emitter.prototype.onConnect = function onConnect()
{
	while (this.backlog.length)
		this._write(this.backlog.shift());
	this.ready = true;
	this.emit('ready');
};

Emitter.prototype.onError = function onError(err)
{
	this.ready = false;
	this.emit('close');
	this.retries++;
	setTimeout(this.connect.bind(this), this.nextBackoff());
};

Emitter.prototype.onClose = function onClose()
{
	this.ready = false;
	this.emit('close');
	this.retries++;
	setTimeout(this.connect.bind(this), this.nextBackoff());
};

Emitter.prototype.nextBackoff = function nextBackoff()
{
	return Math.min((Math.random() + 1) * 10 * Math.pow(2, this.retries), 60000);
};

Emitter.prototype.makeEvent = function makeEvent(attrs)
{
	assert(attrs && _.isObject(attrs), 'you cannot make an empty event');
	assert(attrs.name, 'you must give your metric a name');

	var event = {};
	_.defaults(event, attrs, this.defaults);
	if (!event.time) event.time = Date.now(); // milliseconds!

	return event;
};

Emitter.prototype._write = function _write(event)
{
	this.output.write(JSON.stringify(event) + '\n');
};

Emitter.prototype.metric = function metric(attrs)
{
	var event = this.makeEvent(attrs);
	if (this.ready)
		this._write(event);
	else
		this.backlog.push(event);
};

function JSONOutputStream()
{
	stream.Transform.call(this);
	this._readableState.objectMode = false;
	this._writableState.objectMode = true;
}
util.inherits(JSONOutputStream, stream.Transform);

JSONOutputStream.prototype._transform = function _transformOut(object, encoding, callback)
{
	this.push(object);
	callback();
};

function UDPStream(opts)
{
	stream.Writable.call(this);
	this.socket = dgram.createSocket('udp4');
	this.host = opts.host;
	this.port = opts.port;

	process.nextTick(this.emit.bind(this, 'connect')); // because our socket sure won't!
}
util.inherits(UDPStream, stream.Writable);

UDPStream.prototype._write = function _write(event, encoding, callback)
{
	var payload = new Buffer(event);
	this.socket.send(payload, 0, payload.length, this.port, this.host, callback);
};
