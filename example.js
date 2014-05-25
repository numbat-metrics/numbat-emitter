#!/usr/bin/env node

var Emitter = require('./index');

var emitter = new Emitter({
    host: 'localhost',
    port: 3333,
    node: 'test-1'
});

emitter.metric({ service: 'example.start', pid: process.pid });


function heartbeat()
{
    emitter.metric({ service: 'heartbeat'});
}

function resources()
{
    var mem = process.memoryUsage();

    emitter.metric({ service: 'example.memory.rss', metric: mem.rss });
    emitter.metric({ service: 'example.memory.heapTotal', metric: mem.heapTotal });
    emitter.metric({ service: 'example.memory.heapUsed', metric: mem.heapUsed });
}


var heartbeatTimer = setInterval(heartbeat, 60000);
var resourcesTimer = setInterval(resources, 120000);
