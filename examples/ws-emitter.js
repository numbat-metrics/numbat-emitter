#!/usr/bin/env node

var Emitter = require('../index');

var emitter = new Emitter({
	uri: 'ws://localhost:3333/?key=foobar',
	app: 'example-1'
});

emitter.on('ready', function handleReady()
{
	console.log('connected to collector');
	emitter.metric({ name: 'example.start', pid: process.pid });
});

emitter.on('close', function handleClose(reason)
{
	console.log(reason);
});

function heartbeat()
{
	console.log('heartbeat');
	emitter.metric({ name: 'heartbeat', ttl: 16000 });
}

function resources()
{
	console.log('resources');
	var mem = process.memoryUsage();

	emitter.metric({ name: 'example.memory.rss', value: mem.rss });
	emitter.metric({ name: 'example.memory.heapTotal', value: mem.heapTotal });
	emitter.metric({ name: 'example.memory.heapUsed', value: mem.heapUsed });
}

var heartbeatTimer = setInterval(heartbeat, 15000);
var resourcesTimer = setInterval(resources, 30000);

process.on('SIGINT', function()
{
	console.log('disconnected from collector');
	clearInterval(heartbeatTimer);
	clearInterval(resourcesTimer);
	emitter.metric({ name: 'shutdown' });
	setTimeout(process.exit, 500);
});
