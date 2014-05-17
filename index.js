var
    _           = require('lodash'),
    assert      = require('assert'),
    events      = require('events'),
    net         = require('net'),
    ObjStream   = require('objectstream'),
    util        = require('util')
    ;

var Emitter = module.exports = function Emitter(opts)
{
    assert(opts && _.isObject(opts), 'you must pass an options object to the Emitter constructor');
    assert(opts.host && _.isString(opts.host), 'you must pass a `host` option');
    assert(opts.port && _.isNumber(opts.port), 'you must pass a `port` option');
    assert(opts.node && _.isString(opts.node), 'you must pass a `node` option naming this host');

    events.EventEmitter.call(this);

    this.options = opts;
    this.defaults = {};
    this.defaults.host = opts.node;
    this.defaults.tags = opts.tags; // optional
    this.backlog = [];

    this.connect();
};
util.inherits(Emitter, events.EventEmitter);

Emitter.prototype.defaults = null;
Emitter.prototype.backlog  = null;
Emitter.prototype.client   = null;
Emitter.prototype.ready    = false;

Emitter.prototype.connect = function connect()
{
    if (this.ready) return; // TODO might throw an error instead

    if (this.client)
    {
        this.client.removeAllListeners();
        this.output = null;
        this.client = null;
    }

    this.client = net.connect(this.options.port, this.options.host);
    this.output = ObjStream.createSerializeStream(this.client);
    this.client.on('connect', this.onConnect.bind(this));
    this.client.on('error', this.onError.bind(this));
    this.client.on('close', this.onClose.bind(this));
};

Emitter.prototype.destroy = function destroy()
{
    if (!this.client) return;
    this.client.removeAllListeners();
    this.client.end();
    this.client = null;
};

Emitter.prototype.onConnect = function onConnect()
{
    while (this.backlog.length)
        this.output.write(this.backlog.shift());
    this.ready = true;
    this.emit('ready');
};

Emitter.prototype.onError = function onError(err)
{
    this.ready = false;
    this.emit('close');
    this.connect();
};

Emitter.prototype.onClose = function onClose()
{
    this.ready = false;
    this.emit('close');
    this.connect();
};

Emitter.prototype.makeEvent = function makeEvent(opts)
{
    assert(opts && _.isObject(opts), 'you must emit something');
    assert(opts.service && _.isString(opts.service), 'you must pass a `service` to emit()');

    var event = {};
    _.defaults(event, opts, this.defaults);
    if (!event.time) event.time = Date.now(); // milliseconds!

    return event;
};

Emitter.prototype.metric = function metric(opts)
{
    var event = this.makeEvent(opts);
    if (this.ready)
        this.output.write(event);
    else
        this.backlog.push(event);
};

Emitter.createClient = function createClient(opts)
{
    return new Emitter(opts);
};
