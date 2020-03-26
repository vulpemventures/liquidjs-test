const liquid = require('liquidjs-lib');
const axios = require('axios');
// Current network
const network = liquid.networks.regtest;
// Nigiri Chopstick Liquid base URI 
const APIURL = `http://localhost:3001`

const LiquidBitcoinAsset = Buffer.concat([
  Buffer.from('01', 'hex'), //prefix for unconfidential asset
  Buffer.from(network.assetHash, 'hex').reverse(),
]);

const TIERO_ASSET_HASH = "d37b483337487c78fd4e57278d77a11de7bcabef56670aa63059e2e71f1dcae1"
const TieroAsset = Buffer.concat([
  Buffer.from("01", "hex"), //prefix for unconfidential asset
  Buffer.from(TIERO_ASSET_HASH, "hex").reverse(),
])

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function utxoByAsset(utxos, asset) {
  return utxos.find(function (utxo) {
    return utxo.asset === asset
  })
}


async function main() {
  // generate a keyPair importing from WIF
  const keyPair = liquid.ECPair.fromWIF(
    'cPNMJD4VyFnQjGbGs3kcydRzAbDCXrLAbvH6wTCqs88qg1SkZT3J',
    network,
  );
  const keyPair2 = liquid.ECPair.fromWIF(
    'cSv4PQtTpvYKHjfp9qih2RMeieBQAVADqc8JGXPvA7mkJ8yD5QC1',
    network,
  );

  // Get a random unconfidential liquid address to request funds
  const alice = liquid.payments.p2wpkh({ pubkey: keyPair.publicKey, network });
  const bob = liquid.payments.p2wpkh({ pubkey: keyPair2.publicKey, network });
  console.log(`Alice address ${alice.address}`);
  console.log(`Bob address ${bob.address}`);
  console.log(``);

  // Call the Faucet
  console.log('Requesting funds via faucet...')
  await axios.post(`${APIURL}/faucet`, { address: alice.address });
  await sleep(1500);
  console.log(`Done √ \n`);

  console.log(`Fetching utxos of Alice...`);
  const aliceUtxos = (await axios.get(`${APIURL}/address/${alice.address}/utxo`)).data;
  await sleep(1500);
  const aliceUtxo = utxoByAsset(aliceUtxos, network.assetHash);
  console.log(`Done √\n`)

  console.log(`Fetching utxos of Bob...`);
  const bobUtxos = (await axios.get(`${APIURL}/address/${bob.address}/utxo`)).data;
  await sleep(1500);
  const bobUtxo = utxoByAsset(bobUtxos, TIERO_ASSET_HASH);
  console.log(`Done √\n`)

  // Now we can try to spend the fresh utxo
  const psbt = new liquid.Psbt();

  psbt.addInput({
    // if hash is string, txid, if hash is Buffer, is reversed compared to txid
    hash: aliceUtxo.txid,
    index: aliceUtxo.vout,
    //The scriptPubkey and the value only are needed.
    witnessUtxo: {
      script: alice.output,
      value: liquid.satoshiToConfidentialValue(aliceUtxo.value),
      nonce: Buffer.from('00', 'hex'),
      asset: LiquidBitcoinAsset
    }
  });

  psbt.addInput({
    hash: bobUtxo.txid,
    index: bobUtxo.vout,
    witnessUtxo: {
      script: bob.output,
      value: liquid.satoshiToConfidentialValue(bobUtxo.value),
      nonce: Buffer.from('00', 'hex'),
      asset: TieroAsset
    }
  })


  psbt.addOutputs([
    // Alice's Bitcoins to be swappet to Bob
    {
      nonce: Buffer.from('00', 'hex'),
      value: liquid.satoshiToConfidentialValue(50000000),
      script: bob.output,
      asset: LiquidBitcoinAsset,
    },
    // Change output of Alice's assets
    {
      nonce: Buffer.from('00', 'hex'),
      value: liquid.satoshiToConfidentialValue(49999500),
      script: alice.output,
      asset: LiquidBitcoinAsset,
    },
    //BOB's assets to be swapped to Alice
    {
      nonce: Buffer.from('00', 'hex'),
      value: liquid.satoshiToConfidentialValue(100),
      script: alice.output,
      asset: TieroAsset,
    },
    // Change of BOB's assets
    {
      nonce: Buffer.from('00', 'hex'),
      value: liquid.satoshiToConfidentialValue(9999999999900),
      script: bob.output,
      asset: TieroAsset,
    },
    // Liquid Bitcoin Fees paid by Alice
    {
      nonce: Buffer.from('00', 'hex'),
      value: liquid.satoshiToConfidentialValue(500),
      script: Buffer.alloc(0),
      asset: LiquidBitcoinAsset,
    },
  ]);

  // Let's sign the input 
  psbt.signInput(0, keyPair);
  psbt.signInput(1, keyPair2);
  psbt.validateSignaturesOfAllInputs();
  // finalize all inputs
  psbt.finalizeAllInputs();
  // Get the tx in hex format ready to be broadcasted
  const hex = psbt.extractTransaction().toHex();

  console.log('Signed transaction hex format')
  console.log(hex);

}


main()



