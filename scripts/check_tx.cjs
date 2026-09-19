const { ethers } = require('ethers');
const rpc = 'https://rpc.mainnet.chain.robinhood.com';
const provider = new ethers.JsonRpcProvider(rpc);

async function check() {
  const hash = '0xe7df657faff2e0035e48dd124497ee34246f7f8965246e6ddbf9869ba14daf91';
  try {
    const tx = await provider.getTransaction(hash);
    const receipt = await provider.getTransactionReceipt(hash);
    if (!tx) {
      console.log('Transaction not found on chain');
      return;
    }
    const block = await provider.getBlock(tx.blockNumber);
    console.log('=== TRANSACTION DETAILS ===');
    console.log('Tx Hash:', hash);
    console.log('Block Number:', tx.blockNumber);
    console.log('Timestamp (UTC):', new Date(block.timestamp * 1000).toISOString());
    console.log('Timestamp (IST):', new Date(block.timestamp * 1000 + 5.5 * 3600 * 1000).toISOString().replace('Z', ' IST'));
    console.log('From (Sender):', tx.from);
    console.log('To (Contract/Recipient):', tx.to);
    console.log('Value (ETH):', ethers.formatEther(tx.value));
    console.log('Nonce:', tx.nonce);
    console.log('Status:', receipt ? (receipt.status === 1 ? 'SUCCESS (1)' : 'REVERTED (0)') : 'Pending');
    console.log('Gas Used:', receipt ? receipt.gasUsed.toString() : 'N/A');
    console.log('Gas Price (Gwei):', tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : 'N/A');
    console.log('Max Priority Fee (Gwei):', tx.maxPriorityFeePerGas ? ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') : 'N/A');
    console.log('Method Selector (Calldata first 10 chars):', tx.data.slice(0, 10));
    console.log('Full Calldata Length:', tx.data.length);
    console.log('Logs count:', receipt ? receipt.logs.length : 0);
  } catch (e) {
    console.error('Error:', e);
  }
}
check();
