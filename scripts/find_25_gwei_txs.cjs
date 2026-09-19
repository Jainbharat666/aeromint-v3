const { ethers } = require('ethers');

async function find25GweiTxs() {
  const rpc = 'https://rpc.mainnet.chain.robinhood.com';
  const provider = new ethers.JsonRpcProvider(rpc);

  const blocks = [67142961, 67142962];
  
  for (const blockNum of blocks) {
    const hexBlock = '0x' + blockNum.toString(16);
    const response = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBlockByNumber',
        params: [hexBlock, true]
      })
    });
    const res = await response.json();
    const txs = res.result.transactions;

    console.log(`\n========================================`);
    console.log(`=== BLOCK #${blockNum} (Total Txs: ${txs.length}) ===`);
    console.log(`========================================`);

    // Filter txs with priority fee around 0.20 to 0.30 Gwei (including 0.25 Gwei)
    const targetTxs = [];
    for (const tx of txs) {
      const prio = tx.maxPriorityFeePerGas ? parseFloat(ethers.formatUnits(BigInt(tx.maxPriorityFeePerGas), 'gwei')) : 0;
      if (prio >= 0.20 && prio <= 0.30) {
        targetTxs.push({ tx, prio });
      }
    }

    console.log(`Found ${targetTxs.length} transactions with ~0.20 - 0.30 Gwei tip in Block #${blockNum}`);
    
    // Fetch receipts for these target txs
    const detailed = await Promise.all(
      targetTxs.map(async ({ tx, prio }) => {
        const receipt = await provider.getTransactionReceipt(tx.hash);
        let purpose = 'Other Contract';
        if (tx.to && tx.to.toLowerCase() === '0x00005ea00ac477b1030ce78506496e8c2de24bf5') {
          purpose = 'SeaDrop (NFT Mint)';
        } else if (!tx.input || tx.input === '0x') {
          purpose = 'ETH Transfer';
        }
        const maxFee = tx.maxFeePerGas ? parseFloat(ethers.formatUnits(BigInt(tx.maxFeePerGas), 'gwei')).toFixed(4) : 'N/A';
        const status = receipt ? (receipt.status === 1 ? 'SUCCESS (1)' : 'REVERTED (0)') : 'Pending';
        const gasUsed = receipt ? receipt.gasUsed.toString() : 'N/A';
        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          prio: prio.toFixed(4),
          maxFee,
          status,
          gasUsed,
          purpose
        };
      })
    );

    console.log(`| # | Tx Hash | From | Purpose | Tip (Gwei) | MaxFee | Status | Gas Used |`);
    console.log(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
    detailed.forEach((d, idx) => {
      console.log(`| ${idx+1} | ${d.hash.slice(0, 14)}... | ${d.from.slice(0, 10)}... | ${d.purpose} | ${d.prio} | ${d.maxFee} | ${d.status} | ${d.gasUsed} |`);
    });
  }
}

find25GweiTxs();
