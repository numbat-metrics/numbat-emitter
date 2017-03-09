var
	discard             = require('discard-stream'),
	UDPStream           = require('./lib/udp-stream'),
	WSStream            = require('./lib/ws-stream'),
	JSONStringifyStream = require('./lib/json-stringify-stream'),
	_                   = require('lodash'),
	events              = require('events'),
	assert              = require('assert'),
	util                = require('util'),
	url                 = require('url'),
	net                 = require('net'),
	os                  = require('os')
	;

var globalEmitter = false;

var Emitter = module.exports = function Emitter(opts)
{
	if (this.constructor !== Emitter) return new Emitter(opts);
	assert(opts && _.isObject(opts), 'you must pass an options object to the Emitter constructor');
	assert(opts.path || opts.uri, 'you must pass an output uri or a socket path to specify metrics destinationr');

	events.EventEmitter.call(this);
	this.options = Object.assign({}, opts);

	if (opts.uri) Emitter.parseURI(this.options);
	if (opts.maxretries) this.maxretries = opts.maxretries;
	if (opts.maxbacklog) this.maxbacklog = opts.maxbacklog;
	if ('shouldUnref' in opts) this.shouldUnref = opts.shouldUnref;

	this.defaults = { host: os.hostname() };
	if (opts.node) this.defaults.node = opts.node;
	this.app = opts.app || 'numbat';
	this.input = discard({objectMode: true, maxBacklog: opts.maxbacklog});
	this.output = JSONStringifyStream({ highWaterMark: opts.maxbacklog });
	this.input.pipe(this.output);
	this.connect();
};
util.inherits(Emitter, events.EventEmitter);

Emitter.prototype.defaults    = null;
Emitter.prototype.client      = null;
Emitter.prototype.ready       = false;
Emitter.prototype.retries     = 0;
Emitter.prototype.maxretries  = 100;
Emitter.prototype.maxbacklog  = 1000;
Emitter.prototype.shouldUnref = true;

Object.defineProperty(Emitter.prototype, 'backlog', {
	get: function backlogGetter() { return this.input.backlog; }
});

Emitter.setGlobalEmitter = function setGlobalEmitter(emitter)
{
	globalEmitter = emitter;
};

Emitter.getGlobalEmitter = function getGlobalEmitter()
{
	return globalEmitter;
};

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

	case 'ws:':
	case 'wss:':
		options.ws = true;
		options.url = parsed;
		break;

	case 'tcp:':
		options.host = parsed.hostname;
		options.port = parsed.port;
		break;

	default:
		throw (new Error('unsupported destination uri: ' + options.uri));
	}

	delete options.uri;
	return options;
};

Emitter.prototype.connect = function connect()
{
	if (this.ready) return; // TODO might throw an error instead
	if (this.destroyed) return; // if destoryed do not continue to connect

	if (this.client)
	{
		this.client.removeAllListeners();
		this.output.unpipe();
		this.client = null;
	}

	if (this.options.udp)
		this.client = new UDPStream(this.options);
	else if (this.options.ws)
		this.client = new WSStream(this.options);
	else
		this.client = net.connect(this.options);

	this.output.pipe(this.client);
	this.client.on('connect', this.onConnect.bind(this));
	this.client.on('error', this.onError.bind(this));
	this.client.on('close', this.onClose.bind(this));
	if (this.shouldUnref && this.client.unref)
	{
		this.client.unref();
	}
};

Emitter.prototype.destroy = function destroy()
{
	this.destroyed = true;
	if (globalEmitter === this) globalEmitter = false;

	if (!this.client) return;
	this.output.unpipe();
	this.client.removeAllListeners();
	this.client.end();
	this.client = null;
};

Emitter.prototype.onConnect = function onConnect()
{
	this.retries = 0;
	this.ready = true;
	this.emit('ready');
};

Emitter.prototype.onError = function onError(unused)
{
	this.ready = false;
};

Emitter.prototype.onClose = function onClose(reason)
{
	this.ready = false;
	this.retries++;
	if (globalEmitter === this) globalEmitter = false;
	if (this.retries <= this.maxretries)
	{
		var t = setTimeout(this.connect.bind(this), this.nextBackoff());
		t.unref();
	}
	else
		this.emit('failed', 'retried ' + this.retries + ' times; giving up');
	this.emit('close', reason);
};

Emitter.prototype.nextBackoff = function nextBackoff()
{
	return Math.min((Math.random() + 1) * 10 * Math.pow(2, this.retries), 60000);
};

Emitter.prototype.makeEvent = function makeEvent(attrs)
{
	assert(attrs && _.isObject(attrs), 'you cannot make an empty event');
	assert(attrs.name, 'you must give your metric a name');

	if (this.app && attrs.name.indexOf(this.app) !== 0)
		attrs.name = this.app + '.' + attrs.name;

	var event = {};
	_.defaults(event, attrs, this.defaults);
	if (!event.time) event.time = Date.now(); // milliseconds!
	if (!event.hasOwnProperty('value')) event.value = 1;

	return event;
};

Emitter.prototype.metric = function metric(attrs)
{
	attrs = typeof attrs === 'string' ?
		{ name: attrs } : attrs;
	var ev = this.makeEvent(attrs);
	this.input.write(ev);
	return ev;
};

process.on('metric', onmetric);

function onmetric(metric)
{
	if (globalEmitter) globalEmitter.metric(metric);
}
