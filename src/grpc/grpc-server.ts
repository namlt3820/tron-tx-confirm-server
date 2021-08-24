var grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");

var PROTO_PATH = __dirname + "/transaction.proto";
var packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
});
var hello_proto = grpc.loadPackageDefinition(packageDefinition).helloworld;

/**
 * Implements the SayHello RPC method.
 */
function sayHello(call, callback) {
	callback(null, { message: "Hello " + call.request.name });
}

/**
 * Implements the SayHelloAgain RPC method.
 */
function sayHelloAgain(call, callback) {
	callback(null, { message: "Hello again, " + call.request.name });
}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
function main() {
	var server = new grpc.Server();
	server.addService(hello_proto.Greeter.service, {
		sayHello: sayHello,
		sayHelloAgain: sayHelloAgain,
	});
	server.bindAsync(
		"0.0.0.0:50051",
		grpc.ServerCredentials.createInsecure(),
		() => {
			server.start();
		}
	);
}

main();
