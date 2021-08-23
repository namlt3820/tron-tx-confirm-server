import { startKafkaConsumer } from "./kafka";
import { KAFKA_BROKER } from "./config";
import { connectMongoDB } from "./mongo";
import { connectIoRedis } from "./redis";
import { Sentry, initSentry } from "./sentry";
import { v4 as uuidv4 } from "uuid";
import "./tronweb";

const start = async () => {
	try {
		await Promise.all([connectIoRedis(), connectMongoDB(), initSentry()]);

		await Promise.all([
			startKafkaConsumer([KAFKA_BROKER as string], "tcs-" + uuidv4()),
		]);
	} catch (e) {
		Sentry.captureException(e);
		throw e;
	}
};

start();
