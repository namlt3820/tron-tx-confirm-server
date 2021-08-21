import { connect, Db, IndexSpecification, MongoClient } from "mongodb";
import { MONGO_URI, NETWORK, MONGO_REQUEST_TTL } from "./config";

let client: MongoClient;
let db: Db;

const collectionNames = {
	transaction_requests: `${NETWORK}_transaction_requests`,
};

const TransactionRequestIndexes: IndexSpecification[] = [
	{ key: { transactionId: 1 }, unique: true },
	{ key: { createdAt: 1 }, expireAfterSeconds: Number(MONGO_REQUEST_TTL) },
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

export { client, db, connectMongoDB, collectionNames };
