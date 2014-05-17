# numbat-emitter

[Numbat](http://www.arkive.org/numbat/myrmecobius-fasciatus/)-powered metrics emitter. See [numbat-collector](https://github.com/ceejbot/numbat-collector) for the matching metrics collector.

[![Dependencies](https://david-dm.org/ceejbot/opsbot.png)](https://david-dm.org/ceejbot/opsbot)  
[![Tests](http://img.shields.io/travis/ceejbot/numbat-emitter.svg?style=flat)](http://travis-ci.org/ceejbot/numbat-emitter)

## Usage

```javascript
var Emitter = require('numbat-emitter');

var emitter = Emitter.createClient({
    host: 'localhost',
    port: 8000,
    node: 'www-1'
});
emitter.send({ service: 'httpd.latency', metric: 30 });
emitter.send({ service: 'disk.used.percent', metric: 36 });
emitter.send({ service: 'heartbeat'});
```

## License

[ISC](http://opensource.org/licenses/ISC)
