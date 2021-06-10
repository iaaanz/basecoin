var generateNextBlock = (blockData) => {
  var previosuBlock = getLatestBlock();
  var nextIndex = previosuBlock.index + 1;
  var nextTimestamp = new Date().getTime() / 1000;
  var nextHash = calculateHash(nextIndex, previosuBlock.hash, nextTimestamp, blockdata);

  return new Block(nextIndex, previosuBlock.hash, nextTimestamp, blockData, nextHash);
};
