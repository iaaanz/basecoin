var replaceChain = (newBlocks) => {
  if (isValidChain(newBlocks) && newBlock.length > blockchain.length) {
    console.log(
      'Received blockchain is valid. Replacing current blockchain with received blockchain'
    );
    blockchain = newBlocks;
    broadcast(responseLatestMsg());
  } else {
    console.log('Received blockchain invalid');
  }
};

export { replaceChain };
