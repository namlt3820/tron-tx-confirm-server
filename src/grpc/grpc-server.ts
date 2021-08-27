import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { addTransactionRequestToMongo } from "../mongo";
import { getTransactionStatusFromRedis } from "../request";

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

let serverRequest;

/**
 * Implements the SendTransactionRequest RPC method.
 */
const sendTransactionRequest = async (call, callback) => {
	try {
		const { transactionId, options } = call.request;

		// request transaction status
		await addTransactionRequestToMongo({
			transactionId,
			options,
		});

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

/**
 * Starts an RPC server that receives requests for the TransactionRequest service
 */
const startServerRequest = (host: string) => {
	var serverRequest = new grpc.Server();
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

export { serverRequest, startServerRequest };
