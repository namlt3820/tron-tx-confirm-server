import { startClient } from "../client";

const txIds = [
	"45d6132a72974205b0fc8f6e555824c4cf81402b19bc4b7add84bb81cffd0553",
	"c05903ccd68d94cdc95d43da7241b71b1f7e1a2cedad42baf5d9aba8e94f8b65",
	"1c2442a37186dce1f759ebdb5dad1b8a0de4bce80a77bd3f95b94919772018d4",
];
const clientUrl = "localhost:50002";

(async () => {
	const clientRequest = await startClient({
		clientUrl,
		serverUrl: "localhost:50051",
		statusCallback: (txStatus) => {
			console.log({ statusResponse: txStatus });
		},
	});

	for (const txId of txIds) {
		clientRequest.sendTransactionRequest(
			{
				transactionId: txId,
				clientUrl,
				getFinalStatus: true,
			},
			function (err, response) {
				console.log({ requestResponse: response });
			}
		);
	}
})();
