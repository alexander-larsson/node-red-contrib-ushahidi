module.exports = function(RED) {
  "use strict";
  var http = require("follow-redirects").http;
  var https = require("follow-redirects").https;
  var urllib = require("url");

  function UshahidiAdmin(config) {
    RED.nodes.createNode(this,config);
    var node = this;
    var username = this.credentials.username;
    var password = this.credentials.password;
    var client_id = this.credentials.client_id;
    var client_secret = this.credentials.client_secret;
    var api_endpoint = config.api_endpoint;
    var method = config.method;

    var access_token = "";
    var refresh_token = "";

    // API endpoint must start with http:// or https:// so assume http:// if not set
    if (!((api_endpoint.indexOf("http://") === 0) || (api_endpoint.indexOf("https://") === 0))) {
      api_endpoint = "http://"+api_endpoint;
    }

    var requestAccessToken = function(){
      node.status({fill:"blue",shape:"ring",text:"Requesting Access Token"});
      var payload = JSON.stringify({
        "client_secret" : client_secret,
        "client_id" : client_id,
        "grant_type" : "password",
        "username" : username,
        "password" : password,
        "scope" : "posts media forms api tags savedsearches sets users stats layers config messages notifications contacts"
      });

      var headers = {
        "Content-Type" : "application/json",
        "Cache-Control" : "no-cache"
      };

      var opts = urllib.parse(api_endpoint);
      opts.headers = headers;
      opts.method = "POST";
      opts.auth = username+":"+(password||"");
      opts.path += "/oauth/token";
      var req = http.request(opts, function(res){
        var statusCode = res.statusCode;
        var headers = res.headers;
        var response_payload = "";

        res.on('data',function(chunk) {
          response_payload += chunk;
        });

        res.on('end',function() {
          response_payload = JSON.parse(response_payload);
          access_token = response_payload.access_token;
          refresh_token = response_payload.refresh_token;
          node.log("Received new access token");
          node.status({});
        });
      });
      req.write(payload);
      req.end();
    };

    requestAccessToken();

    this.on('input', function(msg) {
      msg.payload = {
        "username" : username,
        "password" : password,
        "client_id" : client_id,
        "client_secret" : client_secret,
        "api_endpoint" : api_endpoint,
        "method" : method
      };
      node.send(msg);
    });
  }
  RED.nodes.registerType("ushahidi-admin",UshahidiAdmin, {
    credentials: {
      client_secret: {type: "text", required: true},
      username: {type: "text", required: true},
      password: {type: "password", required: true},
      client_id: {type: "text", required: true}
    }
  });
};
