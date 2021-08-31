import {
	ITransaction,
	ITronWebGetTxInfo,
	TransactionStatus,
} from "./interfaces";
import {
	getBlockValidationKey,
	getTimeValidationKey,
	getTxStatusKey,
	ioredis,
	addTransactionEventToRedis,
} from "./redis";
import { tronWeb } from "./tronweb";
import { validateBlockIfFound, handleSuccessfulBlockValidation } from "./cron";

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

const getTransactionStatusFromRedis = async (transactionId: string) => {
	const keyStatus = getTxStatusKey(transactionId);

	try {
		let valueStatus = await ioredis.get(keyStatus);
		if (valueStatus) {
			await processTransactionFromRedis({
				transactionStatus: valueStatus,
				transactionId,
			});
		} else {
			await getTransactionFromNetwork(transactionId);
			valueStatus = await ioredis.get(keyStatus);
			if (valueStatus) {
				await processTransactionFromRedis({
					transactionStatus: valueStatus,
					transactionId,
				});
			}
		}
		return valueStatus;
	} catch (e) {
		throw e;
	}
};

const getTransactionFromNetwork = async (
	transactionId: string
): Promise<string> => {
	try {
		const response = await tronWeb.trx.getTransactionInfo(transactionId);
		// @ts-ignore
		let result = "",
			blockNumber = 0;
		// No response or unconfirmed transaction or error
		if (!response || Object.keys(response).length === 0 || response.Error) {
			result = TransactionStatus.Waiting;
		} else {
			// Confirmed transaction
			blockNumber = response.blockNumber;
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
		}
		const txToRedis: ITransaction = {
			transactionId: transactionId,
			blockNumber: blockNumber,
			result: result,
		};

		await addTransactionEventToRedis(txToRedis);
		return result;
	} catch (e) {
		throw e;
	}
};

const processTransactionFromRedis = async (txData: {
	transactionStatus: string;
	transactionId: string;
}) => {
	const { transactionStatus, transactionId } = txData;
	switch (transactionStatus) {
		case TransactionStatus.Waiting:
			// Setup time validation
			const key = getTimeValidationKey();
			await ioredis.hset(key, transactionId, transactionStatus);
			break;
		case TransactionStatus.WaitingFail:
		case TransactionStatus.WaitingSuccess:
			if (await validateBlockIfFound(transactionId)) {
				handleSuccessfulBlockValidation(txData);
			} else {
				// Setup block validation for this transactionId
				const key = getBlockValidationKey();
				await ioredis.hset(key, transactionId, transactionStatus);
				console.log({
					message: "setup block validation",
					transactionId,
					transactionStatus,
				});
			}
			break;
		case TransactionStatus.Fail:
		case TransactionStatus.Success:
			return;
	}
};

export { getTransactionFromNetwork, getTransactionStatusFromRedis };
