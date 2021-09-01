import { connectMongoDB } from "./mongo";
import { connectIoRedis } from "./redis";
import { startKafkaConsumer } from "./kafka";
import { SERVER_URL, KAFKA_BROKER } from "./config";
import { initTronWeb } from "./tronweb";
import { v4 as uuidv4 } from "uuid";
import { jobCleanup, jobValidateBlock, jobValidateTime } from "./cron";
import { startServerRequest } from "../grpc/grpc-server";

const startServer = async () => {
	try {
		// setup dependencies
		await Promise.all([connectIoRedis(), connectMongoDB(), initTronWeb()]);
		await Promise.all([
			startKafkaConsumer([KAFKA_BROKER as string], "tcs-" + uuidv4()),
		]);

		//setup cron jobs
		jobValidateBlock.start();
		jobValidateTime.start();
		jobCleanup.start();

		//gRPC
		startServerRequest(SERVER_URL);
	} catch (e) {
		console.log(e);
	}
};

export { startServer };
