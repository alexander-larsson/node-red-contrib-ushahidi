module.exports = function(RED) {
  "use strict";
  var http = require("follow-redirects").http;
  var https = require("follow-redirects").https;
  var urllib = require("url");
  var clone = require("clone");

  function UshahidiAdmin(config) {
    RED.nodes.createNode(this,config);
    var node = this;
    // User settings
    var username = this.credentials.username;
    var password = this.credentials.password;
    var client_id = this.credentials.client_id;
    var client_secret = this.credentials.client_secret;
    var api_endpoint = config.api_endpoint;
    var method = config.method;
    var post_status = config.post_status;

    //Tokens
    var access_token = "";
    var refresh_token = "";

    //Message buffer for when waiting for tokens
    var message_buffer = [];

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
          // Catch up on saved messages
          message_buffer.map(postRequest);
          node.log("Received new access token");
          node.status({});
        });
      });
      req.write(payload);
      req.end();
    };

    var postRequest = function(msg) {
      node.status({fill:"blue",shape:"ring",text:"Posting to Ushahidi"});
      var payload = JSON.stringify({
        "title": msg.title,
        "content": msg.payload,
        "locale": "en_US",
        "status": post_status,
        "values": {
          "location_default": [msg.loc]
        },
        "completed_stages": post_status==="published"?[1]:[],
        "allowed_privileges": ["read","create","search"],
        "form": {"id": (msg.form_id || 1)},
        "author_realname": msg.author,
        "author_email": msg.email
      });

      var headers = {
        "Content-Type" : "application/json",
        "Cache-Control" : "no-cache",
        "Authorization" : "Bearer " + access_token
      };
      // Send this baby after lunch
      // Only POST works atm
      var opts = urllib.parse(api_endpoint);
      opts.headers = headers;
      opts.method = "POST";
      //opts.auth = username+":"+(password||"");
      opts.path += "/api/v3/posts";
      var req = http.request(opts, function(res){
        var statusCode = res.statusCode;
        var headers = res.headers;
        var response_payload = "";

        res.on('data',function(chunk) {
          response_payload += chunk;
        });

        res.on('end',function() {
          switch(statusCode) {
          case 200:
            node.log("Request sent successfully");
            msg.payload = JSON.parse(response_payload);
            node.send(msg);
            break;
          case 401:
            message_buffer.push(clone(msg));
            access_token = "";
            requestAccessToken(); // Replace with token refresh
            break;
          case 400:
            message_buffer.push(clone(msg));
            break;
          default:
            node.log("Something went wrong with the post request, status code: " + statusCode);
          }
          node.status({});
        });
      });
      req.write(payload);
      req.end();
    };

    requestAccessToken();

    this.on('input', function(msg) {
      postRequest(msg);
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
