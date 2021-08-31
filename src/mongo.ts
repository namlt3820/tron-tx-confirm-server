import { connect, Db, MongoClient } from "mongodb";
import { MONGO_URI, NETWORK } from "./config";
import { ITxRequest } from "./interfaces";

let client: MongoClient;
let db: Db;

const collectionNames = {
	transaction_requests: `${NETWORK}_transaction_requests`,
};

const TransactionRequestIndexes = {
	transactionId: 1,
	clientUrl: 1,
};

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
				.createIndex(TransactionRequestIndexes),
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

		// Insert request to Mongo
		const createdAt = new Date();

		await db.collection(collectionNames.transaction_requests).updateOne(
			{ transactionId, clientUrl },
			{
				$set: { createdAt, ...request },
			},
			{ session, upsert: true }
		);

		await session.commitTransaction();
	} catch (e) {
		if (session.inTransaction()) await session.abortTransaction();
		throw e;
	} finally {
		await session.endSession();
	}
};

const getTxRequestsFromMongo = async (transactionId: string) => {
	const foundRequests = await db
		.collection<ITxRequest>(collectionNames.transaction_requests)
		.find({ transactionId });

	return foundRequests;
};

export {
	client,
	db,
	connectMongoDB,
	collectionNames,
	addTxRequestToMongo,
	getTxRequestsFromMongo,
};
