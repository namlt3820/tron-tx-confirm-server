import Redis from "ioredis";
import { REDIS_HOST, REDIS_PORT, REDIS_PREFIX, NETWORK } from "./config";
import IORedis from "ioredis";

let ioredis: IORedis.Redis;

const connectIoRedis = () => {
	ioredis = new Redis({
		port: Number(REDIS_PORT),
		host: REDIS_HOST,
		retryStrategy: (times) => {
			const delay = Math.min(times * 50, 2000);
			return delay;
		},
	});
	console.log(`🚀 ioredis: connected, prefix ${REDIS_PREFIX}`);
};

const getTxDataKey = (transactionId: string): string =>
	`${REDIS_PREFIX}.${NETWORK}.transaction_data.${transactionId}`;

const getTxStatusKey = (transactionId: string): string =>
	`${REDIS_PREFIX}.${NETWORK}.transaction_status.${transactionId}`;

const getLatestBlockKey = () => `${REDIS_PREFIX}.${NETWORK}.latest_block`;

const getBlockValidationKey = () =>
	`${REDIS_PREFIX}.${NETWORK}.block_validations`;

const getTimeValidationKey = () =>
	`${REDIS_PREFIX}.${NETWORK}.time_validations`;

export {
	connectIoRedis,
	ioredis,
	getTxDataKey,
	getTxStatusKey,
	getLatestBlockKey,
	getBlockValidationKey,
	getTimeValidationKey,
};
