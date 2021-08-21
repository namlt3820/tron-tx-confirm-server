import { config } from "dotenv";
import { TronEvent } from "./interfaces";

config();

let {
	NODE_ENV,
	SENTRY_DNS,
	KAFKA_BROKER,
	KAFKA_GROUP_ID,
	MONGO_URI,
	REDIS_HOST,
	REDIS_PORT,
	REDIS_PREFIX,
	NETWORK,
	TIME_VALIDATION,
	TIME_RETRY_IF_NOT_RESPONSE,
	TRON_WEB_PRIVATE_KEY,
	MONGO_REQUEST_TTL,
} = process.env;

[
	"NODE_ENV",
	"SENTRY_DNS",
	"KAFKA_BROKER",
	"KAFKA_GROUP_ID",
	"MONGO_URI",
	"REDIS_HOST",
	"REDIS_PORT",
	"NETWORK",
	"TIME_VALIDATION",
	"TIME_RETRY_IF_NOT_RESPONSE",
	"TRON_WEB_PRIVATE_KEY",
	"MONGO_REQUEST_TTL",
].forEach((el) => {
	if (!process.env[el]) {
		throw new Error(`${el} is required`);
	}
});

const KAFKA_TOPICS = {
	block: TronEvent.Block,
	transaction: TronEvent.Transaction,
};

export {
	NODE_ENV,
	SENTRY_DNS,
	KAFKA_BROKER,
	KAFKA_GROUP_ID,
	KAFKA_TOPICS,
	MONGO_URI,
	REDIS_HOST,
	REDIS_PORT,
	REDIS_PREFIX,
	NETWORK,
	TIME_VALIDATION,
	TIME_RETRY_IF_NOT_RESPONSE,
	TRON_WEB_PRIVATE_KEY,
	MONGO_REQUEST_TTL,
};
