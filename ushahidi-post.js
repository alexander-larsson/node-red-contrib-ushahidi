module.exports = function(RED) {
    function UshahidiPost(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        this.on('input', function(msg) {
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });
    }
    RED.nodes.registerType("ushahidi-post",UshahidiPost, {
      credentials: {
        username: {type: "text"},
        password: {type: "password"}
      }
    });
}
