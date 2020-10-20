const axios = require('axios');
// Nigiri Chopstick Liquid base URI
const APIURL = process.env.EXPLORER || `http://localhost:3001`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bufferFromAssetHash(hash) {
  return Buffer.concat([
    Buffer.from('01', 'hex'), //prefix for unconfidential asset
    Buffer.from(hash, 'hex').reverse(),
  ]);
}

function utxosByAsset(utxos, asset) {
  return utxos.filter(function (utxo) {
    return utxo.asset === asset;
  });
}

async function faucet(address) {
  try {
    await axios.post(`${APIURL}/faucet`, { address });
    await sleep(3000);
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function mint(address, quantity) {
  let ret;
  try {
    const response = await axios.post(`${APIURL}/mint`, { address, quantity });
    await sleep(3000);
    const { asset } = response.data;
    ret = asset;
  } catch (e) {
    console.error(e);
    throw e;
  }
  return ret;
}

async function fetchUtxos(address, asset) {
  let utxos;
  try {
    await sleep(5000);
    utxos = (await axios.get(`${APIURL}/address/${address}/utxo`)).data;
  } catch (e) {
    console.error(e);
    throw e;
  }
  return utxos
}

async function fetchTxHex(txId) {
  let hex;
  try {
    await sleep(5000);
    hex = (await axios.get(`${APIURL}/tx/${txId}/hex`)).data;
  } catch (e) {
    console.error(e);
    throw e;
  }
  return hex;
}


async function pushTx(hex) {
  let result;
  try {
    result = await axios.post(`${APIURL}/tx`, hex, {
      headers: { 'Content-Type': 'text/plain' },
    });

    return result.data.txId;
  } catch (error) {
    // Error 😨
    if (error.response) {
      /*
       * The request was made and the server responded with a
       * status code that falls out of the range of 2xx
       */
      throw new Error(error.response.data);
    } else if (error.request) {
      /*
       * The request was made but no response was received, `error.request`
       * is an instance of XMLHttpRequest in the browser and an instance
       * of http.ClientRequest in Node.js
       */
      throw new Error(error.request);
    } else {
      // Something happened in setting up the request and triggered an Error
      throw new Error(error.message);
    }
  }
}

module.exports = { mint, sleep, faucet, pushTx, fetchUtxos, fetchTxHex, bufferFromAssetHash };