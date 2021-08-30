// @ts-nocheck
import { connectMongoDB, addTxRequestToMongo } from "./mongo";
import { connectIoRedis } from "./redis";
import { getTransactionStatusFromRedis } from "./request";
import { startKafkaConsumer } from "./kafka";
import {
	KAFKA_BROKER,
	GRPC_TX_STATUS_HOST,
	GRPC_TX_REQUEST_HOST,
} from "./config";
import { initTronWeb } from "./tronweb";
import { v4 as uuidv4 } from "uuid";
import { jobValidateTime, jobValidateBlock, jobCleanup } from "./cron";
import {
	clientRequest,
	startClientRequest,
	startClientStatus,
	startServerRequest,
} from "./grpc";

const txId = "95ae0575c3ab32509d7404bdc2b02ce815cdd857ab7bf8fb772d1f0e5f205f48";

const start = async () => {
	try {
		// setup dependencies
		await Promise.all([connectIoRedis(), connectMongoDB(), initTronWeb()]);
		await Promise.all([
			startKafkaConsumer([KAFKA_BROKER as string], "tcs-" + uuidv4()),
		]);

		// setup cron jobs
		jobValidateBlock.start();
		jobValidateTime.start();
		jobCleanup.start();

		//gRPC
		startServerRequest(GRPC_TX_REQUEST_HOST);
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
		throw e;
	}
};

start();
