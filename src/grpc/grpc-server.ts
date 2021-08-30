import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { addTxRequestToMongo } from "../mongo";
import { getTransactionStatusFromRedis } from "../request";
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

let serverRequest;

const sendTransactionRequest = async (call, callback) => {
	try {
		const { transactionId } = call.request;

		// request transaction status
		await addTxRequestToMongo(call.request);

		const transactionStatus = await getTransactionStatusFromRedis(
			transactionId
		);

		callback(null, {
			transactionId,
			transactionStatus,
		});
	} catch (e) {
		const { transactionId } = call.request;
		callback(null, {
			transactionId,
			error: e.message || "Something wrong with the request",
		});
	}
};

const startServerRequest = (host: string) => {
	serverRequest = new grpc.Server();
	// @ts-ignore
	serverRequest.addService(tx_request_proto.TransactionRequest.service, {
		sendTransactionRequest: sendTransactionRequest,
	});
	serverRequest.bindAsync(
		host,
		grpc.ServerCredentials.createInsecure(),
		() => {
			serverRequest.start();
		}
	);
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
const tx_request_status = grpc.loadPackageDefinition(
	packageDefinitionTxStatus
).transaction_status;

const startServerStatus = (host: string, tx: ITransactionStatus): void => {
	// @ts-ignore
	const serverStatus = new tx_request_status.TransactionStatus(
		host,
		grpc.credentials.createInsecure()
	);

	serverStatus.sendTransactionStatus(tx, function (err, response) {
		console.log({ clientResponse: response });
	});
};

export { serverRequest, startServerRequest, startServerStatus };
