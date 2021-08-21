import TronWeb from "tronweb";
import { TRON_WEB_PRIVATE_KEY } from "./config";

const tronWeb = new TronWeb({
	fullHost: "https://api.trongrid.io",
	privateKey: TRON_WEB_PRIVATE_KEY,
});

export { tronWeb };
