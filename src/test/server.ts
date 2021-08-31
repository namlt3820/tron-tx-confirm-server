// @ts-nocheck
import { connectMongoDB } from "../mongo";
import { connectIoRedis } from "../redis";
import { startKafkaConsumer } from "../kafka";
import { KAFKA_BROKER, GRPC_TX_REQUEST_HOST } from "../config";
import { initTronWeb } from "../tronweb";
import { v4 as uuidv4 } from "uuid";
import { jobValidateTime, jobValidateBlock, jobCleanup } from "../cron";
import { startServerRequest } from "../grpc";

const start = async () => {
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
		startServerRequest(GRPC_TX_REQUEST_HOST);
		return;
	} catch (e) {
		throw e;
	}
};

start();
