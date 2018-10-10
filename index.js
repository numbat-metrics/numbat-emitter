'use strict';

const _ = require('lodash');
const assert = require('assert');
const discard = require('discard-stream');
const events = require('events');
const JSONStringifyStream = require('./lib/json-stringify-stream');
const net = require('net');
const NSQStream = require('./lib/nsq-stream');
const os = require('os');
const UDPStream = require('./lib/udp-stream');
const url = require('url');
const WSStream = require('./lib/ws-stream');
const toStatsd = require('./to-statsd');

let globalEmitter = false;

module.exports = class Emitter extends events.EventEmitter
{
	constructor(opts)
	{

		assert(opts && _.isObject(opts), 'you must pass an options object to the Emitter constructor');
		assert(opts.path || opts.uri, 'you must pass an output uri or a socket path to specify metrics destination');

		super();

		this.defaults = null;
		this.client = null;
		this.ready = false;
		this.retries = 0;
		this.maxretries = 100;
		this.maxbacklog = 1000;
		this.shouldUnref = true;

		Object.defineProperty(this, 'backlog', {
			get: function get() { return this.input.backlog; }
		});

		const options = Object.assign({}, opts);
		this.options = options;
		if (opts.maxretries) this.maxretries = opts.maxretries;
		if (opts.maxbacklog) this.maxbacklog = opts.maxbacklog;
		if ('shouldUnref' in opts) this.shouldUnref = opts.shouldUnref;

		this.defaults = { host: os.hostname() };
		if (opts.node) this.defaults.node = opts.node;
		this.app = opts.app || 'numbat';
		this.input = discard({objectMode: true, maxBacklog: opts.maxbacklog});
		this.output = new JSONStringifyStream({ highWaterMark: opts.maxbacklog });
		this.input.pipe(this.output);
		this.connect();
	}

	static setGlobalEmitter(emitter)
	{

		globalEmitter = emitter;
	}

	static getGlobalEmitter(emitter)
	{

		return globalEmitter;
	}

	createClient()
	{
		const parsed = url.parse(this.options.uri);

		switch (parsed.protocol)
		{
		case 'udp:':
			this.options.host = parsed.hostname;
			this.options.port = parsed.port;
			this.client = new UDPStream(this.options);
			break;

		case 'sock:':
		case 'socket:':
			this.options.path = parsed.pathname;
			this.client = net.connect(this.options);
			break;

		case 'ws:':
		case 'wss:':
			this.options.ws = true;
			this.options.url = parsed;
			this.client = new WSStream(this.options);
			break;

		case 'tcp:':
			this.options.host = parsed.hostname;
			this.options.port = parsed.port;
			this.client = net.connect(this.options);
			break;

		case 'nsq:':
		case 'nsqd:':
			this.options.parsed = parsed;
			this.client = new NSQStream(this.options);
			break;

		case 'statsd:':
			this.options.host = parsed.hostname;
			this.options.port = parsed.port;
			this.options.statsd = true;
			this.client = new UDPStream(this.options);
			break;

		default:
			throw (new Error('unsupported destination uri: ' + this.options.uri));
		}
	}

	connect()
	{
		if (this.ready) return; // TODO might throw an error instead
		if (this.destroyed) return; // if destoryed do not continue to connect

		if (this.client)
		{
			this.client.removeAllListeners();
			this.output.unpipe();
			this.client = null;
		}

		this.createClient();

		this.output.pipe(this.client);
		this.client.on('connect', this.onConnect.bind(this));
		this.client.on('error', this.onError.bind(this));
		this.client.on('close', this.onClose.bind(this));
		if (this.shouldUnref && this.client.unref)
		{
			this.client.unref();
		}
	}

	destroy()
	{
		this.destroyed = true;
		if (globalEmitter === this) globalEmitter = false;

		if (!this.client) return;
		this.output.unpipe();
		this.client.removeAllListeners();
		this.client.end();
		this.client = null;
	}

	onConnect()
	{
		this.retries = 0;
		this.ready = true;
		this.emit('ready');
	}

	onError()
	{
		this.ready = false;
	}

	onClose(reason)
	{
		this.ready = false;
		this.retries++;
		if (globalEmitter === this) globalEmitter = false;
		if (this.retries <= this.maxretries)
		{
			const t = setTimeout(this.connect.bind(this), this.nextBackoff());
			t.unref();
		}
		else
			this.emit('failed', 'retried ' + this.retries + ' times; giving up');
		this.emit('close', reason);
	}

	nextBackoff()
	{
		return Math.min((Math.random() + 1) * 10 * Math.pow(2, this.retries), 60000);
	}

	makeEvent(attrs)
	{
		if (!attrs) return;
		if (!attrs.name) return;

		if (this.app && attrs.name.indexOf(this.app) !== 0)
			attrs.name = this.app + '.' + attrs.name;

		const event = {};
		_.defaults(event, attrs, this.defaults);
		if (!event.time) event.time = Date.now(); // milliseconds!

		if (this.options.statsd)
		{
			return toStatsd(event);
		}

		if (!event.hasOwnProperty('value')) event.value = 1;
		return event;
	}

	metric(attrs)
	{
		attrs = typeof attrs === 'string' ?
			{ name: attrs } : attrs;
		const ev = this.makeEvent(attrs);

		if (ev) this.input.write(ev);
		return ev;
	}
};

process.on('metric', onmetric);

function onmetric(metric)
{
	if (globalEmitter) globalEmitter.metric(metric);
}
