var
	_         = require('lodash'),
	assert    = require('assert'),
	events    = require('events'),
	net       = require('net'),
	os        = require('os'),
	stream    = require('readable-stream'),
	UDPStream = require('./udp-stream'),
	url       = require('url'),
	util      = require('util')
;

var Emitter = module.exports = function Emitter(opts)
{
	assert(opts && _.isObject(opts), 'you must pass an options object to the Emitter constructor');
	assert((opts.host && opts.port) || opts.path || opts.uri, 'you must pass uri, path, or a host/port pair for the collector');
	if (opts.node && !opts.app) opts.app = opts.node;
	assert(opts.app && _.isString(opts.app), 'you must pass an `app` option naming this service or app');

	events.EventEmitter.call(this);

	if (opts.uri) Emitter.parseURI(opts);
	if (opts.maxretries) this.maxretries = parseInt(opts.maxretries, 10);
	if (opts.maxbacklog) this.maxbacklog = parseInt(opts.maxbacklog, 10);

	this.options = opts;
	this.defaults = {};
	this.defaults.host = os.hostname();
	this.defaults.app = opts.app;
	this.defaults.node = opts.node;
	this.backlog = [];
	this.output = new JSONOutputStream();

	this.connect();
};
util.inherits(Emitter, events.EventEmitter);

Emitter.prototype.defaults = null;
Emitter.prototype.backlog  = null;
Emitter.prototype.maxbacklog = 1000;
Emitter.prototype.client   = null;
Emitter.prototype.ready    = false;
Emitter.prototype.retries  = 0;
Emitter.prototype.maxretries = 100;
Emitter.prototype.maxbacklog = 1000;

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
	this.retries = 0;
	this.ready = true;
	this.emit('ready');
};

Emitter.prototype.onError = function onError(err)
{
	this.ready = false;
};

Emitter.prototype.onClose = function onClose()
{
	this.ready = false;
	this.retries++;
	if (this.retries <= this.maxretries)
		setTimeout(this.connect.bind(this), this.nextBackoff());
	else
		this.emit('failed', 'retried ' + this.retries + ' times; giving up');
	this.emit('close');
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
	if (!event.value) event.value = 1;

	return event;
};

Emitter.prototype._write = function _write(event, encoding, callback)
{
	var payload = event;
	if (_.isObject(event))
		payload = JSON.stringify(event) + '\n';

	this.output.write(payload);
};

Emitter.prototype.metric = function metric(attrs)
{
	var event = this.makeEvent(attrs);
	if (this.ready)
		this._write(event);
	else
		this.backlog.push(event);

	while (this.backlog.length > this.maxbacklog)
		this.backlog.shift();
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
