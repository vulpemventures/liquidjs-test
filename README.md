# Liquid transaction example

## Requirements 

* Node/NPM
* Docker/Docker compose
* [Nigiri](https://nigiri.vulpem.com)

## Usage

### Install 
* Install dependencies with `npm install`

### Run Nigiri

* Start Docker
* Run in a console tab   `nigiri start --liquid`

### Test one or multiple scripts

* Test legacy addresses `node legacy`
* Test native segwit `node native-segwit`
* test wrapped segwit `node wrapped-segwit`

### Broadcast 

* Open via browser [localhost:5001/tx/push](http://localhost:5001/tx/push)
* Copy and paste the hex encoded transaction

