'use strict';

var
    lab        = require('lab'),
    describe   = lab.describe,
    it         = lab.it,
    demand     = require('must'),
    net        = require('net'),
    Emitter    = require('./index'),
    JSONStream = require('json-stream')
    ;

describe('numbat-emitter', function()
{
    var mockOpts =
    {
        host:    'localhost',
        port:    4333,
        node:    'node-1'
    };

    var mockServer;

    lab.before(function(done)
    {
        function onConnection(socket)
        {
            var instream = new JSONStream();
            socket.pipe(instream);
            instream.on('data', function(data)
            {
                mockServer.emit('received', data);
            });
        }

        mockServer = net.createServer(onConnection);
        mockServer.listen(4333, function()
        {
            done();
        });
    });

    it('requires an options object', function(done)
    {
        function shouldThrow() { return new Emitter(); }
        shouldThrow.must.throw(/options/);
        done();
    });

    it('requires a host & port option', function(done)
    {
        function shouldThrow() { return new Emitter({}); }
        shouldThrow.must.throw(/host/);
        done();
    });

    it('requires a path option otherwise', function(done)
    {
        function shouldThrow() { return new Emitter({ path: '/tmp/numbat.sock' }); }
        shouldThrow.must.throw(/node/);
        done();
    });

    it('requires a node name option', function(done)
    {
        function shouldThrow() { return new Emitter({ host: 'localhost', port: 4000 }); }
        shouldThrow.must.throw(/node/);
        done();
    });

    it('can be constructed', function(done)
    {
        var emitter = new Emitter(mockOpts);
        emitter.must.be.an.object();

        emitter.must.have.property('options');
        emitter.options.must.be.an.object();
        emitter.options.must.equal(mockOpts);

        emitter.must.have.property('defaults');
        emitter.defaults.must.be.an.object();

        emitter.must.have.property('backlog');
        emitter.backlog.must.be.an.array();

        emitter.destroy();
        done();
    });

    it('calls connect() when constructed', function(done)
    {
        var emitter = new Emitter(mockOpts);
        emitter.must.have.property('client');
        emitter.client.on('connect', function()
        {
            emitter.destroy();
            done();
        });
    });

    it('allows connect() to be called twice safely', function(done)
    {
        var emitter = new Emitter(mockOpts);
        emitter.client.on('connect', function()
        {
            emitter.connect();
            emitter.destroy();
            done();
        });
    });

    it('allows destroy() to be called twice safely', function(done)
    {
        var emitter = new Emitter(mockOpts);
        emitter.client.on('connect', function()
        {
            emitter.destroy();
            emitter.destroy();
            done();
        });
    });

    it('adds listeners for `connect`, `error`, and `close`', function(done)
    {
        var emitter = new Emitter(mockOpts);
        var listeners = emitter.client.listeners('connect');
        listeners.must.be.an.array();
        listeners.length.must.be.above(0);

        listeners = emitter.client.listeners('error');
        listeners.must.be.an.array();
        listeners.length.must.be.above(0);

        listeners = emitter.client.listeners('close');
        listeners.must.be.an.array();
        listeners.length.must.be.above(0);

        emitter.destroy();

        done();
    });

    it('reconnects on close & error', function(done)
    {
        var count = 0;
        var emitter = new Emitter(mockOpts);
        emitter.on('ready', function()
        {
            count++;
            if (count == 2)
            {
                emitter.destroy();
                done();
            }
        });

        emitter.client.end();
    });

    it('requires that an object be passed to metric()', function(done)
    {
        var emitter = new Emitter(mockOpts);
        function shouldThrow() { emitter.metric(); }
        shouldThrow.must.throw(/empty event/);
        done();
    });

    it('requires a `name` field for all metrics', function(done)
    {
        var emitter = new Emitter(mockOpts);
        function shouldThrow() { emitter.metric({ foo: 'bar' }); }
        shouldThrow.must.throw(/name/);
        done();
    });

    it('writes event objects to its socket', function(done)
    {
        function observer(d)
        {
            d.must.be.an.object();
            d.must.have.property('host');
            d.must.have.property('time');
            d.metric.must.equal(4);
            mockServer.removeListener('received', observer);
            done();
        }

        mockServer.on('received', observer);
        var emitter = new Emitter(mockOpts);
        emitter.metric({ name: 'test', metric: 4 });
    });

    it('accumulates events in a backlog until connected', { timeout: 5000}, function(done)
    {
        var emitter = new Emitter(mockOpts);

        emitter.on('close', function()
        {
            emitter.metric({ name: 'test.splort', metric: 4 });
            emitter.metric({ name: 'test.latency', metric: 30 });

            emitter.backlog.must.be.an.array();
            emitter.backlog.length.must.equal(2);
            emitter.backlog[0].must.have.property('name');
            emitter.backlog[0].name.must.equal('test.splort');

            done();
        });

        emitter.connect = function() {};
        emitter.client.end();
    });

    it('sends its backlog when connected', function(done)
    {
        var count = 0;
        function observer(d)
        {
            count++;
            if (count === 1)
                d.name.must.equal('test.splort');

            if (count === 2)
            {
                d.name.must.equal('test.latency');
                mockServer.removeListener('received', observer);
                done();
            }
        }
        mockServer.on('received', observer);

        var emitter = new Emitter(mockOpts);

        function fillBacklog()
        {
            emitter.removeListener('close', fillBacklog);
            emitter.metric({ name: 'test.splort', metric: 4 });
            emitter.metric({ name: 'test.latency', metric: 30 });
        }

        emitter.on('close', fillBacklog);
        var orig = emitter.connect.bind(emitter);
        emitter.connect = function() { setTimeout(orig, 1000); };
        emitter.client.end();
    });

    lab.after(function(done)
    {
        mockServer.close();
        done();
    });
});
