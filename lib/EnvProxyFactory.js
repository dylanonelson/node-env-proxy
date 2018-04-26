var chalk = require('chalk'),
  connect = require('connect'),
  https = require('https'),
  http  = require('http'),
  httpProxy = require('http-proxy'),
  urlParse = require('url-parse'),
  urlPattern = require('url-pattern'),
  URL = require('url'),
  querystring = require('querystring');

// use node.js built-in querystring parsing
function parse(url) {
  return urlParse(url, url => URL.parse(url, true).query);
}

var ProxyServer = function(options) {

  var proxy = httpProxy.createProxyServer({
    autoRewrite: true,
    hostRewrite: `${options.hostName}:${options.port}`,
    protocolRewrite: 'http',
    changeOrigin: true,
    ws: true,
  });

  this.urls = options.urls;

  app = connect()

  if (typeof options.middleware === 'function') {
    app.use(options.middleware);
  }

  app.use(function(req, res) {
    var urls = this.buildUrls(req);
    var requested = urls.requested;
    var target = urls.target;

    req.url = requested;
    proxy.web(req, res, { target });
  }.bind(this));

  this.server = http.createServer(app)
    .listen(options.port);

  this.server.on('upgrade', function(req, res) {
    var urls = this.buildUrls(req);
    var requested = urls.requested;
    var target = urls.target;

    req.url = urls.requested;
    proxy.ws(req, res, { target });
  }.bind(this));

  this.server.on('error', function(error) {
    console.log(chalk.bold.red(error));
  });

  proxy.on('error', function(error, req, res, target) {
    console.log(chalk.bold.red(error));
    console.trace();
  });
}

ProxyServer.prototype.buildUrls = function(req) {
  for (var key in this.urls) {
    if (new urlPattern(key + '*').match(req.url)) {
      // Pass the part of the URL that comes after the proxy path pattern
      // to the target; omit the pattern itself
      var url = req.url.replace(key, '');

      var parsedURL = parse(url);
      var parsedTarget = parse(this.urls[key]);

      // Merge query parameters into the requested URL
      parsedURL.set('query', Object.assign(
        {},
        parsedTarget.query,
        parsedURL.query
      ));

      // Slice off the query from the target, if there is one, now that it's
      // been merged into the requested URL
      parsedTarget.set('query', '');

      var requested = parsedURL.toString(querystring.stringify);
      var target = parsedTarget.toString(querystring.stringify);

      console.log(`${chalk.blue(requested)} ${chalk.yellow('=>')} ${chalk.cyan(target)}`);

      return { requested, target };
    }
  }
}

ProxyServer.prototype.close = function(cb) {
  this.server.close(cb);
}

ProxyServer.prototype.setUrls = function(urls) {
  this.urls = urls;
}

var EnvProxyFactory = function(options) {
  // Options takes the form of obj with key: value pairs of proxy: target
  return new ProxyServer(options);
}

module.exports = EnvProxyFactory;
