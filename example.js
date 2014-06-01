#!/usr/bin/env node

var Emitter = require('./index');

var emitter = new Emitter({
    host: 'localhost',
    port: 3335,
    node: 'example-1'
});

emitter.metric({ name: 'example.start', pid: process.pid });


function heartbeat()
{
    emitter.metric({ name: 'heartbeat', ttl: 16000 });
}

function resources()
{
    var mem = process.memoryUsage();

    emitter.metric({ name: 'example.memory.rss', metric: mem.rss });
    emitter.metric({ name: 'example.memory.heapTotal', metric: mem.heapTotal });
    emitter.metric({ name: 'example.memory.heapUsed', metric: mem.heapUsed });
}

var heartbeatTimer = setInterval(heartbeat, 15000);
var resourcesTimer = setInterval(resources, 30000);
