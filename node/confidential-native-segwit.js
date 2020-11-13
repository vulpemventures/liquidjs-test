const liquid = require('liquidjs-lib');
const bip39 = require('bip39');
const bip32 = require('bip32');
const {
  Mnemonic,
  IdentityType,
  fetchAndUnblindUtxos
} = require('tdex-sdk');

const { faucet, fetchTxHex, fetchUtxos } = require('./helpers');
// Current network
const network = liquid.networks.regtest;
const LBTC = liquid.networks.regtest.assetHash;


// generate a mnemonic for Alice
const mnemonic = bip39.generateMnemonic()

// make new instance of Mnemonic identity abstraction
const aliceMnemonic = new Mnemonic({
  chain: 'regtest', // or liquid for mainnet
  type: IdentityType.Mnemonic,
  value: {
    mnemonic: mnemonic
  }
});

// generate a random keyPair for bob
const keyPair2 = liquid.ECPair.fromWIF(
  'cSv4PQtTpvYKHjfp9qih2RMeieBQAVADqc8JGXPvA7mkJ8yD5QC1',
  network,
);
const blindKeyPair2 = liquid.ECPair.fromWIF(
  "cVcDj9Td96x8jcG1eudxKL6hdwziCTgvPhqBoazkDeFGSAR8pCG8",
  network
);



async function main() {
  try {

    const alice = aliceMnemonic.getNextAddress();
    const aliceAddress = alice.confidentialAddress;
    const aliceBlindingPrivateKey = alice.blindingPrivateKey;

    // this is random address for who is receiving the withdrawal
    const bobAddress = liquid.payments.p2wpkh({
      pubkey: keyPair2.publicKey,
      blindkey: blindKeyPair2.publicKey,
      network
    }).confidentialAddress;

    console.log(`Alice address ${aliceAddress}`);
    console.log(`Bob address ${bobAddress}`);
    console.log(``);



    // Call the Faucet for alice
    console.log('Requesting Alice funds via faucet...')
    await faucet(aliceAddress);
    console.log(`Done √ \n`);

    console.log(`Fetching Alice utxos...`);

    const aliceUtxo = (await fetchAndUnblindUtxos(aliceAddress, aliceBlindingPrivateKey, "http://localhost:3001"))[0];
    console.log(`Done √\n`)

    console.log(`Fetching Alice prevout tx hex...`);
    const aliceTxHex = await fetchTxHex(aliceUtxo.txid);
    console.log(`Done √\n`)

    const alicePrevOut = liquid.Transaction.fromHex(aliceTxHex).outs[aliceUtxo.vout];


    const psbt = new liquid.Psbt({ network });


    // Alice Input
    psbt.addInput({
      // if hash is string, txid, if hash is Buffer, is reversed compared to txid
      hash: aliceUtxo.txid,
      index: aliceUtxo.vout,
      //The scriptPubkey and the value only are needed.
      witnessUtxo: alicePrevOut
    });
    // SwapRequest message 
    psbt.addOutputs([
      // Change address of Alice's assets
      {
        nonce: Buffer.from('00', 'hex'),
        value: liquid.confidential.satoshiToConfidentialValue(49999500),
        address: aliceAddress,
        asset: LBTC,
      },
      //BOB receiving address
      {
        nonce: Buffer.from('00', 'hex'),
        value: liquid.confidential.satoshiToConfidentialValue(50000000),
        address: bobAddress,
        asset: LBTC,
      },
      // Liquid Bitcoin Fees paid by Alice
      {
        nonce: Buffer.from('00', 'hex'),
        value: liquid.confidential.satoshiToConfidentialValue(500),
        script: Buffer.alloc(0),
        asset: LBTC,
      },
    ]);

    // NOTICE here we are derving the Alice's blinding PUBLIC key used in the blindOutputs function
    const aliceBlindingPUBLICKey = liquid.address.fromConfidential(aliceAddress).blindingKey

    // Let's blind all the outputs. The order is important (same of output and some blinding key)
    // The alice linding private key is an hex string, we need to pass to Buffer.
    psbt.blindOutputs(
      [Buffer.from(aliceBlindingPrivateKey, 'hex')],
      [aliceBlindingPUBLICKey, blindKeyPair2.publicKey]
    );


    // Get the base64 version of the unsigned pset
    const unsignedTxBase64 = psbt.toBase64()

    // Now Alice can sign his own inputs with mnemonic interface.
    const signedTxBase64 = await aliceMnemonic.signPset(unsignedTxBase64)


    const decodedTx = liquid.Psbt.fromBase64(signedTxBase64);
    console.log(decodedTx.data.inputs)

    // Alice should validate all singature and finalize the transaction
    decodedTx.validateSignaturesOfAllInputs();
    // finalize all inputs
    decodedTx.finalizeAllInputs();
    // Get the tx in hex format ready to be broadcasted
    const hex = decodedTx.extractTransaction().toHex();

    console.log('Signed transaction hex format')
    console.log(hex);


    //Now we can broadcast with the Esplora API


  } catch (e) {
    console.error(e)
  }

}


main()



