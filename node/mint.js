const JsonRpc = require('./jsonrpc')
const jsonRpc = new JsonRpc({
  "host": "localhost",
  "port": 7041,
  "user": "admin1",
  "password": "123"
})

const args = process.argv;
const qty = process.argv[2] || 100;
const addr = process.argv[3];

jsonRpc.call('issueasset', [qty, 0, false])
  .then(({ result }) => {
    console.log('Asset minted! ' + result.asset);

    if (addr)
      return jsonRpc.call('sendtoaddress', [addr, qty, "", "", false, true, 1, "UNSET", result.asset])

  return
  }).then(() => {
    return jsonRpc.call('generate', [1])
  })
  .then(({result}) => {
    console.log('tx mined ' + result)
  })
  .catch(console.error)