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

const TIERO_ASSET_HASH = "18f123d90e3ec85e73b2e517910f1bf0d04fb493a6d537c0d1977c12aa4896d9"
const TieroAsset = Buffer.concat([
  Buffer.from("01", "hex"), //prefix for unconfidential asset
  Buffer.from(TIERO_ASSET_HASH, "hex").reverse(),
])

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function utxosByAsset(utxos, asset) {
  return utxos.filter(function (utxo) {
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

  const keyPair3 = liquid.ECPair.fromWIF(
    'cPMd8Erwxc8cW9dEf23LbzYGpiCZXrUWPWiHyibTfQwvRHKRHWX2',
    network
  );

  // Get a random unconfidential liquid address to request funds
  const charlie = liquid.payments.p2wpkh({ pubkey: keyPair.publicKey, network });
  const bob = liquid.payments.p2wpkh({ pubkey: keyPair2.publicKey, network });
  const darlene = liquid.payments.p2wpkh({ pubkey: keyPair3.publicKey, network });
  console.log(`Bob address ${bob.address}`);
  console.log(`charlie address ${charlie.address}`);
  console.log(``);

  let bobUtxos = await fetchUtxos(bob.address, TIERO_ASSET_HASH);

  // Now we can try to spend the fresh utxo
  const psbt = new liquid.Psbt();

  const bobUtxo = bobUtxos[0];
  psbt.addInput({
    hash: bobUtxo.txid,
    index: bobUtxo.vout,
    witnessUtxo: {
      script: bob.output,
      value: liquid.satoshiToConfidentialValue(bobUtxo.value),
      nonce: Buffer.from('00', 'hex'),
      asset: TieroAsset
    },
  })


  psbt.addOutputs([
    // Darlene new output 
    {
      nonce: Buffer.from('00', 'hex'),
      value: liquid.satoshiToConfidentialValue(5000000000),
      script: darlene.output,
      asset: TieroAsset,
    },
    // Change of BOB's assets
    {
      nonce: Buffer.from('00', 'hex'),
      value: liquid.satoshiToConfidentialValue(5000000000),
      script: bob.output,
      asset: TieroAsset,
    },

  ]);

  const base64 = psbt.toBase64();

  await faucet(charlie.address);
  const charlieUtxos = await fetchUtxos(charlie.address, network.assetHash);
  const input = charlieUtxos[0];
  
  
  const decoded = liquid.Psbt.fromBase64(base64);
  decoded.addInput({
    hash: input.txid,
    index: input.vout,
    witnessUtxo: {
      script: charlie.output,
      value: liquid.satoshiToConfidentialValue(input.value),
      nonce: Buffer.from('00', 'hex'),
      asset: LiquidBitcoinAsset
    },
  })
  
  const FEE = 800
  const changeOutputValue = input.value - FEE; 

  decoded.addOutputs([
    //Change of Caarlie 
    {
      nonce: Buffer.from('00', 'hex'),
      value: liquid.satoshiToConfidentialValue(changeOutputValue),
      script: charlie.output,
      asset: LiquidBitcoinAsset,
    },
    // Fee explicit
    {
      nonce: Buffer.from('00', 'hex'),
      value: liquid.satoshiToConfidentialValue(FEE),
      script: Buffer.alloc(0),
      asset: LiquidBitcoinAsset,
    }
  ])


  // Let's sign the input 
  try {
    decoded.signInput(1, keyPair);
    decoded.validateSignaturesOfInput(1);
  } catch (e) { console.error(e) }
  // finalize all inputs
  decoded.finalizeInput(1);

  const base64WithFee = decoded.toBase64();
  const decodedWithFee = liquid.Psbt.fromBase64(base64WithFee);

  decodedWithFee.signInput(0, keyPair2);
  decodedWithFee.validateSignaturesOfInput(0);
  decodedWithFee.finalizeInput(0);

  console.log(decodedWithFee.toBase64())
  console.log()
  // Get the tx in hex format ready to be broadcasted
  const hex = decodedWithFee.extractTransaction().toHex();

  console.log('Signed transaction hex format')
  console.log(hex);

}


async function faucet(address) {
  console.log('Requesting funds via faucet...')
  await axios.post(`${APIURL}/faucet`, { address });
  await sleep(200)
  console.log(`Done √ \n`);
}


async function fetchUtxos(address, asset) {
  console.log(`Fetching utxos...`);
  const utxos = (await axios.get(`${APIURL}/address/${address}/utxo`)).data;
  await sleep(200)
  console.log(`Done √\n`)
  return utxosByAsset(utxos, asset);
}

main()



