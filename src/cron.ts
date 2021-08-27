import { CronJob } from "cron";
import { getTransactionFromNetwork } from "./request";
import {
	getBlockValidationKey,
	getCleanupKey,
	getTimeValidationKey,
	getTxDataKey,
	getTxStatusKey,
	ioredis,
} from "./redis";
import { NETWORK, REDIS_PREFIX } from "./config";
import { collectionNames, db } from "./mongo";
import { TransactionStatus } from "./interfaces";

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

const jobValidateBlock = new CronJob(
	"0-59/10 * * * * *",
	async function () {
		try {
			console.log("job validate block");
			const key = getBlockValidationKey();
			const value = await ioredis.hkeys(key);

			if (value && value.length) {
				for (const transactionId of value) {
					if (await validateBlockIfFound(transactionId)) {
						const transactionStatus = await ioredis.hget(
							key,
							transactionId
						);
						handleSuccessfulBlockValidation({
							transactionStatus,
							transactionId,
						});
					}
				}
			}
		} catch (e) {
			throw e;
		}
	},
	null,
	true
);

const handleSuccessfulBlockValidation = async (txData: {
	transactionId: string;
	transactionStatus: string;
}) => {
	// Finalize transaction status
	const { transactionStatus, transactionId } = txData;
	const keyStatus = getTxStatusKey(transactionId);
	let valueStatus = "";
	switch (transactionStatus) {
		case TransactionStatus.WaitingSuccess:
			valueStatus = TransactionStatus.Success;
			break;
		case TransactionStatus.WaitingFail:
			valueStatus = TransactionStatus.Fail;
			break;
	}
	await ioredis.set(keyStatus, valueStatus);

	// Remove cronjob
	const key = getBlockValidationKey();
	await ioredis.hdel(key, transactionId);

	// TODO: write gRPC call to send back transaction status
	console.log({
		transactionStatus: valueStatus,
		transactionId,
		message: "validate block success",
	});
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
		console.log({ dateLimit, currentDate });

		if (dateLimit >= currentDate) {
			await getTransactionFromNetwork(transactionId);
			const keyStatus = getTxStatusKey(transactionId);
			const valueStatus = await ioredis.get(keyStatus);

			switch (valueStatus) {
				case TransactionStatus.Waiting:
					console.log("Still waiting. Nothing changed!");
					break;
				case TransactionStatus.WaitingFail:
				case TransactionStatus.WaitingSuccess:
					// remove cronjob
					const keyTimeValidation = getTimeValidationKey();
					await ioredis.hdel(keyTimeValidation, transactionId);

					// Setup block validation for this transactionId
					const key = getBlockValidationKey();
					await ioredis.hset(key, transactionId, valueStatus);
					break;
			}
		} else {
			await handleTransactionNotFound(transactionId);
		}
	} catch (e) {
		throw e;
	}
};

const jobValidateTime = new CronJob(
	"0-59/20 * * * * *",
	async function () {
		try {
			console.log("job validate time");
			const key = getTimeValidationKey();
			const value = await ioredis.hkeys(key);

			if (value && value.length) {
				for (const transactionId of value) {
					validateTimeIfNotFound(transactionId);
				}
			}
		} catch (e) {
			throw e;
		}
	},
	null,
	true
);

const handleTransactionNotFound = async (transactionId: string) => {
	const key = getTxStatusKey(transactionId);
	const value = TransactionStatus.NotFound;
	await ioredis.set(key, value);

	// remove cronjob
	const keyTimeValidation = getTimeValidationKey();
	await ioredis.hdel(keyTimeValidation, transactionId);

	// TODO: write gRPC call to send back transaction status
	console.log({ transactionStatus: value, transactionId });
};

const jobCleanup = new CronJob(
	"25 * * * * *",
	async function () {
		try {
			console.log("job cleanup");
			const currentDate = new Date();
			const key = getCleanupKey();
			const value = await ioredis.hkeys(key);

			if (value && value.length) {
				for (const transactionId of value) {
					const expiredAt = new Date(
						JSON.parse(await ioredis.hget(key, transactionId))
					);
					if (expiredAt < currentDate) {
						// Clean redis tx data
						const keyData = await getTxDataKey(transactionId);
						ioredis.del(keyData);

						// Clean redis tx status
						const keyStatus = await getTxStatusKey(transactionId);
						ioredis.del(keyStatus);

						// Clean redis tx block validation
						const keyBlockValidation =
							await getBlockValidationKey();
						ioredis.hdel(keyBlockValidation, transactionId);

						// Clean redis tx time validation
						const keyTimeValidation = await getTimeValidationKey();
						ioredis.hdel(keyTimeValidation, transactionId);

						// Clean redis tx cleanup
						ioredis.hdel(key, transactionId);

						// Clean mongo tx request
						db.collection(
							collectionNames.transaction_requests
						).findOneAndDelete({ transactionId });
					}
				}
			}
		} catch (e) {
			throw e;
		}
	},
	null,
	true
);

export {
	validateBlockIfFound,
	jobValidateBlock,
	handleSuccessfulBlockValidation,
	validateTimeIfNotFound,
	jobValidateTime,
	handleTransactionNotFound,
	jobCleanup,
};
