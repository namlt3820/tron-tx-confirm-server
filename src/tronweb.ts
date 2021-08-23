import TronWeb from "tronweb";
import { TRON_WEB_PRIVATE_KEY } from "./config";

let tronWeb;

const initTronWeb = () => {
	tronWeb = new TronWeb({
		fullHost: "https://api.trongrid.io",
		privateKey: TRON_WEB_PRIVATE_KEY,
	});
};

export { tronWeb, initTronWeb };
