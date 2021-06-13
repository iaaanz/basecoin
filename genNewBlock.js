import { getLatestBlock } from './server.js';
import { calculateHash } from './calchash.js';
import { Block } from './block.js';

var generateNextBlock = (blockData) => {
  var previosuBlock = getLatestBlock();
  var nextIndex = previosuBlock.index + 1;
  var nextTimestamp = new Date().getTime() / 1000;
  var nextHash = calculateHash(nextIndex, previosuBlock.hash, nextTimestamp, blockData);

  return new Block(nextIndex, previosuBlock.hash, nextTimestamp, blockData, nextHash);
};

export { generateNextBlock };
