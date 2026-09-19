const { ethers } = require('ethers');
const rpc = 'https://rpc.mainnet.chain.robinhood.com';
const provider = new ethers.JsonRpcProvider(rpc);

async function inspectBlock61() {
  const blockNum = 67142961;
  const block = await provider.getBlock(blockNum, true);
  console.log(`Analyzing ${block.transactions.length} transactions in Block #${blockNum}...`);

  const txDetails = [];
  
  // Fetch transactions in parallel batches of 20
  const txHashes = block.transactions;
  for (let i = 0; i < txHashes.length; i += 20) {
    const batch = txHashes.slice(i, i + 20);
    const results = await Promise.all(
      batch.map(async (hash) => {
        try {
          const tx = await provider.getTransaction(hash);
          const receipt = await provider.getTransactionReceipt(hash);
          
          let purpose = 'Contract Call / Other';
          if (!tx.to) {
            purpose = 'Contract Creation';
          } else if (tx.data === '0x' || !tx.data) {
            purpose = 'ETH Transfer';
          } else if (tx.to.toLowerCase() === '0x00005ea00ac477b1030ce78506496e8c2de24bf5') {
            purpose = 'SeaDrop (NFT Mint Attempt)';
          } else if (tx.data.startsWith('0xa9059cbb')) {
            purpose = 'ERC20 / Token Transfer';
          } else if (tx.data.startsWith('0x23b872dd')) {
            purpose = 'TransferFrom (NFT / ERC20)';
          } else if (tx.data.startsWith('0x38ed1739') || tx.data.startsWith('0x18cbafe5') || tx.data.startsWith('0x7ff36ab5')) {
            purpose = 'DEX Swap / Trade';
          }

          const prio = tx.maxPriorityFeePerGas ? ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') : '0';
          const maxFee = tx.maxFeePerGas ? ethers.formatUnits(tx.maxFeePerGas, 'gwei') : (tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : '0');
          const status = receipt ? (receipt.status === 1 ? 'SUCCESS' : 'REVERTED') : 'N/A';
          const gasUsed = receipt ? receipt.gasUsed.toString() : 'N/A';

          return {
            hash: tx.hash,
            from: tx.from,
            to: tx.to || 'Created Contract',
            value: ethers.formatEther(tx.value),
            maxFee,
            priorityTip: prio,
            gasUsed,
            status,
            purpose,
            method: tx.data.slice(0, 10)
          };
        } catch (e) {
          return { hash, error: e.message };
        }
      })
    );
    txDetails.push(...results);
  }

  // Summary statistics
  console.log('\n=== SUMMARY OF BLOCK #67142961 ===');
  console.log('Total Txs:', txDetails.length);
  const purposes = {};
  let minTip = Infinity, maxTip = -Infinity, totalTip = 0;
  for (const t of txDetails) {
    if (!t.error) {
      purposes[t.purpose] = (purposes[t.purpose] || 0) + 1;
      const tipVal = parseFloat(t.priorityTip);
      if (tipVal < minTip) minTip = tipVal;
      if (tipVal > maxTip) maxTip = tipVal;
      totalTip += tipVal;
    }
  }
  console.log('Purpose Breakdown:', JSON.stringify(purposes, null, 2));
  console.log(`Priority Tips -> Min: ${minTip} Gwei | Max: ${maxTip} Gwei | Avg: ${(totalTip/txDetails.length).toFixed(4)} Gwei`);

  // Print first 30 transactions as samples
  console.log('\n=== SAMPLE TRANSACTIONS (Top 25) ===');
  console.log('| # | From | To | Purpose | MaxFee (Gwei) | Tip (Gwei) | Status |');
  console.log('| :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
  txDetails.slice(0, 25).forEach((t, idx) => {
    console.log(`| ${idx+1} | ${t.from?.slice(0,8)}... | ${t.to?.slice(0,8)}... | ${t.purpose} | ${parseFloat(t.maxFee).toFixed(4)} | ${parseFloat(t.priorityTip).toFixed(4)} | ${t.status} |`);
  });

  // Also write full json report to a file so everything is recorded
  const fs = require('fs');
  fs.writeFileSync('scripts/block_67142961_full_report.json', JSON.stringify(txDetails, null, 2));
  console.log('\nFull 147 transactions report written to scripts/block_67142961_full_report.json');
}

inspectBlock61();
