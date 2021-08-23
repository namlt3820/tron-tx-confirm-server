// @ts-nocheck
import { connectMongoDB, addTransactionRequestToMongo } from "./mongo";
import { connectIoRedis } from "./redis";
import { getTransactionStatusFromRedis } from "./request";
import { startKafkaConsumer } from "./kafka";
import { KAFKA_BROKER } from "./config";
import { initTronWeb } from "./tronweb";
import { v4 as uuidv4 } from "uuid";
import { jobValidateTime, jobValidateBlock } from "./cron";

const txId = "5f569587ca8963449210f02d30c7571f37156d0cc8cc9239be95325ddf83bf2f";

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

		// request transaction status
		await addTransactionRequestToMongo({
			transactionId: txId,
			options: {
				blockValidationIfFound: 5,
				timeValidationIfNotFound: 120,
				timeRetryIfNotResponse: 600,
				responseUrl: "",
			},
		}),
			await getTransactionStatusFromRedis(txId);
		return;
	} catch (e) {
		throw e;
	}
};

start();
