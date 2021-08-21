import { startKafkaConsumer } from "./kafka";
import { KAFKA_BROKER, KAFKA_GROUP_ID } from "./config";
import { connectMongoDB } from "./mongo";
import { connectIoRedis } from "./redis";
import { Sentry, initSentry } from "./sentry";
import "./tronweb";

const start = async () => {
	try {
		await Promise.all([connectIoRedis(), connectMongoDB(), initSentry()]);

		await Promise.all([
			startKafkaConsumer(
				[KAFKA_BROKER as string],
				KAFKA_GROUP_ID as string
			),
		]);
	} catch (e) {
		Sentry.captureException(e);
		throw e;
	}
};

start();
