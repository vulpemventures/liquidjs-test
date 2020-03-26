'use strict';
const RpcClient = require('node-json-rpc2');

class JsonRpc {
  constructor(config) {
    this.config = config;
    this.client = new RpcClient.Client(config);
  }

  call(method, params) {
    return new Promise((resolve, reject) => {
      this.client.call({
        method, //Mandatory
        params, //Will be [] by default
      }, (err, res) => {
        if (err) {
          //Do something
          reject(err);
        }

        resolve(res);
      });
    })
  }
}

module.exports = JsonRpc;