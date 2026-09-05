const { ethers } = require('./node_modules/ethers');

async function test() {
  const RPC_URL = 'https://rpc.robinhood.com';
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    const blockNum = await provider.getBlockNumber();
    console.log('Current block:', blockNum);

    const contractAddr = '0x2b0dce71e8911d14b8bfc9b586efca75a9b96017';
    const code = await provider.getCode(contractAddr);
    console.log('Contract code length:', code.length);

    // Let's check SeaDrop contract
    const SEADROP_ADDRESS = '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5';
    const seadropCode = await provider.getCode(SEADROP_ADDRESS);
    console.log('SeaDrop code length:', seadropCode.length);

    const seadropAbi = [
      'function getPublicDrop(address nftContract) view returns (tuple(uint80 mintPrice, uint48 startTime, uint48 endTime, uint16 maxTotalMintableByWallet, uint16 feeBps, bool restrictFeeRecipients))',
      'function getFeeRecipient(address nftContract) view returns (address)'
    ];
    const seadrop = new ethers.Contract(SEADROP_ADDRESS, seadropAbi, provider);
    const drop = await seadrop.getPublicDrop(contractAddr);
    console.log('Drop info:', drop);

    const feeRecipient = await seadrop.getFeeRecipient(contractAddr);
    console.log('Fee recipient:', feeRecipient);

  } catch (err) {
    console.error('Error:', err);
  }
}

test();
