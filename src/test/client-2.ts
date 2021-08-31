// @ts-nocheck
import { GRPC_TX_REQUEST_HOST } from "../config";
import { clientRequest, startClientRequest, startClientStatus } from "../grpc";

const txId = "715495ac30885421cc3b5749e87442e2a8d8fdd5cf8dc3ebfc5d95bfc5bd062a";
const clientUrl = "localhost:50002";

const start = async () => {
	try {
		//gRPC
		startClientRequest(GRPC_TX_REQUEST_HOST);
		startClientStatus(clientUrl, (tx) => {
			console.log({ message: "internal callback", data: tx });
		});

		clientRequest.sendTransactionRequest(
			{
				transactionId: txId,
				clientUrl,
				getFinalStatus: true,
			},
			function (err, response) {
				console.log({ immediateResponse: response });
			}
		);

		return;
	} catch (e) {
		console.log({ clientError: e });
	}
};

start();
