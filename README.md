# numbat-emitter

[Numbat](http://www.arkive.org/numbat/myrmecobius-fasciatus/)-powered metrics emitter. See [numbat-collector](https://github.com/ceejbot/numbat-collector) for the matching metrics collector.

[![Tests](http://img.shields.io/travis/ceejbot/numbat-emitter.svg?style=flat)](http://travis-ci.org/ceejbot/numbat-emitter)
![Coverage](http://img.shields.io/badge/coverage-98%25-green.svg?style=flat)
[![Dependencies](https://david-dm.org/ceejbot/numbat-emitter.png)](https://david-dm.org/ceejbot/numbat-emitter)  
[![NPM](https://nodei.co/npm/numbat-emitter.png)](https://nodei.co/npm/numbat-emitter/)

## Usage

```javascript
var Emitter = require('numbat-emitter');

var emitter = Emitter.createClient({
    host: 'localhost',
    port: 8000,
    node: 'www-1'
});
emitter.metric({ name: 'httpd.latency', metric: 30 });
emitter.metric({ name: 'disk.used.percent', metric: 36 });
emitter.metric({ name: 'heartbeat'});
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

Number. Required. Timestamp in milliseconds since the epoch.

### value

Number. The value of this metric, if appropriate.

### host

String. The hostname of the service generating this event, if relevant.

### tags

Array of strings. Use tags to hint to the analyzer/dashboard how to display this metric. Understood metric types include:

- `annotation`
- `counter`
- `gauge`
- `histogram`

### status

String. One of `okay`, `warning`, `critical`, or `unknown`. Use this to trigger alerts if this event represents a known-bad condition.

### description

Textual description of the event. Max 255 bytes.

### ttl

Number. Milliseconds that this event is considered valid. The analyzer will expire the event after `event.time` + `event.ttl`.

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

## Contributing

Sure! Write tests with [Lab](https://www.npmjs.org/package/lab) & [must](https://www.npmjs.org/package/must). Use BSD/Allman bracing or I will stare at you funny and not take your pull request.

## License

[ISC](http://opensource.org/licenses/ISC)
