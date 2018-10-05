var chalk = require('chalk');
var checkTypes = require('check-types');
var fs = require('fs');
var path = require('path');

var PID_FILE_PATH = path.resolve(
  __dirname, '../tmp/proxy_env.pid'
);

var RUNTIME_CONFIG_PATH = path.resolve(
  __dirname, '../tmp/proxy_config.json'
);

var TmpRuntimeData = function(config) {
  this.config = config;
};

TmpRuntimeData.prototype.cleanUpPid = function() {
  try { fs.unlink(PID_FILE_PATH); }
  catch (e) {}
}

TmpRuntimeData.prototype.cleanUpRuntimeConfig = function() {
  try { fs.unlink(RUNTIME_CONFIG_FILE_PATH); }
  catch (e) {}
}

TmpRuntimeData.prototype.destroy = function() {
  this.cleanUpPid();
  this.cleanUpRuntimeConfig();
}

TmpRuntimeData.prototype.getPid = function() {
  try { var pidFileContents = fs.readFileSync(PID_FILE_PATH).toString(); }
  catch (e) { return null; };

  return parseInt(pidFileContents);
};

TmpRuntimeData.prototype.writePid = function(pid) {
  fs.writeFileSync(PID_FILE_PATH, pid);
  return pid;
};

TmpRuntimeData.prototype.getRuntimeConfig = function() {
  return JSON.parse(
    fs.readFileSync(RUNTIME_CONFIG_PATH).toString()
  );
}

TmpRuntimeData.prototype.writeRuntimeConfig = function(config) {
  try { fs.writeFileSync(RUNTIME_CONFIG_PATH, JSON.stringify(config)); }
  catch (e) { throw e; }

  return config;
};

TmpRuntimeData.prototype.updateRuntimeConfig = function(overrides) {
  var config = this.getRuntimeConfig();
  var merged = this.mergeRuntimeConfig(config, overrides);
  return this.writeRuntimeConfig(merged);
}

TmpRuntimeData.prototype.mergeRuntimeConfig = function(config, overrides) {
  var mergedApps = {};

  Object.keys(config.apps).forEach(function(appName) {
    var currentEnv = config.apps[appName];
    var overrideEnv = overrides[appName];
    var defaultEnv = overrides.env;
    mergedApps[appName] = overrideEnv || defaultEnv || currentEnv;
  });

  var merged = Object.assign(config, { apps: mergedApps });
  return merged;
};

TmpRuntimeData.prototype.getHostName = function() {
  return this.getRuntimeConfig().hostName;
}

TmpRuntimeData.prototype.getPort = function() {
  return this.getRuntimeConfig().port;
}

TmpRuntimeData.prototype.getUrls = function() {
  var runtimeConfig = this.getRuntimeConfig();
  urls = {};

  Object.keys(runtimeConfig.apps).forEach(function(appName) {
    var appConfig = this.config.apps[appName];
    var appEnv = runtimeConfig.apps[appName];

    function throwInvalidConfigError() {
      throw new Error(`No config found for app "${appName}" and environment "${appEnv}".`);
    }

    if (checkTypes.array(appConfig)) {
      appConfig.forEach(function(nestedConfig) {
        if (typeof nestedConfig[appEnv] !== 'string') {
          throwInvalidConfigError();
        }
        urls[nestedConfig.proxy] = nestedConfig[appEnv];
      });
    } else {
      if (typeof appConfig[appEnv] !== 'string') {
        throwInvalidConfigError();
      }
      urls[appConfig.proxy] = appConfig[appEnv];
    }
  }.bind(this));

  return urls;
}

TmpRuntimeData.prototype.writeDefaults = function() {
  var appsObj = {};

  Object.keys(this.config.apps).forEach(function(appName) {
    if (checkTypes.array(this.config.apps[appName])) {
      appsObj[appName] = this.config.apps[appName][0].default;
    }

    else {
      appsObj[appName] = this.config.apps[appName].default;
    }
  }.bind(this));

  var withDefaults = {
    hostName: this.config.hostName,
    port: this.config.port,
    apps: appsObj,
  }

  this.writeRuntimeConfig(withDefaults);
  return withDefaults;
}

module.exports = TmpRuntimeData;
