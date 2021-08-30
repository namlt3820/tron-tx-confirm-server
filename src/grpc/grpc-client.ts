import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ITransactionStatus } from "../interfaces";

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

let clientRequest;

const startClientRequest = (host: string) => {
	// @ts-ignore
	clientRequest = new tx_request_proto.TransactionRequest(
		host,
		grpc.credentials.createInsecure()
	);
};

/**
 * Transaction status
 */
type InternalCallback = (tx: ITransactionStatus) => void;
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

let clientStatus;

const sendTransactionStatus =
	(internalCallback: InternalCallback) => async (call, callback) => {
		try {
			if (typeof internalCallback !== "function") {
				throw new Error("You have to provide a callback");
			}
			await internalCallback(call.request);

			callback(null, {
				message: "OK",
			});
		} catch (e) {
			console.log(e);
		}
	};

const startClientStatus = (
	host: string,
	internalCallback: InternalCallback
) => {
	clientStatus = new grpc.Server();
	// @ts-ignore
	clientStatus.addService(tx_status_proto.TransactionStatus.service, {
		sendTransactionStatus: sendTransactionStatus(internalCallback),
	});
	clientStatus.bindAsync(
		host,
		grpc.ServerCredentials.createInsecure(),
		() => {
			clientStatus.start();
		}
	);
};

export { clientRequest, startClientRequest, clientStatus, startClientStatus };
