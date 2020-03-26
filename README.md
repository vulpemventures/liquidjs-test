# Liquid tests and examples

## Requirements for Node examples

- Node/NPM
- Docker/Docker compose
- [Nigiri](https://nigiri.vulpem.com)

## Installation

- Install dependencies with `npm install`

## Usage (Node examples)

### Run Nigiri

- Start Docker
- Run in a console tab `nigiri start --liquid`

### Test one or multiple scripts

- Test legacy addresses `node node/legacy`
- Test native segwit `node node/native-segwit`
- test wrapped segwit `node node/wrapped-segwit`

### Broadcast

- Open via browser [localhost:5001/tx/push](http://localhost:5001/tx/push)
- Copy and paste the hex encoded transaction

## Usage (Web tests)

### Run tests in the browser

- Open the `web/index.html` in your preferred browser and just wait for mocha to run the tests

NOTE: each test is repeated [10 times](web/tests/index.js#L2) by the default to calculate an average execution time for Psbt operations. Do not panic if the page doesn't seem to respond :).
