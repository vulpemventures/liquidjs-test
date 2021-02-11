const liquid = require('liquidjs-lib');
const axios = require('axios');
const { faucet, mint, fetchTxHex, fetchUtxos } = require('./helpers');
// Current network
const network = liquid.networks.regtest;
const LBTC = liquid.networks.regtest.assetHash;


// generate a keyPair importing from WIF
const keyPair = liquid.ECPair.fromWIF(
  'cPNMJD4VyFnQjGbGs3kcydRzAbDCXrLAbvH6wTCqs88qg1SkZT3J',
  network,
);
const blindKeyPair = liquid.ECPair.fromWIF(
  "cRdrvnPMLV7CsEak2pGrgG4MY7S3XN1vjtcgfemCrF7KJRPeGgW6",
  network
);
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

    // Get a random confidential liquid address to request funds
    const alice = liquid.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      blindkey: blindKeyPair.publicKey,
      network
    });
    const bob = liquid.payments.p2wpkh({
      pubkey: keyPair2.publicKey,
      blindkey: blindKeyPair2.publicKey,
      network
    });
    console.log(`Alice address ${alice.confidentialAddress}`);
    console.log(`Bob address ${bob.confidentialAddress}`);
    console.log(``);



    // Call the Faucet for alice
    console.log('Requesting Alice funds via faucet...')
    await faucet(alice.confidentialAddress);
    console.log(`Done √ \n`);

    console.log(`Fetching Alice utxos...`);
    const aliceUtxo = (await fetchUtxos(alice.confidentialAddress, LBTC))[0];
    console.log(`Done √\n`)

    console.log(`Fetching Alice prevout tx hex...`);
    const aliceTxHex = await fetchTxHex(aliceUtxo.txid);
    console.log(`Done √\n`)

    const alicePrevOut = liquid.Transaction.fromHex(aliceTxHex).outs[aliceUtxo.vout];
    // Call the mint for Bob
    console.log('Requesting Bob USDT funds via mint...')
    const USDT = await mint(bob.confidentialAddress, 1);
    //const USDT = "acdd397b18a5bdb70f25315be03366034701c986c5a2828a6e603d58512b61fb"
    console.log(`Done √ \n`);

    console.log(`Fetching USDT utxos of Bob...`);
    const bobUtxo = (await fetchUtxos(bob.confidentialAddress, USDT))[0];
    console.log(`Done √\n`)

    console.log(`Fetching Bob prevout tx hex...`);
    const bobTxHex = await fetchTxHex(bobUtxo.txid);
    console.log(`Done √\n`)

    const bobPrevOut = liquid.Transaction.fromHex(bobTxHex).outs[bobUtxo.vout];



    const psbt = new liquid.Psbt({ network });



    // Alice Input
    psbt.addInput({
      // if hash is string, txid, if hash is Buffer, is reversed compared to txid
      hash: aliceUtxo.txid,
      index: aliceUtxo.vout,
      //The scriptPubkey and the value only are needed.
      witnessUtxo: alicePrevOut
    });

    // Bob Input
    psbt.addInput({
      hash: bobUtxo.txid,
      index: bobUtxo.vout,
      witnessUtxo: bobPrevOut
    });


    // SwapRequest message 
    psbt.addOutputs([
      // Change output of Alice's assets
      {
        nonce: Buffer.from('00', 'hex'),
        value: liquid.confidential.satoshiToConfidentialValue(49999500),
        script: alice.output,
        asset: LBTC,
      },
      //BOB's assets to be swapped to Alice
      {
        nonce: Buffer.from('00', 'hex'),
        value: liquid.confidential.satoshiToConfidentialValue(60000000),
        script: alice.output,
        asset: USDT,
      },
    ]);


    // SwapAccept mesage 
    psbt.addOutputs([
      // Alice's Bitcoins to be swapped to Bob
      {
        nonce: Buffer.from('00', 'hex'),
        value: liquid.confidential.satoshiToConfidentialValue(50000000),
        script: bob.output,
        asset: LBTC,
      },
      // Change of BOB's assets
      {
        nonce: Buffer.from('00', 'hex'),
        value: liquid.confidential.satoshiToConfidentialValue(40000000),
        script: bob.output,
        asset: USDT,
      },
      // Liquid Bitcoin Fees paid by Alice
      {
        nonce: Buffer.from('00', 'hex'),
        value: liquid.confidential.satoshiToConfidentialValue(500),
        script: Buffer.alloc(0),
        asset: LBTC,
      },
    ]);
    // Let's blind all the outputs
    await psbt.blindOutputs(
      [blindKeyPair.privateKey, blindKeyPair2.privateKey],
      [blindKeyPair.publicKey, blindKeyPair.publicKey, blindKeyPair2.publicKey, blindKeyPair2.publicKey]
    );
    // Let's sign the input of Bob 
    psbt.signInput(1, keyPair2);

    // Now Alice can sign his own inputs to make the SwapComplete message
    psbt.signInput(0, keyPair);


    // Bob (or even alice) should validate all singature and finalize the transaction
    psbt.validateSignaturesOfAllInputs();
    // finalize all inputs
    psbt.finalizeAllInputs();
    // Get the tx in hex format ready to be broadcasted
    const hex = psbt.extractTransaction().toHex();

    console.log('Signed transaction hex format')
    console.log(hex);


  } catch (e) {
    console.error(e)
  }

}


main()



