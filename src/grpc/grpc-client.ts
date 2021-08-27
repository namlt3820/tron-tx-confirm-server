import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const PROTO_PATH = __dirname + "/transaction-request.proto";
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
});
const tx_request_proto =
	grpc.loadPackageDefinition(packageDefinition).transaction_request;

let clientRequest;

const startClientRequest = (host: string) => {
	// @ts-ignore
	clientRequest = new tx_request_proto.TransactionRequest(
		host,
		grpc.credentials.createInsecure()
	);
};

export { clientRequest, startClientRequest };
