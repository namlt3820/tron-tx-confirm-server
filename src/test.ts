import { connectMongoDB } from "./mongo";
import { connectIoRedis } from "./redis";
import { getTransactionFromNetwork } from "./event";
import "./tronweb";

/*
 * Tested API:
 * getTxStatusKey
 * addTransactionRequestToMongo
 * addTransactionEventToRedis
 * addBlockEventToRedis
 * */

const start = async () => {
	try {
		await Promise.all([connectIoRedis(), connectMongoDB()]);
		await Promise.all([
			getTransactionFromNetwork(
				"6a8d362b7f6e01fe61007d3f707119821904effc6c306104fe836f16a99d4845"
			),
			// getTransactionFromNetwork(
			// 	"bcf6c91ac7fbc3224b10d2c2aacd41e9d00189a284fa5d8206eeb4c66063f3c7"
			// ),
			// getTransactionFromNetwork(""),
		]);
		console.log("done");
		return;
	} catch (e) {
		throw e;
	}
};

start();
