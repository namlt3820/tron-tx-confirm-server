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

const txId = "7f0d86143e50d603b3bf3402fbb6574139e1436429c0bf1aa43d79658d0c46ba";

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
					timeValidationIfNotFound: 180,
					blockValidationIfFound: 10,
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
