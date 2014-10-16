# numbat-emitter

[Numbat](http://www.arkive.org/numbat/myrmecobius-fasciatus/)-powered metrics emitter. See [numbat-collector](https://github.com/ceejbot/numbat-collector) for the matching metrics collector.

[![on npm](http://img.shields.io/npm/v/numbat-emitter.svg?style=flat)](https://www.npmjs.org/package/numbat-emitter)  [![Tests](http://img.shields.io/travis/ceejbot/numbat-emitter.svg?style=flat)](http://travis-ci.org/ceejbot/numbat-emitter) ![Coverage](http://img.shields.io/badge/coverage-100%25-green.svg?style=flat) [![Dependencies](http://img.shields.io/david/ceejbot/numbat-emitter.svg?style=flat)](https://david-dm.org/ceejbot/numbat-emitter)

## Example

```javascript
var Emitter = require('numbat-emitter');

var emitter = new Emitter({
    host: 'localhost',
    port: 8000,
    udp: true,
    node: 'www-1'
});
emitter.metric({ name: 'httpd.latency', value: 30 });
emitter.metric({ name: 'disk.used.percent', value: 36 });
emitter.metric({ name: 'heartbeat'});
```

## Configuration

The constructor requires an options object with either a host/port pair or the path of a socket file to connect to. It also requires a string `node` field naming the emitting node. A typical use:

```javascript
{
    host: 'collector.example.com',
    port: 8000,
    node: 'tcp-emitter'
}
```

If you wish to use udp instead of tcp, pass `udp: true`:

```javascript
{
    host: 'localhost',
    port: 8000,
    udp:  true,
    node: 'udp-emitter'
}
```

And finally a unix domain socket:

```javascript
{
    path: '/tmp/numbat-collector.sock',
    node: 'uds-emitter'
}
```

## Events

Valid events look like this:

```javascript
{
    name: 'name.of.metric',
    time: ts-in-ms,
    value: 42
    host: 'hostname.example.com',
    tags: ['array', 'of', 'tags'],
    status: 'okay' | 'warning' | 'critical' | 'unknown',
    description: 'textual description',
    ttl: ms-to-live,
}
```

You can add any fields you like & they will be persisted in InfluxDB. However, only the fields listed above are meaninful to the analyzer. Those fields are described in detail below.

NOTE: You can of course emit any events you like! The style of events required/expected by numbat's [analyzer](https://github.com/ceejbot/numbat-analyzer), however, might change in development.

### name

String. Required. Name of this event or metric. Use dots `.` to separate namespaces.

### time

Number. Optional. Timestamp in milliseconds since the epoch. If you do not pass a time field, one will be created for you with `Date.now()`.

### value

Number. Optional. The value of this metric, if appropriate.

### host

String. Optional. The hostname of the service generating this event, if relevant.

### tags

Array of strings. Optional. Use tags to hint to the analyzer/dashboard how to display this metric. Understood metric types include:

- `annotation`
- `counter`
- `gauge`
- `histogram`

Tags are *not* passed on to InfluxDB by the collector.

### status

String. Optional. One of `okay`, `warning`, `critical`, or `unknown`. Use this to trigger alerts if this event represents a known-bad condition.

### description

Textual description of the event. Max 255 bytes. Optional.

### ttl

Number. Optional. Milliseconds that this event is considered valid. The analyzer will expire the event after `event.time` + `event.ttl`.

## Practical event examples

See also the example emitter in [example.js](./example.js).

```javascript
var e1 = {
    name: 'request.latency',
    value: 42
    tags: ['app', 'histogram' ],
    status: 'okay',
};
var e2 = {
    name: 'request.latency',
    value: 5023
    tags: ['app', 'histogram' ],
    status: 'warning',
};

var e3 = { name: 'heartbeat', ttl: 30000 };
```

## TODO

* Backlog should be capped at a configurable size so you don't explode memory if your collector is down.

## Contributing

Sure! Write tests with [Lab](https://www.npmjs.org/package/lab) & [must](https://www.npmjs.org/package/must). Use BSD/Allman bracing or I will stare at you funny and not take your pull request.

## License

[ISC](http://opensource.org/licenses/ISC)
