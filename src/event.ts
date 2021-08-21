import { NETWORK, REDIS_PREFIX } from "./config";
import {
	IBlock,
	ITransaction,
	ITransactionRequest,
	ITronWebGetTxInfo,
	TransactionStatus,
} from "./interfaces";
import {
	getBlockValidationKey,
	getLatestBlockKey,
	getTimeValidationKey,
	getTxDataKey,
	getTxStatusKey,
	ioredis,
} from "./redis";
import { client, collectionNames, db } from "./mongo";
import { tronWeb } from "./tronweb";

declare global {
	interface Date {
		addDays(days: number): Date;
	}
}

Date.prototype.addDays = function (days) {
	var date = new Date(this.valueOf());
	date.setDate(date.getDate() + days);
	return date;
};

const addBlockEventToRedis = async (block: IBlock) => {
	const { blockNumber } = block;
	if (!blockNumber || !Number.isInteger(blockNumber) || blockNumber < 0)
		throw new Error(`invalid blockNumber`);

	const key = getLatestBlockKey();
	const value = `${blockNumber}`;

	try {
		const response = await ioredis.set(key, value);
		console.log({ response, message: `add latest block ${blockNumber}` });
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

	// Consider block validation
	const valueStatus =
		result === TransactionStatus.Success
			? TransactionStatus.WaitingSuccess
			: TransactionStatus.WaitingFail;

	// Add transaction data and status to Redis
	try {
		await Promise.all([
			ioredis.set(keyData, valueData),
			ioredis.set(keyStatus, valueStatus),
		]);
		console.log({ message: `add transaction ${transactionId}` });
	} catch (e) {
		throw e;
	}
};

const addTransactionRequestToMongo = async (request: ITransactionRequest) => {
	const session = client.startSession();
	session.startTransaction();

	try {
		const { transactionId } = request;

		const foundRequest = await db
			.collection(collectionNames.transaction_requests)
			.findOne({ transactionId });

		if (foundRequest) throw new Error(`transaction request is existed`);

		const createdAt = new Date();

		const { ops } = await db
			.collection(collectionNames.transaction_requests)
			.insertOne(
				{
					createdAt,
					...request,
				},
				{ session }
			);

		await session.commitTransaction();

		return ops[0];
	} catch (e) {
		if (session.inTransaction()) await session.abortTransaction();
		throw e;
	} finally {
		await session.endSession();
	}
};

const getTransactionStatusFromRedis = async (transactionId: string) => {
	const keyStatus = getTxStatusKey(transactionId);

	try {
		const valueStatus = await ioredis.get(keyStatus);
		if (valueStatus) {
			await processTransactionStatus(valueStatus, transactionId);
			return;
		} else {
			await getTransactionFromNetwork(transactionId);
			const valueStatus = await ioredis.get(keyStatus);
			if (valueStatus) {
				await processTransactionStatus(valueStatus, transactionId);
				return;
			}
		}
	} catch (e) {
		throw e;
	}
};

const getTransactionFromNetwork = async (
	transactionId: string
): Promise<string> => {
	try {
		const response = await tronWeb.trx.getTransactionInfo(transactionId);
		console.log(response);
		let result = "";
		// No response or unconfirmed transaction
		if (!response || Object.keys(response).length === 0) {
			result = TransactionStatus.Waiting;
			// Setup time validation
			const key = getTimeValidationKey();
			await ioredis.hset(key, transactionId, result);
		} else {
			// Confirmed transaction
			const txResult = (response as ITronWebGetTxInfo).receipt?.result;
			if (!txResult) {
				// TRC10/TRX Confirmed Success
				result = TransactionStatus.Success;
			} else {
				// Trigger Smart Contract Confirmed Success / Failed
				result =
					txResult === TransactionStatus.Success
						? TransactionStatus.Success
						: TransactionStatus.Fail;
			}

			const txToRedis: ITransaction = {
				transactionId: transactionId,
				blockNumber: response.blockNumber,
				result: result,
			};

			await addTransactionEventToRedis(txToRedis);
			return result;
		}
	} catch (e) {
		throw e;
	}
};

const validateBlockIfFound = async (
	transactionId: string
): Promise<boolean> => {
	try {
		// Get transaction block number from redis
		const key = `${REDIS_PREFIX}.${NETWORK}.transaction_data.${transactionId}`;
		const value = await ioredis.get(key);

		if (!value) throw new Error("transaction data not found");

		const [_, txBlockNumber] = value.split("_");

		// Get blockValidation if found
		const foundRequest = await db
			.collection(collectionNames.transaction_requests)
			.findOne({ transactionId });

		if (!foundRequest) throw new Error("transaction request not found");

		const {
			options: { blockValidationIfFound },
		} = foundRequest;

		// Get current / latest block number from redis
		const keyBlock = `${REDIS_PREFIX}.${NETWORK}.latest_block`;
		const currentBlockNumber = await ioredis.get(keyBlock);

		// Return comparison
		return (
			Number(currentBlockNumber) - Number(txBlockNumber) >=
			blockValidationIfFound
		);
	} catch (e) {
		throw e;
	}
};

const validateTimeIfNotFound = async (transactionId: string) => {
	try {
		// Get time validation if not found
		const foundRequest = await db
			.collection(collectionNames.transaction_requests)
			.findOne({ transactionId });

		if (!foundRequest) throw new Error("transaction request not found");

		const {
			options: { timeValidationIfNotFound },
			createdAt,
		} = foundRequest;

		// Compare to current time
		const dateLimit = new Date(
			new Date(createdAt).getTime() + timeValidationIfNotFound * 1000
		);
		const currentDate = new Date();

		if (dateLimit >= currentDate) {
			await getTransactionFromNetwork(transactionId);
			const keyStatus = getTxStatusKey(transactionId);
			const valueStatus = await ioredis.get(keyStatus);

			if (valueStatus !== TransactionStatus.Waiting) {
				// remove cronjob
				const keyTimeValidation = getTimeValidationKey();
				await ioredis.hdel(keyTimeValidation, transactionId);

				// Setup block validation for this transactionId
				const key = getBlockValidationKey();
				await ioredis.hset(key, transactionId, valueStatus);
				return;
			}
		} else {
			// transaction is considered not found
			const key = getTxStatusKey(transactionId);
			const value = TransactionStatus.NotFound;
			await ioredis.set(key, value);

			// remove cronjob
			const keyTimeValidation = getTimeValidationKey();
			await ioredis.hdel(keyTimeValidation, transactionId);

			// TODO: write gRPC call to send back transaction status
			console.log({ transactionStatus: value, transactionId });
		}
	} catch (e) {
		throw e;
	}
};

const processTransactionStatus = async (
	transactionStatus: string,
	transactionId: string
) => {
	if (transactionStatus === TransactionStatus.Waiting) {
		// Setup time validation
		const key = getTimeValidationKey();
		await ioredis.hset(key, transactionId, transactionStatus);
		return;
	} else {
		// transactionStatus should be SUCCESS or FAILED and it only needs block validation
		if (await validateBlockIfFound(transactionId)) {
			// TODO: write gRPC call to send back transaction status
			console.log({ transactionStatus, transactionId });
		} else {
			// Setup block validation for this transactionId
			const key = getBlockValidationKey();
			await ioredis.hset(key, transactionId, transactionStatus);
			return;
		}
	}
};

export {
	addBlockEventToRedis,
	addTransactionEventToRedis,
	validateBlockIfFound,
	validateTimeIfNotFound,
	addTransactionRequestToMongo,
	getTransactionFromNetwork,
	getTransactionStatusFromRedis,
};
