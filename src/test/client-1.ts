import { startClient } from "../index";

const txIds = [
	"b68c6dca547736bfd1a3c139287a90ef904ba12ed301fbc49f1a5a783c5f7ff3",
	"c05903ccd68d94cdc95d43da7241b71b1f7e1a2cedad42baf5d9aba8e94f8b65",
	"4a80109520fba6fa9b1294b08a719e7bfe064ede60ca501c0e96f9c8ec80f38d",
];
const clientUrl = "localhost:50001";

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
