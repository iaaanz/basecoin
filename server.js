import { generateNextBlock } from './genNewBlock.js';
import { Block } from './block.js';
// import { calculateHash, calculateHashForBlock } from './calchash.js';
import { getGenesisBlock } from './genesisBlock.js';
import { isValidNewBlock, replaceChain } from './validateBlock.js';
import bodyParser from 'body-parser';
import express from 'express';
import WebSocket from 'ws';
import CryptoJS from 'crypto-js';

const http_port = process.env.HTTP_PORT || 3001;
const p2p_port = process.env.P2P_PORT || 6001;

var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];
var sockets = [];

var MessageType = {
  QUERY_LATEST: 0,
  QUERY_ALL: 1,
  RESPONSE_BLOCKCHAIN: 2,
};

var blockchain = [getGenesisBlock()];

// Minera um bloco

// LOCAL
// curl http://localhost:3001/mineBlock POST -v -H "Content-type: application/json" -d {\"data\":\"Teste\"}
// REMOTO
//curl http://http://350d7d4d52dc.ngrok.io/mineBlock POST -v -H "Content-type: application/json" -d {\"data\":\"Teste\"}

// Add um peer
// curl http://350d7d4d52dc.ngrok.io/addPeer -v -H "Content-type: application/json" -d {\"peer\":\"ws://localhost:6001\"}

var initHttpServer = () => {
  var app = express();
  app.use(bodyParser.json());

  app.get('/block', (req, res) => res.send(blockchain));
  app.post('/mineBlock', (req, res) => {
    var newBlock = generateNextBlock(req.body.data);
    addBlock(newBlock);
    broadcast(responseLatestMsg());
    console.log(`block added: ${JSON.stringify(newBlock)}`);
    res.send();
  });
  app.get('/peers', (req, res) => {
    res.send(sockets.map((s) => s._socket.remoteAddress + ':' + s._socket.remotePort));
  });
  app.post('/addPeer', (req, res) => {
    connectToPeers([req.body.peer]);
    res.send();
  });
  app.listen(http_port, () => console.log(`Listening http on port: ${http_port}`));
};

var initP2PServer = () => {
  var server = new WebSocket.Server({ port: p2p_port });
  server.on('connection', (ws) => initConnection(ws));
  console.log('listening websocket p2p port on: ' + p2p_port);
};

var initConnection = (ws) => {
  sockets.push(ws);
  initMessageHandler(ws);
  initErrorHandler(ws);
  write(ws, queryChainLengthMsg());
};

var initMessageHandler = (ws) => {
  ws.on('message', (data) => {
    var message = JSON.parse(data);
    console.log('Received message' + JSON.stringify(message));
    switch (message.type) {
      case MessageType.QUERY_LATEST:
        write(ws, responseLatestMsg());
        break;
      case MessageType.QUERY_ALL:
        write(ws, responseChainMsg());
        break;
      case MessageType.RESPONSE_BLOCKCHAIN:
        handleBlockchainResponse(message);
        break;
    }
  });
};

var initErrorHandler = (ws) => {
  var closeConnection = (ws) => {
    console.log('connection failed to peer: ' + ws.url);
    sockets.splice(sockets.indexOf(ws), 1);
  };
  ws.on('close', () => closeConnection(ws));
  ws.on('error', () => closeConnection(ws));
};

var addBlock = (newBlock) => {
  if (isValidNewBlock(newBlock, getLatestBlock())) {
    blockchain.push(newBlock);
  }
};

var connectToPeers = (newPeers) => {
  newPeers.forEach((peer) => {
    var ws = new WebSocket(peer);
    ws.on('open', () => {
      initConnection(ws);
      console.log('connected');
    });
    ws.on('error', () => {
      console.log('connection failed');
    });
  });
};

var handleBlockchainResponse = (message) => {
  var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => b1.index - b2.index);
  var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
  var latestBlockHeld = getLatestBlock();
  if (latestBlockReceived.index > latestBlockHeld.index) {
    console.log(
      'blockchain possibly behind. We got: ' +
        latestBlockHeld.index +
        ' Peer got: ' +
        latestBlockReceived.index
    );
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      console.log('We can append the received block to our chain');
      blockchain.push(latestBlockReceived);
      broadcast(responseLatestMsg());
    } else if (receivedBlocks.length === 1) {
      console.log('We have to query the chain from our peer');
      broadcast(queryAllMsg());
    } else {
      console.log('Received blockchain is longer than current blockchain');
      replaceChain(receivedBlocks);
    }
  } else {
    console.log('received blockchain is not longer than current blockchain. Do nothing');
  }
};

export var getLatestBlock = () => blockchain[blockchain.length - 1];
var queryChainLengthMsg = () => ({ type: MessageType.QUERY_LATEST });
var queryAllMsg = () => ({ type: MessageType.QUERY_ALL });
var responseChainMsg = () => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify(blockchain),
});
var responseLatestMsg = () => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify([getLatestBlock()]),
});

var write = (ws, message) => ws.send(JSON.stringify(message));
var broadcast = (message) => sockets.forEach((socket) => write(socket, message));

connectToPeers(initialPeers);
initHttpServer();
initP2PServer();
