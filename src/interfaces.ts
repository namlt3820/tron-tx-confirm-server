export interface IBlock {
	blockNumber: number;
}

export interface ITransaction {
	transactionId: string;
	result: string;
	blockNumber: number;
}

export interface ITransactionRequest {
	transactionId: string;
	options: {
		blockValidationIfFound: number;
		timeValidationIfNotFound: number;
		timeRetryIfNotResponse?: number;
		responseUrl: string;
	};
}

export enum TronEvent {
	Block = "block",
	Transaction = "transaction",
}

export enum TransactionStatus {
	Success = "SUCCESS",
	Fail = "FAIL",
	WaitingSuccess = "WAITING SUCCESS",
	WaitingFail = "WAITING FAIL",
	NotFound = "NOT FOUND",
	Waiting = "WAITING",
}

export interface ITronWebGetTxInfo {
	receipt?: {
		result?: string;
	};
}
