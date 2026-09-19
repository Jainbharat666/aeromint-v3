const { ethers } = require('ethers');
const fs = require('fs');

async function inspectFast() {
  const rpc = 'https://rpc.mainnet.chain.robinhood.com';
  const hexBlock = '0x' + (67142961).toString(16);
  
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
  console.log(`Fetched Block #67142961 directly! Total txs: ${txs.length}`);

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

  const purposeCounts = {};
  details.forEach(d => {
    purposeCounts[d.purpose] = (purposeCounts[d.purpose] || 0) + 1;
  });

  console.log('=== PURPOSE BREAKDOWN OF 147 TXS ===');
  console.log(JSON.stringify(purposeCounts, null, 2));

  console.log('\n=== ALL 147 TRANSACTIONS IN BLOCK #67142961 ===');
  console.log('| # | TxHash | From | Purpose | MaxFee (Gwei) | Tip (Gwei) | Value |');
  console.log('| :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
  details.forEach(d => {
    console.log(`| ${d.index} | ${d.hash.slice(0, 10)}... | ${d.from.slice(0, 8)}... | ${d.purpose} | ${d.maxFeeGwei} | ${d.priorityTipGwei} | ${d.valueEth} ETH |`);
  });

  fs.writeFileSync('scripts/block_67142961_147_txs.json', JSON.stringify(details, null, 2));
}

inspectFast();
