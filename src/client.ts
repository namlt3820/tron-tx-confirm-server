import { startClientRequest, startClientStatus } from "./grpc";
import { IClientParams } from "./interfaces";

const startClient = async (opts: IClientParams) => {
	try {
		const { clientUrl, serverUrl, statusCallback } = opts;
		const clientRequest = startClientRequest(serverUrl);
		if (statusCallback) {
			startClientStatus(clientUrl, statusCallback);
		}

		return clientRequest;
	} catch (e) {
		console.log({ clientError: e });
	}
};

export { startClient };
