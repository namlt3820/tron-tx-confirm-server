// @ts-nocheck
import { GRPC_TX_REQUEST_HOST, GRPC_TX_STATUS_HOST } from "../config";
import { clientRequest, startClientRequest, startClientStatus } from "../grpc";

const txId = "80052b0dcca8c6875f2be9c8620e07a3db239dab2bb54856ed580f19da5233c5";

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
				options: {
					responseUrl: GRPC_TX_STATUS_HOST,
					timeRetryIfNotResponse: 1000,
				},
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
