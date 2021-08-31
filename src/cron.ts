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
import {
	BLOCK_VALIDATION_LIMIT,
	NETWORK,
	REDIS_PREFIX,
	TIME_VALIDATION_LIMIT,
} from "./config";
import { collectionNames, db, getTxRequestFromMongo } from "./mongo";
import { ITransactionStatus, TransactionStatus } from "./interfaces";
import { startServerStatus } from "./grpc";

const validateBlockIfFound = async (
	transactionId: string
): Promise<boolean> => {
	try {
		// Get transaction block number from redis
		const key = `${REDIS_PREFIX}.${NETWORK}.transaction_data.${transactionId}`;
		const value = await ioredis.get(key);

		if (!value) throw new Error("transaction data not found");

		const [_, txBlockNumber] = value.split("_");

		// Get current / latest block number from redis
		const keyBlock = `${REDIS_PREFIX}.${NETWORK}.latest_block`;
		const currentBlockNumber = await ioredis.get(keyBlock);

		// Return comparison
		return (
			Number(currentBlockNumber) - Number(txBlockNumber) >=
			Number(BLOCK_VALIDATION_LIMIT)
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
	false
);

const handleSuccessfulBlockValidation = async (txData: ITransactionStatus) => {
	try {
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

		// Get client url
		const { clientUrl } = await getTxRequestFromMongo(transactionId);

		startServerStatus(clientUrl, {
			transactionId,
			transactionStatus: valueStatus,
		});
	} catch (e) {
		console.log(e);
	}
};

const validateTimeIfNotFound = async (transactionId: string) => {
	try {
		// Get time validation if not found
		const { createdAt } = await getTxRequestFromMongo(transactionId);

		// Compare to current time
		const dateLimit = new Date(
			new Date(createdAt).getTime() + Number(TIME_VALIDATION_LIMIT) * 1000
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
	false
);

const handleTransactionNotFound = async (transactionId: string) => {
	try {
		const key = getTxStatusKey(transactionId);
		const value = TransactionStatus.NotFound;
		await ioredis.set(key, value);

		// remove cronjob
		const keyTimeValidation = getTimeValidationKey();
		await ioredis.hdel(keyTimeValidation, transactionId);

		// Get client url
		const { clientUrl } = await getTxRequestFromMongo(transactionId);

		startServerStatus(clientUrl, {
			transactionId,
			transactionStatus: value,
		});
	} catch (e) {
		console.log(e);
	}
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
	false
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
