// @ts-nocheck
import { GRPC_TX_REQUEST_HOST, GRPC_TX_STATUS_HOST } from "../config";
import { clientRequest, startClientRequest, startClientStatus } from "../grpc";

const txId = "cbd26d308e90efb8908d3a87e694c23d6738759315b9b1a94ad8bf25095bb9ed";

const start = async () => {
	try {
		//gRPC
		startClientRequest(GRPC_TX_REQUEST_HOST);
		startClientStatus(GRPC_TX_STATUS_HOST, (tx) => {
			console.log({ message: "internal callback", data: tx });
		});

		clientRequest.sendTransactionRequest(
			{
				transactionId: txId,
				clientUrl: GRPC_TX_STATUS_HOST,
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
