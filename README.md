## 1. Purpose
* For external services that want to get the transaction (tx) status of the blockchain network, including Tron and Nile
## 2. Architecture
* Consists of two sub-modules: tcs-client, tcs-server
* Sub-modules are connected via grpc
* tcs-server
  * Standalone server
  * Save tx status requests, includes txid and clientUrl
  * After calculating tx status, send back to clientUrl
  * Actively request and save tx status from network, make the service faster
  * Block validation: tx is in a block which is n (blocks) away from the current block to be recognized as success/fail
  * Time validation: after t (seconds) failed to request tx status from blockchain, tx confirmed as not found
* tcs-client
    * Is installed as a npm module on services which want to use tcs
    * Set callback when receiving tx status
## 3. TX Status
* Consists of these values:
  * WAITING: Blockchain returns either unconfirmed tx, nothing or error
  * WAITING SUCCESS: Blockchain returns confirmed SUCCESS, but it has to wait for block validation
  * WAITING FAIL: Blockchain returns confirmed FAIL, but it has to wait for block validation
  * SUCCESS: Blockchain returns confirmed SUCCESS, and after the block validation period
  * FAIL: Blockchain returns confirmed FAIL, and after the block validation period
  * NOT FOUND: tx status is WAITING, and after the time validation period, turns to NOT FOUND
* Consists of two groups:
  * Immediate:
    * Values that are not yet recognized by block validation/time validation: WAITING, WAITING SUCCESS, WAITING FAIL.
    * Values that have been calculated and saved: SUCCESS, FAIL, NOT FOUND
    * tcs-client can set callback to process these statuses, named requestCallback
  * Final:
    * Values that are recognized by block validation/time validation: SUCCESS, FAIL, NOT FOUND
    * tcs-client can set callback to process these statuses, named statusCallback
## 4. Usage
* tcs-client
  * startClient(opts: IClientParams): clientRequest
    * IClientParams: object
      * clientUrl: string, is the Url of the service that wants to get tx status
      * serverUrl: string,is the Url of the tcs-server
      * statusCallback: (tx: ITransactionStatus): void
        * ITransactionStatus: object
          * transactionId: string
          * transactionStatus: string
          * error?: string
  * clientRequest
    * sendTransactionRequest(txRequest: ITxRequest,  requestCallback: RequestCallback): void
      * ITxRequest: object
        * transactionId: string
        * clientUrl: string
        * getFinalStatus: boolean
      * RequestCallback: (error, tx: ITransactionStatus): void
* tcs-server
  * Add file .env
  * Start development: npm run dev:server
  * Start production: npm run dep
## 5. Example: tcs-client 
```javascript
const tscClient = require("@brickglobal/tcs-client")

const txIds = [
  "b68c6dca547736bfd1a3c139287a90ef904ba12ed301fbc49f1a5a783c5f7ff3",
  "c05903ccd68d94cdc95d43da7241b71b1f7e1a2cedad42baf5d9aba8e94f8b65",
  "4a80109520fba6fa9b1294b08a719e7bfe064ede60ca501c0e96f9c8ec80f38d",
];
const clientUrl = "localhost:50001";

(async () => {
  const clientRequest = await tscClient.startClient({
    clientUrl,
    serverUrl: "localhost:50051",
    statusCallback: (txStatus) => {
      console.log({ statusResponse: txStatus });
    },
  });

  for (const txId of txIds) {
    clientRequest.sendTransactionRequest(
            {
              transactionId: txId,
              clientUrl,
              getFinalStatus: true,
            },
            function (err, response) {
              console.log({ requestResponse: response });
            }
    );
  }
})();
```