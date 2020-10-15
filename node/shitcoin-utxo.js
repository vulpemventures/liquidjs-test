const liquid = require("liquidjs-lib");
const axios = require("axios");
const fs = require("fs");

const network = liquid.networks.regtest;
const APIURL = `http://localhost:3001`;

async function issueShitCoin(address, quantity) {
  return axios
    .post(`${APIURL}/mint`, { address, quantity })
    .then(({ data }) => data)
    .catch(console.error);
}

async function getTx(txId) {
  return axios.get(`${APIURL}/tx/${txId}/hex`).then(({ data }) => data);
}

async function tryGetTx(txId) {
  const MAX_TRY = 10;
  const SLEEP_TIME = 500;
  for (let i = 0; i < MAX_TRY; i++) {
    try {
      const txHex = await getTx(txId);
      return txHex;
    } catch {
      await sleep(SLEEP_TIME);
    }
  }
  throw Error("transaction not found");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAssetHash(x) {
  const withoutFirstByte = x.slice(1);
  return withoutFirstByte.reverse().toString("hex");
}

function createPayment(_type, myKeys, network, confidential) {
  network = network || regtest;
  const splitType = _type.split("-").reverse();
  const isMultisig = splitType[0].slice(0, 4) === "p2ms";
  const keys = myKeys || [];
  const blindingKeys = [];
  let m;
  if (isMultisig) {
    const match = splitType[0].match(/^p2ms\((\d+) of (\d+)\)$/);
    m = parseInt(match[1], 10);
    let n = parseInt(match[2], 10);
    if (keys.length > 0 && keys.length !== n) {
      throw new Error("Need n keys for multisig");
    }
    while (!myKeys && n > 1) {
      keys.push(liquid.ECPair.makeRandom({ network }));
      n--;
    }
  }
  if (!myKeys) keys.push(liquid.ECPair.makeRandom({ network }));
  if (confidential)
    blindingKeys.push(liquid.ECPair.makeRandom({ network }).privateKey);

  let payment;
  splitType.forEach((type) => {
    if (type.slice(0, 4) === "p2ms") {
      payment = liquid.payments.p2ms({
        m,
        pubkeys: keys.map((key) => key.publicKey).sort(),
        network,
      });
    } else if (["p2sh", "p2wsh"].indexOf(type) > -1) {
      const blindkey =
        confidential && (type === "p2sh" || splitType.indexOf("p2sh") < 0)
          ? liquid.ECPair.fromPrivateKey(blindingKeys[0]).publicKey
          : undefined;
      payment = liquid.payments[type]({
        redeem: payment,
        network,
        blindkey,
      });
    } else {
      const blindkey =
        confidential && splitType.length === 1
          ? liquid.ECPair.fromPrivateKey(blindingKeys[0]).publicKey
          : undefined;
      payment = liquid.payments[type]({
        pubkey: keys[0].publicKey,
        network,
        blindkey,
      });
    }
  });

  return {
    payment,
    keys,
    blindingKeys,
  };
}

async function main() {
  try {
    // parse command line arguments
    const args = process.argv.slice(2);

    if (args.length < 1) {
      throw new Error(
        "Usage: node shitcoin-utxo param1=WIF param2(optional)=jsonPath"
      );
    }

    const wif = args[0];
    const jsonPath = args[1];

    console.log("creating utxo using nigiri...");

    // generate a keyPair importing from WIF
    const keyPair = liquid.ECPair.fromWIF(wif, network);

    const alice = createPayment("p2wpkh", [keyPair], network, true);

    const txid = (await issueShitCoin(alice.payment.confidentialAddress, 10))
      .txId;

    const txHex = await tryGetTx(txid);
    const tx = liquid.Transaction.fromHex(txHex);

    let vout = -1;

    const unblindOuts = tx.outs
      .filter((out) => out.rangeProof.length > 0)
      .map((out, i) => {
        try {
          const unblind = liquid.confidential.unblindOutput(
            out.nonce,
            alice.blindingKeys[0],
            out.rangeProof,
            out.value,
            out.asset,
            out.script
          );
          vout = i;
          return unblind;
        } catch (e) {
          console.error(i, "can't unblind");
          return out;
        }
      });

    const utxo = {
      witnessUtxo: txHex,
      blindingKey: alice.blindingKeys[0].toString("hex"),
      vout,
      value: parseInt(unblindOuts[vout].value),
      asset: toAssetHash(unblindOuts[vout].asset),
    };
    console.log("done!");

    console.log(utxo);

    if (jsonPath) {
      console.log("writing the utxo into a json file..");
      const encoded = JSON.stringify(utxo);
      fs.writeFileSync(jsonPath, encoded);
      console.log("done, data encoded to:", jsonPath);
    }

    // console.log(await getUtxos(alice.address));
  } catch (e) {
    console.error(e);
  }
}

main();
