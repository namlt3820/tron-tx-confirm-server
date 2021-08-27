// @ts-nocheck
import { connectMongoDB, addTransactionRequestToMongo } from "./mongo";
import { connectIoRedis } from "./redis";
import { getTransactionStatusFromRedis } from "./request";
import { startKafkaConsumer } from "./kafka";
import { KAFKA_BROKER } from "./config";
import { initTronWeb } from "./tronweb";
import { v4 as uuidv4 } from "uuid";
import { jobValidateTime, jobValidateBlock, jobCleanup } from "./cron";

const txId = "300d0238c2cb5398ef725f05eb85efda74ad83697a60ed63a8c5586af8101a73";

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

		// request transaction status
		await addTransactionRequestToMongo({
			transactionId: txId,
			options: {
				blockValidationIfFound: 10,
				timeValidationIfNotFound: 180,
				timeRetryIfNotResponse: 400,
				responseUrl: "",
			},
		});
		await getTransactionStatusFromRedis(txId);
		return;
	} catch (e) {
		throw e;
	}
};

start();
