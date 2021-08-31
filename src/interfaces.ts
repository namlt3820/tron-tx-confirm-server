export interface IBlock {
	blockNumber: number;
}

export interface ITransaction {
	transactionId: string;
	result: string;
	blockNumber: number;
}

export interface ITxRequest {
	transactionId: string;
	clientUrl: string;
	getFinalStatus?: boolean;
	createdAt?: Date;
}

export interface ITransactionStatus {
	transactionId: string;
	transactionStatus: string;
	error?: string;
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

export type ClientCallback = (tx: ITransactionStatus) => void;

export interface IClientParams {
	clientUrl: string;
	serverUrl: string;
	statusCallback?: ClientCallback;
}
