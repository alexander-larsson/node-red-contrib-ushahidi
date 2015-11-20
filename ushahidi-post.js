module.exports = function(RED) {
  "use strict";
  var http = require("follow-redirects").http;
  var https = require("follow-redirects").https;
  var urllib = require("url");
  var clone = require("clone");

  function UshahidiPost(config) {
    RED.nodes.createNode(this,config);
    var node = this;
    // User settings
    var client_id = this.credentials.client_id;
    var client_secret = this.credentials.client_secret;
    var api_endpoint = config.api_endpoint;
    var post_status = config.post_status;
    if (this.credentials && this.credentials.username) {
      var username = this.credentials.username;
      var password = this.credentials.password;
    }

    //Tokens
    var access_token = "";
    var refresh_token = "";

    //Message buffer for when waiting for tokens
    var message_buffer = [];

    var gettingToken = false;

    // API endpoint must start with http:// or https:// so assume http:// if not set
    if (!((api_endpoint.indexOf("http://") === 0) || (api_endpoint.indexOf("https://") === 0))) {
      api_endpoint = "http://"+api_endpoint;
    }

    var protocol = (/^https/.test(api_endpoint)) ? https : http;

    var getAccessToken = function() {
      gettingToken = true;
      node.status({fill:"blue",shape:"ring",text: (refresh_token === "")? "Requesting" : "Refreshing" + " Access Token"});
      var payload;

      if(username){
        if (refresh_token === "") {
          payload = JSON.stringify({
            "client_secret" : client_secret,
            "client_id" : client_id,
            "grant_type" : "password",
            "username" : username,
            "password" : password,
            "scope" : "posts media forms api tags savedsearches sets users stats layers config messages notifications contacts"
          });
        } else {
          payload = JSON.stringify({
            "client_secret" : client_secret,
            "client_id" : client_id,
            "grant_type" : "refresh",
            "refresh_token" : refresh_token
          });
        }
      } else {
        payload = JSON.stringify({
          "client_secret" : client_secret,
          "client_id" : client_id,
          "grant_type" : "client_credentials",
          "scope" : "posts media forms api tags savedsearches sets users stats layers config messages notifications contacts"
        });
      }


      var headers = {
        "Content-Type" : "application/json",
        "Cache-Control" : "no-cache"
      };

      var opts = urllib.parse(api_endpoint);
      opts.headers = headers;
      opts.method = "POST";
      if (refresh_token !== ""){
        opts.auth = username+":"+(password||"");
      }
      opts.path += "/oauth/token";
      var req = protocol.request(opts, function(res){
        var statusCode = res.statusCode;
        var headers = res.headers;
        var response_payload = "";

        res.on('data',function(chunk) {
          response_payload += chunk;
        });

        res.on('end',function() {
          if (statusCode === 401){
            refresh_token = "";
            getAccessToken();
          }else{
            response_payload = JSON.parse(response_payload);
            access_token = response_payload.access_token;
            if (refresh_token !== ""){
              refresh_token = response_payload.refresh_token;
            }
            message_buffer.map(postRequest);
            message_buffer = []; // Clear the buffer
            node.log("Received new access token");
            node.status({});
          }
          gettingToken = false;
        });
      });

      req.on('error',function(err) {
        node.error(err.toString() + " Error getting token, check your connection and try again");
        gettingToken = false;
        node.status({fill:"red",shape:"ring",text: "Error getting token, check your connection and try again"});
      });

      req.write(payload);
      req.end();
    };

    var postRequest = function(msg) {
      node.status({fill:"blue",shape:"ring",text:"Posting to Ushahidi"});
      var payload = {
        "title": msg.title,
        "content": msg.payload,
        "locale": "en_US",
        "status": post_status,
        "values": {
          "location_default": [msg.loc]
        },
        "allowed_privileges": ["read","create","search"],
        "form": {"id": (msg.formId || 1)}
      };
      payload.completed_stages = (post_status === "published")? [1] : [];
      if (!(refresh_token === "" && username)){
        if(msg.author){
          payload.author_realname = msg.author;
        }
        if(msg.email){
          payload.author_email = msg.email;
        }
      }
      payload = JSON.stringify(payload);

      var headers = {
        "Content-Type" : "application/json",
        "Cache-Control" : "no-cache",
        "Authorization" : "Bearer " + access_token
      };
      var opts = urllib.parse(api_endpoint);
      opts.headers = headers;
      opts.method = "POST";
      opts.path += "/api/v3/posts";
      var req = protocol.request(opts, function(res){
        var statusCode = res.statusCode;
        var headers = res.headers;
        var response_payload = "";

        res.on('data',function(chunk) {
          response_payload += chunk;
        });

        res.on('end',function() {
          msg.status_code = statusCode;
          switch(statusCode) {
            case 200:
            case 204:
            node.log("Request sent successfully");
            msg.payload = (statusCode === 200)? JSON.parse(response_payload) : "{}";
            node.send(msg);
            break;
            case 400:
            message_buffer.push(clone(msg));
            console.log(gettingToken);
            if (!gettingToken){
              console.log("getting token");
              getAccessToken();
            }
            break;
            case 401:
            node.status({fill:"yellow",shape:"ring",text:"Access token expired"});
            message_buffer.push(clone(msg));
            access_token = "";
            getAccessToken();
            break;
            case 403:
            node.error("Must be logged in as admin to post directly as published");
            break;
            default:
            node.error("Something went wrong with the post request, status code: " + statusCode);
          }
          node.status({});
        });
      });
      req.on('error',function(err) {
        node.error(err.toString() + " | Failed to send msg: " + JSON.stringify(msg));
        node.status({fill:"red",shape:"ring",text: "Posting error, check your connection and try again"});
      });

      req.write(payload);
      req.end();
    };

    getAccessToken();

    this.on('input', postRequest);
  }
  RED.nodes.registerType("ushahidi-post",UshahidiPost, {
    credentials: {
      client_secret: {type: "text", required: true},
      username: {type: "text", required: true},
      password: {type: "password", required: true},
      client_id: {type: "text", required: true}
    }
  });
};
