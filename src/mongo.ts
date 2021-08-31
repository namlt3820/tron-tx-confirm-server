import { connect, Db, IndexSpecification, MongoClient } from "mongodb";
import { MONGO_URI, NETWORK } from "./config";
import { ITxRequest } from "./interfaces";

let client: MongoClient;
let db: Db;

const collectionNames = {
	transaction_requests: `${NETWORK}_transaction_requests`,
};

const TransactionRequestIndexes: IndexSpecification[] = [
	{ key: { transactionId: 1 }, unique: true },
];

const connectMongoDB = async () => {
	console.log(MONGO_URI);
	try {
		client = await connect(MONGO_URI as string, {
			useUnifiedTopology: true,
			useNewUrlParser: true,
			ignoreUndefined: true,
		});

		client.on("error", async (e) => {
			try {
				await client.close();
				await connectMongoDB();
			} catch (e) {
				setTimeout(connectMongoDB, 1000);
				throw e;
			}
		});

		client.on("timeout", async () => {
			try {
				await client.close();
				await connectMongoDB();
			} catch (e) {
				setTimeout(connectMongoDB, 1000);
				throw e;
			}
		});

		client.on("close", async () => {
			try {
				await connectMongoDB();
			} catch (e) {
				throw e;
			}
		});

		db = client.db("tcs");

		await Promise.all([
			db
				.collection(collectionNames.transaction_requests)
				.createIndexes(TransactionRequestIndexes),
		]);

		console.log(`Mongodb: connected`);
	} catch (e) {
		console.error(`Mongodb: disconnected`);
		await client?.close(true);
		setTimeout(connectMongoDB, 1000);
		throw e;
	}
};

const addTxRequestToMongo = async (request: ITxRequest) => {
	const session = client.startSession();
	session.startTransaction();

	try {
		let { transactionId, clientUrl, getFinalStatus } = request;

		// Validate request
		if (!transactionId) {
			throw new Error("transactionId is required");
		}
		if (!clientUrl) {
			throw new Error("clientUrl is required");
		}
		if (!getFinalStatus) {
			getFinalStatus = false;
		}

		const foundRequest = await db
			.collection(collectionNames.transaction_requests)
			.findOne({ transactionId });

		if (foundRequest) {
			// TODO: gRPC response
			console.log("The request is already received");
			return;
		}

		// Insert request to Mongo
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

const getTxRequestFromMongo = async (transactionId: string) => {
	const foundRequest = await db
		.collection(collectionNames.transaction_requests)
		.findOne({ transactionId });

	if (!foundRequest) throw new Error("transaction request not found");

	return foundRequest;
};

export {
	client,
	db,
	connectMongoDB,
	collectionNames,
	addTxRequestToMongo,
	getTxRequestFromMongo,
};
