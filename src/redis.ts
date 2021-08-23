import Redis from "ioredis";
import { REDIS_HOST, REDIS_PORT, REDIS_PREFIX, NETWORK } from "./config";
import IORedis from "ioredis";
import { IBlock, ITransaction, TransactionStatus } from "./interfaces";

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

const addBlockEventToRedis = async (block: IBlock) => {
	const { blockNumber } = block;
	if (!blockNumber || !Number.isInteger(blockNumber) || blockNumber < 0)
		throw new Error(`invalid blockNumber`);

	const key = getLatestBlockKey();
	const value = `${blockNumber}`;

	try {
		await ioredis.set(key, value);
		// console.log({ message: `add latest block ${blockNumber}` });
	} catch (e) {
		throw e;
	}
};

const addTransactionEventToRedis = async (transaction: ITransaction) => {
	const { transactionId, result, blockNumber } = transaction;
	if (!transactionId) throw new Error(`invalid transactionId`);

	const keyData = getTxDataKey(transactionId);
	const valueData = `${result}_${blockNumber.toString()}`;
	const keyStatus = getTxStatusKey(transactionId);
	let valueStatus = "";

	// Consider block validation
	switch (result) {
		case TransactionStatus.Success:
			valueStatus = TransactionStatus.WaitingSuccess;
			break;
		case TransactionStatus.Fail:
			valueStatus = TransactionStatus.WaitingFail;
			break;
		default:
			valueStatus = TransactionStatus.Waiting;
	}

	// Add transaction data and status to Redis
	try {
		await Promise.all([
			ioredis.set(keyData, valueData),
			ioredis.set(keyStatus, valueStatus),
		]);
		console.log({
			message: `add transaction to redis`,
			transactionId,
			transactionStatus: valueStatus,
			blockNumber,
		});
	} catch (e) {
		throw e;
	}
};

export {
	connectIoRedis,
	ioredis,
	getTxDataKey,
	getTxStatusKey,
	getLatestBlockKey,
	getBlockValidationKey,
	getTimeValidationKey,
	addBlockEventToRedis,
	addTransactionEventToRedis,
};
