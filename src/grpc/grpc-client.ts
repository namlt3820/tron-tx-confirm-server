import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ClientCallback } from "../interfaces";

/**
 * Transaction request
 */
const PROTO_PATH_TX_REQUEST = __dirname + "/transaction-request.proto";
const packageDefinitionTxRequest = protoLoader.loadSync(PROTO_PATH_TX_REQUEST, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
});
const tx_request_proto = grpc.loadPackageDefinition(
	packageDefinitionTxRequest
).transaction_request;

const startClientRequest = (serverUrl: string) => {
	// @ts-ignore
	const clientRequest = new tx_request_proto.TransactionRequest(
		serverUrl,
		grpc.credentials.createInsecure()
	);
	return clientRequest;
};

/**
 * Transaction status
 */
const PROTO_PATH_TX_STATUS = __dirname + "/transaction-status.proto";
const packageDefinitionTxStatus = protoLoader.loadSync(PROTO_PATH_TX_STATUS, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
});
const tx_status_proto = grpc.loadPackageDefinition(
	packageDefinitionTxStatus
).transaction_status;

const sendTransactionStatus =
	(statusCallback: ClientCallback) => async (call, callback) => {
		try {
			if (typeof statusCallback !== "function") {
				throw new Error("You have to provide a callback");
			}
			await statusCallback(call.request);

			callback(null, {
				message: "OK",
			});
		} catch (e) {
			console.log(e);
		}
	};

const startClientStatus = (
	clientUrl: string,
	statusCallback: ClientCallback
) => {
	const clientStatus = new grpc.Server();
	// @ts-ignore
	clientStatus.addService(tx_status_proto.TransactionStatus.service, {
		sendTransactionStatus: sendTransactionStatus(statusCallback),
	});
	clientStatus.bindAsync(
		clientUrl,
		grpc.ServerCredentials.createInsecure(),
		() => {
			clientStatus.start();
		}
	);
};

export { startClientRequest, startClientStatus };
