module.exports = function(RED) {
  "use strict";
    function UshahidiAdmin(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var username = this.credentials.username;
        var password = this.credentials.password;
        var client_id = this.credentials.client_id;
        var client_secret = this.credentials.client_secret;
        var api_endpoint = config.api_endpoint;
        var method = config.method;

        var requestAccessToken = function(){
          node.status({fill:"blue",shape:"ring",text:"Requesting Access Token"});

          node.status({});
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
