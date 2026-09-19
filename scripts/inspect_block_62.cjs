const { ethers } = require('ethers');
const fs = require('fs');

async function inspectBlock62() {
  const rpc = 'https://rpc.mainnet.chain.robinhood.com';
  const hexBlock = '0x' + (67142962).toString(16);
  
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
  const block = res.result;
  const txs = block.transactions;
  console.log(`Fetched Block #67142962 directly! Total txs: ${txs.length}`);

  const details = txs.map((tx, idx) => {
    let purpose = 'Contract Call / Other';
    if (!tx.to) {
      purpose = 'Contract Deployment';
    } else if (!tx.input || tx.input === '0x') {
      purpose = 'ETH Transfer';
    } else if (tx.to.toLowerCase() === '0x00005ea00ac477b1030ce78506496e8c2de24bf5') {
      purpose = 'SeaDrop (NFT Mint Attempt)';
    } else if (tx.input.startsWith('0xa9059cbb')) {
      purpose = 'Token / ERC20 Transfer';
    } else if (tx.input.startsWith('0x23b872dd')) {
      purpose = 'TransferFrom (NFT / Token)';
    } else if (tx.input.startsWith('0x38ed1739') || tx.input.startsWith('0x18cbafe5') || tx.input.startsWith('0x7ff36ab5')) {
      purpose = 'DEX Swap / Trade';
    }

    const prio = tx.maxPriorityFeePerGas ? ethers.formatUnits(BigInt(tx.maxPriorityFeePerGas), 'gwei') : '0';
    const maxFee = tx.maxFeePerGas ? ethers.formatUnits(BigInt(tx.maxFeePerGas), 'gwei') : (tx.gasPrice ? ethers.formatUnits(BigInt(tx.gasPrice), 'gwei') : '0');
    const valueEth = ethers.formatEther(BigInt(tx.value || '0x0'));

    return {
      index: idx + 1,
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      valueEth,
      maxFeeGwei: parseFloat(maxFee).toFixed(4),
      priorityTipGwei: parseFloat(prio).toFixed(4),
      purpose,
      inputMethod: tx.input ? tx.input.slice(0, 10) : '0x'
    };
  });

  const counts = {};
  const tipBuckets = {'3.0+ Gwei': 0, '2.0-3.0 Gwei': 0, '1.0-2.0 Gwei': 0, '0.5-1.0 Gwei': 0, '0.2-0.5 Gwei': 0, '< 0.2 Gwei': 0};

  details.forEach(d => {
    counts[d.purpose] = (counts[d.purpose] || 0) + 1;
    const tip = parseFloat(d.priorityTipGwei);
    if (tip >= 3.0) tipBuckets['3.0+ Gwei']++;
    else if (tip >= 2.0) tipBuckets['2.0-3.0 Gwei']++;
    else if (tip >= 1.0) tipBuckets['1.0-2.0 Gwei']++;
    else if (tip >= 0.5) tipBuckets['0.5-1.0 Gwei']++;
    else if (tip >= 0.2) tipBuckets['0.2-0.5 Gwei']++;
    else tipBuckets['< 0.2 Gwei']++;
  });

  console.log('=== SUMMARY OF BLOCK #67142962 ===');
  console.log('Total Txs:', details.length);
  console.log('Purpose Counts:', JSON.stringify(counts, null, 2));
  console.log('Tip Distribution:', JSON.stringify(tipBuckets, null, 2));

  console.log('\n=== SAMPLE TRANSACTIONS (Top 20) ===');
  details.slice(0, 20).forEach(d => {
    console.log(`| ${d.index} | ${d.hash.slice(0, 10)}... | ${d.from.slice(0, 8)}... | ${d.purpose} | ${d.maxFeeGwei} | ${d.priorityTipGwei} |`);
  });

  fs.writeFileSync('scripts/block_67142962_212_txs.json', JSON.stringify(details, null, 2));
}

inspectBlock62();
