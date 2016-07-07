# numbat-emitter

[Numbat](http://www.arkive.org/numbat/myrmecobius-fasciatus/)-powered metrics emitter. See [numbat-collector](https://github.com/numbat-metrics/numbat-collector) for the matching metrics collector.

[![on npm](http://img.shields.io/npm/v/numbat-emitter.svg?style=flat)](https://www.npmjs.org/package/numbat-emitter)  [![Tests](http://img.shields.io/travis/numbat-metrics/numbat-emitter.svg?style=flat)](http://travis-ci.org/numbat-metrics/numbat-emitter) ![Coverage](http://img.shields.io/badge/coverage-100%25-green.svg?style=flat) [![Dependencies](http://img.shields.io/david/numbat-metrics/numbat-emitter.svg?style=flat)](https://david-dm.org/numbat-metrics/numbat-emitter)

## Example

```javascript
var Emitter = require('numbat-emitter');

var emitter = new Emitter({
    uri: 'tcp://localhost:8000',
    app: 'www',
    node: 'www:8081'
});
emitter.metric({ name: 'httpd.latency', value: 30 });
emitter.metric({ name: 'disk.used.percent', value: 36 });
emitter.metric({ name: 'heartbeat'});


// if you don't have a reference to an emitter, you
// can broadcast a metric to all extant emitters:
process.emit('metric', { name: 'heartbeat' });
```

See the `examples/` directory for working examples.

## Configuration

The constructor requires an options object with an app name in the `app` field and some manner of specifying where to emit the metrics. You can specify the protocol, host, and port in handy url-parseable format: `tcp://collector.example.com:5000`, `udp://localhost:5000`, `socket:/tmp/foozle.sock`, `ws://localhost:5000`. Do this in the `uri` field of the options object.

Config options:

| option | description | required? | default |
|--------|-------------|-----------|---------|
| uri    | uri of the metrics collector | either this or path | |
| path   | path to the unix domain socket where the collector is listening | either this or uri ||
| app    | name of this service or app; every metric name will be prefixed with it | y | |
| node   | name of this specific app instance |  | |
| maxretries | number of times to retry connecting before giving up |  | 100 |
| maxbacklog | max number of metrics to hold in backlog during reconnects | | 1000 |
| shouldUnref | should numbat avoid holding the process open if its the only active conn? | | true |


An example:

```javascript
{
    uri:  'udp://localhost:8000',
    app: 'udp-emitter',
    node: 'emitter-1',
    maxretries: 10,
    maxbacklog: 200,
}
```

Or numbat might be listening via a unix domain socket:

```javascript
{
    path: '/tmp/numbat-collector.sock',
    app: 'socket-emitter'
}
```

## Events

Valid events look like this:

```javascript
{
    name: 'name.of.metric',
    value: 42
    status: 'okay' | 'warning' | 'critical' | 'unknown',
    description: 'textual description',
    ttl: ms-to-live,
    // fields provided for you
    app: 'appname-from-options',
    host: os.hostname(),
    time: ts-in-ms,
}
```

You can add any fields you like & they will be persisted in InfluxDB. However, only the fields listed above are meaningful to the analyzer. Those fields are described in detail below.

NOTE: You can of course emit any events you like! The style of events required/expected by numbat's [analyzer](https://github.com/ceejbot/numbat-analyzer), however, might change in development.

### name

String. Required. Name of this event or metric. Use dots `.` to separate namespaces. If you do not prefix the metric name with `yourapp.`, numbat will do this for you.

### time

Number. Optional. Timestamp in milliseconds since the epoch. If you do not pass a time field, one will be created for you with `Date.now()`.

### value

Number. Optional. The value of this metric, if appropriate. If you do not pass a value field, it will be defaulted to `1`.

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
    status: 'okay',
};
var e2 = {
    name: 'request.latency',
    value: 5023
    status: 'warning',
};

var e3 = { name: 'heartbeat', ttl: 30000 };
```

## Contributing

Yes, please do! See our [contributing guide](https://github.com/numbat-metrics/documentation/blob/master/contributing.md) for basic rules of engagement.

## License

[ISC](http://opensource.org/licenses/ISC)
