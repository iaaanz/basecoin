import { Block } from './block.js';

var getGenesisBlock = () => {
  return new Block(
    0,
    '0',
    1465154705,
    'primeira block gerado',
    '816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7'
  );
};

export { getGenesisBlock };
