const { ethers } = require('ethers');
const rpc = 'https://rpc.mainnet.chain.robinhood.com';
const provider = new ethers.JsonRpcProvider(rpc);

async function checkFast() {
  const targetContract = '0x80121df5f70b20c85d764468252282d053177e8a';

  for (let from = 67142945; from <= 67142975; from += 5) {
    const to = Math.min(from + 4, 67142975);
    try {
      const logs = await provider.getLogs({
        address: targetContract,
        fromBlock: from,
        toBlock: to,
        topics: [ethers.id('Transfer(address,address,uint256)')]
      });
      console.log(`Blocks ${from}-${to}: Found ${logs.length} mints!`);
      for (const l of logs) {
        const b = await provider.getBlock(l.blockNumber);
        const tx = await provider.getTransaction(l.transactionHash);
        const prio = tx.maxPriorityFeePerGas ? ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') : '0';
        const fee = tx.maxFeePerGas ? ethers.formatUnits(tx.maxFeePerGas, 'gwei') : ethers.formatUnits(tx.gasPrice, 'gwei');
        console.log(`  -> Block #${l.blockNumber} (Time: ${new Date(b.timestamp*1000).toISOString()}) | Fee: ${fee} Gwei | PriorityTip: ${prio} Gwei | From: ${tx.from} | TxHash: ${l.transactionHash}`);
      }
    } catch (e) {
      console.log(`Error in blocks ${from}-${to}:`, e.message);
    }
  }
}

checkFast().catch(console.error);
