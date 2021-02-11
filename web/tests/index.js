describe('liquidjs-lib (transaction with psbt)', function () {
  const NUM_ITERATIONS = 10;
  const network = liquid.networks.regtest;

  it('Confidential 1-to-1 transaction', async function () {
    const alice = liquid.ECPair.fromWIF(
      'cQ7z41awTvKtmiD9p6zkjbgvYbV8g5EDDNcTnKZS9aZ8XdjQiZMU',
      network,
    );
    const blindingPubkeys = [''].map(
      () =>
        liquid.ECPair.makeRandom({ network: liquid.networks.regtest })
          .publicKey,
    );

    const craftingTx = [];
    const blindingTx = [];
    const signingTx = [];
    const finalizingTx = [];
    const total = [];

    for (let i = 0; i < NUM_ITERATIONS; ++i) {
      const startTotal = performance.now();
      const startCraftingTx = performance.now();
      const psbt = new liquid.Psbt();
      psbt.addInput({
        hash:
          'dd983c9c0419fce6bcc0eaf875b54a2c19f9d6e761faa58b1afd199638275475',
        index: 0,
        nonWitnessUtxo: fixtures.confidentialTx.nonWitnessUtxo,
      });
      psbt.addOutputs([
        {
          asset: network.assetHash,
          value: 99996500,
          script: '76a914659bedb5d3d3c7ab12d7f85323c3a1b6c060efbe88ac',
        },
        {
          asset: network.assetHash,
          value: 3500,
          script: '',
        },
      ]);
      const endCraftingTx = performance.now();
      const startBlindingTx = performance.now();
      await psbt.blindOutputs(
        fixtures.confidentialTx.blindingPrivkeys,
        blindingPubkeys,
      );
      const endBlindingTx = performance.now();
      const startSigningTx = performance.now();
      psbt.signInput(0, alice);
      psbt.validateSignaturesOfInput(0);
      const endSigningTx = performance.now();
      const startFinalizingTx = performance.now();
      psbt.finalizeAllInputs();
      psbt.extractTransaction();
      const endFinalizingTx = performance.now();
      const endTotal = performance.now();

      craftingTx.push(endCraftingTx - startCraftingTx);
      blindingTx.push(endBlindingTx - startBlindingTx);
      signingTx.push(endSigningTx - startSigningTx);
      finalizingTx.push(endFinalizingTx - startFinalizingTx);
      total.push(endTotal - startTotal);
    }
    document.getElementById('content').style.display = 'inline-block';
    document.getElementById('content').innerHTML += `
      <div id='confTx'>
        <h3> 1-to-1 Confidential tx </h3>
        <h4> Iterations: ${NUM_ITERATIONS} </h4>
        Average crafting tx: ${craftingTx.reduce((x, y) => x + y, 0) /
      craftingTx.length}ms <br />
        Average blinding tx: ${blindingTx.reduce((x, y) => x + y, 0) /
      blindingTx.length}ms <br />
        Average signing tx: ${signingTx.reduce((x, y) => x + y, 0) /
      signingTx.length}ms <br />
        Average finalizing tx: ${finalizingTx.reduce((x, y) => x + y, 0) /
      finalizingTx.length}ms <br />
        Average total: ${total.reduce((x, y) => x + y, 0) / total.length}ms
      </div>
    `;
  });

  it('Unconfidential swap transaction', function () {
    const keyPair = liquid.ECPair.fromWIF(
      'cPNMJD4VyFnQjGbGs3kcydRzAbDCXrLAbvH6wTCqs88qg1SkZT3J',
      network,
    );
    const keyPair2 = liquid.ECPair.fromWIF(
      'cSv4PQtTpvYKHjfp9qih2RMeieBQAVADqc8JGXPvA7mkJ8yD5QC1',
      network,
    );
    const alice = liquid.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network,
    });
    const bob = liquid.payments.p2wpkh({ pubkey: keyPair2.publicKey, network });

    const craftingTx = [];
    const signingTx = [];
    const finalizingTx = [];
    const total = [];

    for (let i = 0; i < NUM_ITERATIONS; ++i) {
      const startTotal = performance.now();
      const startCraftingTx = performance.now();
      const psbt = new liquid.Psbt();
      psbt
        .addInputs([
          fixtures.unconfidentialSwap.aliceInput,
          fixtures.unconfidentialSwap.bobInput,
        ])
        .addOutputs([
          // Alice's Bitcoins to be swapped to Bob
          {
            value: 50000000,
            script: bob.output,
            asset: fixtures.unconfidentialSwap.aliceInput.witnessUtxo.asset,
          },
          // Change output of Alice's assets
          {
            value: 49999500,
            script: alice.output,
            asset: fixtures.unconfidentialSwap.aliceInput.witnessUtxo.asset,
          },
          //BOB's assets to be swapped to Alice
          {
            value: 100,
            script: alice.output,
            asset: fixtures.unconfidentialSwap.bobInput.witnessUtxo.asset,
          },
          // Change of BOB's assets
          {
            value: 9999999999900,
            script: bob.output,
            asset: fixtures.unconfidentialSwap.bobInput.witnessUtxo.asset,
          },
          // Liquid Bitcoin Fees paid by Alice
          {
            value: 500,
            script: '',
            asset: fixtures.unconfidentialSwap.aliceInput.witnessUtxo.asset,
          },
        ]);
      const endCraftingTx = performance.now();
      const startSigningTx = performance.now();
      psbt.signInput(0, keyPair);
      psbt.signInput(1, keyPair2);
      psbt.validateSignaturesOfAllInputs();
      const endSigningTx = performance.now();
      const startFinalizingTx = performance.now();
      psbt.finalizeAllInputs();
      psbt.extractTransaction().toHex();
      const endFinalizingTx = performance.now();
      const endTotal = performance.now();

      craftingTx.push(endCraftingTx - startCraftingTx);
      signingTx.push(endSigningTx - startSigningTx);
      finalizingTx.push(endFinalizingTx - startFinalizingTx);
      total.push(endTotal - startTotal);
    }

    document.getElementById('content').innerHTML += `
      <div id='unconfSwap'>
        <h3> Unconfidential swap </h3>
        <h4> Iterations: ${NUM_ITERATIONS} </h4>
        Average crafting tx: ${craftingTx.reduce((x, y) => x + y, 0) /
      craftingTx.length}ms <br />
        Average signing tx: ${signingTx.reduce((x, y) => x + y, 0) /
      signingTx.length}ms <br />
        Average finalizing tx: ${finalizingTx.reduce((x, y) => x + y, 0) /
      finalizingTx.length}ms <br />
        Average total: ${total.reduce((x, y) => x + y, 0) / total.length}ms
      </div>
    `;
  });

  it('Confidential swap transaction', async function () {
    const keyPair = liquid.ECPair.fromWIF(
      'cPNMJD4VyFnQjGbGs3kcydRzAbDCXrLAbvH6wTCqs88qg1SkZT3J',
      network,
    );
    const keyPair2 = liquid.ECPair.fromWIF(
      'cSv4PQtTpvYKHjfp9qih2RMeieBQAVADqc8JGXPvA7mkJ8yD5QC1',
      network,
    );
    const aliceBlindingPubkey = liquid.ECPair.fromPrivateKey(
      fixtures.confidentialSwap.aliceBlindingPrivkey,
    ).publicKey;
    const bobBlindingPubkey = liquid.ECPair.fromPrivateKey(
      fixtures.confidentialSwap.bobBlindingPrivkey,
    ).publicKey;
    const alice = liquid.payments.p2wpkh({
      network,
      pubkey: keyPair.publicKey,
      blindkey: aliceBlindingPubkey,
    });
    const bob = liquid.payments.p2wpkh({
      network,
      pubkey: keyPair2.publicKey,
      blindkey: bobBlindingPubkey,
    });

    const craftingTx = [];
    const blindingTx = [];
    const signingTx = [];
    const finalizingTx = [];
    const total = [];

    for (let i = 0; i < NUM_ITERATIONS; ++i) {
      const startTotal = performance.now();
      const startCraftingTx = performance.now();
      const psbt = new liquid.Psbt();
      psbt
        .addInputs([
          fixtures.confidentialSwap.aliceInput,
          fixtures.confidentialSwap.bobInput,
        ])
        .addOutputs([
          // Alice's Bitcoins to be swapped to Bob
          {
            value: 50000000,
            script: bob.output,
            asset: network.assetHash,
          },
          // Change output of Alice's assets
          {
            value: 49999500,
            script: alice.output,
            asset: network.assetHash,
          },
          //BOB's assets to be swapped to Alice
          {
            value: 100,
            script: alice.output,
            asset: fixtures.confidentialSwap.bobUnconfidentialAsset,
          },
          // Change of BOB's assets
          {
            value: 9999999999900,
            script: bob.output,
            asset: fixtures.confidentialSwap.bobUnconfidentialAsset,
          },
          // Liquid Bitcoin Fees paid by Alice
          {
            value: 500,
            script: '',
            asset: network.assetHash,
          },
        ]);
      const endCraftingTx = performance.now();
      const startBlindingTx = performance.now();
      await psbt.blindOutputs(
        [
          fixtures.confidentialSwap.aliceBlindingPrivkey,
          fixtures.confidentialSwap.bobBlindingPrivkey,
        ],
        [
          aliceBlindingPubkey,
          aliceBlindingPubkey,
          bobBlindingPubkey,
          bobBlindingPubkey,
        ],
      );
      const endBlindingTx = performance.now();
      const startSigningTx = performance.now();
      psbt.signInput(0, keyPair);
      psbt.signInput(1, keyPair2);
      psbt.validateSignaturesOfAllInputs();
      const endSigningTx = performance.now();
      const startFinalizingTx = performance.now();
      psbt.finalizeAllInputs();
      psbt.extractTransaction().toHex();
      const endFinalizingTx = performance.now();
      const endTotal = performance.now();

      craftingTx.push(endCraftingTx - startCraftingTx);
      blindingTx.push(endBlindingTx - startBlindingTx);
      signingTx.push(endSigningTx - startSigningTx);
      finalizingTx.push(endFinalizingTx - startFinalizingTx);
      total.push(endTotal - startTotal);
    }
    document.getElementById('content').innerHTML += `
      <div id='confSwap'>
        <h3> Confidential swap </h3>
        <h4> Iterations: ${NUM_ITERATIONS} </h4>
        Average crafting tx: ${craftingTx.reduce((x, y) => x + y, 0) /
      craftingTx.length}ms <br />
        Average blinding tx: ${blindingTx.reduce((x, y) => x + y, 0) /
      blindingTx.length}ms <br />
        Average signing tx: ${signingTx.reduce((x, y) => x + y, 0) /
      signingTx.length}ms <br />
        Average finalizing tx: ${finalizingTx.reduce((x, y) => x + y, 0) /
      finalizingTx.length}ms <br />
        Average total: ${total.reduce((x, y) => x + y, 0) / total.length}ms
      </div>
    `;
  });
});
