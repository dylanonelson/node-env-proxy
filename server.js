#!/usr/bin/env node

var EnvProxyFactory = require('./lib/EnvProxyFactory.js');
var TmpRuntimeData = require('./lib/TmpRuntimeData.js');

var config = JSON.parse(process.argv[2]);
var middleware = require(config.middleware);

var tmpData = new TmpRuntimeData(config);
var proxy;

try { tmpData.writeDefaults(); }
catch (e) { throw e; }

proxy = EnvProxyFactory({
  hostName: tmpData.getHostName(),
  middleware: middleware,
  port: tmpData.getPort(),
  urls: tmpData.getUrls(),
});

process.on('SIGINT', function() {
  tmpData.cleanUpPid();
  process.exit();
});

process.on('SIGHUP', function() {
  try { proxy.setUrls(tmpData.getUrls()); }
  catch (e) { throw e; }
});
