const { ethers } = require('ethers');
const rpc = 'https://rpc.mainnet.chain.robinhood.com';
const provider = new ethers.JsonRpcProvider(rpc);

async function getBlockMints() {
  const target = '0x80121df5f70b20c85d764468252282d053177e8a';
  const logs = await provider.getLogs({
    address: target,
    fromBlock: 67142950,
    toBlock: 67142970,
    topics: [ethers.id('Transfer(address,address,uint256)')]
  });

  const blockMap = {};
  for (const log of logs) {
    if (log.topics[1] === ethers.ZeroHash) {
      if (!blockMap[log.blockNumber]) blockMap[log.blockNumber] = 0;
      blockMap[log.blockNumber]++;
    }
  }

  console.log('=== BLOCK-BY-BLOCK MINT BREAKDOWN ===');
  for (const blockNum of Object.keys(blockMap).map(Number).sort((a,b)=>a-b)) {
    const block = await provider.getBlock(blockNum);
    const utc = new Date(block.timestamp * 1000).toISOString();
    const ist = new Date(block.timestamp * 1000 + 5.5 * 3600 * 1000).toISOString().replace('Z', ' IST');
    console.log(`Block #${blockNum} | Time (UTC): ${utc} | Time (IST): ${ist} | Minted: ${blockMap[blockNum]} NFTs`);
  }
}
getBlockMints();
