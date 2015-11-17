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

        var requestAccessToken = function(){
          node.status({fill:"blue",shape:"ring",text:"Requesting Access Token"});
        };

        requestAccessToken();

        this.on('input', function(msg) {
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });
    }
    RED.nodes.registerType("ushahidi-post",UshahidiAdmin, {
      credentials: {
        client_secret: {type: "text", required: true},
        username: {type: "text", required: true},
        password: {type: "password", required: true},
        client_id: {type: "text", required: true}
      }
    });
};
