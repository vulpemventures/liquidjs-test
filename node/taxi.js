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

// generate a keyPair importing from WIF
//Treasury WIF
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


async function build() {

  // Get a random unconfidential liquid address to request funds
  const bob = liquid.payments.p2wpkh({ pubkey: keyPair2.publicKey, network });
  const darlene = liquid.payments.p2wpkh({ pubkey: keyPair3.publicKey, network });
  console.log(`Bob address ${bob.address}`);
  console.log(`darlene address ${darlene.address}`);
  console.log(``);

  let bobUtxos = await fetchUtxos(bob.address, TIERO_ASSET_HASH);

  // Now we can try to spend the fresh utxo
  const psbt = new liquid.Psbt();

  const amountForDarlene = 1000000


  const bobUtxo = bobUtxos.find(u => u.value > amountForDarlene);
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

  const change = bobUtxo.value - amountForDarlene;

  psbt.addOutputs([
    // Darlene new output 
    {
      nonce: Buffer.from('00', 'hex'),
      value: liquid.satoshiToConfidentialValue(amountForDarlene),
      script: darlene.output,
      asset: TieroAsset,
    },
    // Change of BOB's assets
    {
      nonce: Buffer.from('00', 'hex'),
      value: liquid.satoshiToConfidentialValue(change),
      script: bob.output,
      asset: TieroAsset,
    },

  ]);

  return psbt.toBase64();
}


async function payFees() {
  // This is the treasury
  const charlie = liquid.payments.p2wpkh({ pubkey: keyPair.publicKey, network });
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
    //Change of Charlie 
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

  return decoded.toBase64()

}

function sign(base64) {
  const decodedWithFee = liquid.Psbt.fromBase64(base64)
  decodedWithFee.signInput(0, keyPair2)
  decodedWithFee.validateSignaturesOfInput(0)
  decodedWithFee.finalizeInput(0)

  console.log(decodedWithFee.toBase64())
  console.log()
  // Get the tx in hex format ready to be broadcasted
  const hex = decodedWithFee.extractTransaction().toHex();

  console.log('Signed transaction hex format')
  console.log(hex);

}


//sign("cHNidP8BAP1PAQIAAAAAApw0tA986B4seYAv1oPzHZlegotgPCjUTJBawSG8esi1AQAAAAD/////kK7RAqG4T1AyhW8O75Jlc6bafIdvAeaqOHJ/ETN1nFUBAAAAAP////8EAdmWSKoSfJfRwDfVppO0T9DwGw+RF+Wyc17IPg7ZI/EYAQAAAAEqBfIAABYAFLWZ710/FsLh2zNm844bL2u3SpvsAdmWSKoSfJfRwDfVppO0T9DwGw+RF+Wyc17IPg7ZI/EYAQAAAAEqBfIAABYAFEYguhpN/Bt7hQOzfp6+rPZ1cir6ASWyUQcOKcoZBDzzPM1zJOLdqwPsxK4LXnfE/A5c9slaAQAAAAAF9d4tABYAFGWb7bXT08erEtf4UyPDobbAYO++ASWyUQcOKcoZBDzzPM1zJOLdqwPsxK4LXnfE/A5c9slaAQAAAAAAAALTAAAAAAAAAAEBQgHZlkiqEnyX0cA31aaTtE/Q8BsPkRflsnNeyD4O2SPxGAEAAAABKgXyAAAWABRGILoaTfwbe4UDs36evqz2dXIq+gABAUIBJbJRBw4pyhkEPPM8zXMk4t2rA+zErgted8T8Dlz2yVoBAAAAAAX14QAAFgAUZZvttdPTx6sS1/hTI8OhtsBg774BCGwCSDBFAiEA/M9skJMbw7U1mRdEahrxZWwhQHK1rP3ruAeHHoQI7bICIB5uZk0C0U1+M8qf5Yn5bio/OKCj/QrFe2qa0VB74y5eASECUUZEIPzJii5M00ev4ooy12kofazYYUdquFi6pDvTCPMAAAAAAA==")

async function main() {
  //console.log(await build());
  sign("cHNidP8BAP1PAQIAAAAAApw0tA986B4seYAv1oPzHZlegotgPCjUTJBawSG8esi1AQAAAAD/////PaYQ9Th1iOhGJKrwf4Jhw07bhdjufsZzpeB39d+ynbAAAAAAAP////8EAdmWSKoSfJfRwDfVppO0T9DwGw+RF+Wyc17IPg7ZI/EYAQAAAAAAD0JAABYAFLWZ710/FsLh2zNm844bL2u3SpvsAdmWSKoSfJfRwDfVppO0T9DwGw+RF+Wyc17IPg7ZI/EYAQAAAAEp9q/AABYAFEYguhpN/Bt7hQOzfp6+rPZ1cir6ASWyUQcOKcoZBDzzPM1zJOLdqwPsxK4LXnfE/A5c9slaAQAAAAAF9d4tABYAFGWb7bXT08erEtf4UyPDobbAYO++ASWyUQcOKcoZBDzzPM1zJOLdqwPsxK4LXnfE/A5c9slaAQAAAAAAAALTAAAAAAAAAAEBQgHZlkiqEnyX0cA31aaTtE/Q8BsPkRflsnNeyD4O2SPxGAEAAAABKgXyAAAWABRGILoaTfwbe4UDs36evqz2dXIq+gABAUIBJbJRBw4pyhkEPPM8zXMk4t2rA+zErgted8T8Dlz2yVoBAAAAAAX14QAAFgAUZZvttdPTx6sS1/hTI8OhtsBg774BCGwCSDBFAiEAoHRhE1w60rB2kiss0AOoYcEZZzc/TLGESLewsgro6EYCIHnGx/m7WbEuj2VzwoRnVnKB/zJrjDrE1/SGKWbZXNzhASECUUZEIPzJii5M00ev4ooy12kofazYYUdquFi6pDvTCPMAAAAAAA==")
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




