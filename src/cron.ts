import { CronJob } from "cron";
import { validateBlockIfFound, validateTimeIfNotFound } from "./event";
import {
	getBlockValidationKey,
	getTimeValidationKey,
	getTxStatusKey,
	ioredis,
} from "./redis";

const jobValidateBlock = new CronJob(
	"0 * * * * *",
	async function () {
		try {
			const key = getBlockValidationKey();
			const value = await ioredis.hkeys(key);

			if (value && value.length) {
				for (const transactionId of value) {
					if (await validateBlockIfFound(transactionId)) {
						// Set new transaction status
						const oldTxStatus = await ioredis.hget(
							key,
							transactionId
						);
						const newTxStatus = oldTxStatus.split(" ")[1];
						const keyStatus = getTxStatusKey(transactionId);
						await ioredis.set(keyStatus, newTxStatus);

						// Remove cronjob
						await ioredis.hdel(key, transactionId);

						// TODO: write gRPC call to send back transaction status
						console.log({
							transactionStatus: newTxStatus,
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

jobValidateBlock.start();

const jobValidateTime = new CronJob(
	"0 * * * * *",
	async function () {
		try {
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

jobValidateTime.start();
