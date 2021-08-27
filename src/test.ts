// @ts-nocheck
import { connectMongoDB, addTransactionRequestToMongo } from "./mongo";
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
	serverRequest,
	startServerRequest,
} from "./grpc";

const txId = "6287d41dcdec1ebf3df1347638a0e707591cc6beb2bc0c0f43a666ff8b1485f3";

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

		clientRequest.sendTransactionRequest(
			{
				transactionId: txId,
				options: {
					responseUrl: "client-url",
					timeRetryIfNotResponse: 1000,
					timeValidationIfNotFound: 180,
					blockValidationIfFound: 100,
				},
			},
			function (err, response) {
				console.log({ response });
			}
		);
		return;
	} catch (e) {
		throw e;
	}
};

start();
