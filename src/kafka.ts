import { EachMessagePayload, Kafka, Consumer } from "kafkajs";
import { KAFKA_TOPICS } from "./config";
import { Sentry } from "./sentry";
import { addBlockEventToRedis, addTransactionEventToRedis } from "./redis";
import { TronEvent } from "./interfaces";

const _getTronKafka = (brokers: string[]) =>
	new Kafka({
		brokers: brokers,
		ssl: false,
		sasl: undefined,
		connectionTimeout: 5000,
		requestTimeout: 60000,
	});

const _getKafkaConsumer = (groupId: string, tronKafka: Kafka) =>
	tronKafka.consumer({ groupId: groupId, allowAutoTopicCreation: true });

const _connectKafkaConsumer = async (kafkaConsumer: Consumer) => {
	try {
		await kafkaConsumer.connect();

		console.log(`kafka consumer connected`);

		for (const key of Object.keys(KAFKA_TOPICS)) {
			// @ts-ignore
			const topic = KAFKA_TOPICS[key];
			await kafkaConsumer.subscribe({ topic });

			console.log(`topic ${topic} subscribed`);
		}

		await kafkaConsumer.run({
			eachMessage: async (payload: EachMessagePayload) => {
				try {
					const { topic, message } = payload;
					const value = JSON.parse(message.value?.toString() || "");
					switch (topic) {
						case TronEvent.Block:
							await addBlockEventToRedis(value);
							break;
						case TronEvent.Transaction:
							await addTransactionEventToRedis(value);
							break;
					}
				} catch (e) {
					Sentry.captureException(e);
					throw e;
				}
			},
		});
	} catch (e) {
		console.error(`kafka consumer disconnected`);
		throw e;
	}
};

const startKafkaConsumer = async (brokers: string[], groupId: string) => {
	const _tronKafka = _getTronKafka(brokers);
	const _consumer = _getKafkaConsumer(groupId, _tronKafka);
	await _connectKafkaConsumer(_consumer);
};

export { startKafkaConsumer };
