const { ethers } = require('ethers');
const rpc = 'https://robinhood-mainnet.g.alchemy.com/v2/alch_FtrEfyyJYzEBZ0SQ3ctbJ';
const provider = new ethers.JsonRpcProvider(rpc);

async function checkSuccessBlocks() {
  const targetContract = '0x80121df5f70b20c85d764468252282d053177e8a';
  const seadropAddr = '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5';

  const seadropContract = new ethers.Contract(seadropAddr, [
    'function getPublicDrop(address) view returns (tuple(uint80 mintPrice, uint48 startTime, uint48 endTime, uint16 maxTotalMintableByWallet, uint16 feeBps, bool restrictFeeRecipients))'
  ], provider);

  const pd = await seadropContract.getPublicDrop(targetContract);
  console.log('PUBLIC DROP ON-CHAIN CONFIG:');
  console.log('  startTime:', Number(pd.startTime), '->', new Date(Number(pd.startTime)*1000).toISOString());
  console.log('  endTime:', Number(pd.endTime), '->', new Date(Number(pd.endTime)*1000).toISOString());
  console.log('  maxTotalMintableByWallet:', Number(pd.maxTotalMintableByWallet));
  console.log('  mintPrice:', ethers.formatEther(pd.mintPrice), 'ETH');

  // Check blocks 67142940 to 67142965 for ANY successful mint
  for (let bn = 67142945; bn <= 67142960; bn++) {
    const b = await provider.getBlock(bn, true);
    if (!b) continue;
    let ok = 0, rev = 0;
    const successfulTxs = [];
    for (const t of b.prefetchedTransactions) {
      if ((t.to || '').toLowerCase() === seadropAddr.toLowerCase()) {
        const r = await provider.getTransactionReceipt(t.hash);
        if (r.status === 1) {
          ok++;
          successfulTxs.push({ hash: t.hash, from: t.from, gasPrice: ethers.formatUnits(t.gasPrice || t.maxFeePerGas || 0, 'gwei'), priority: ethers.formatUnits(t.maxPriorityFeePerGas || 0, 'gwei') });
        } else {
          rev++;
        }
      }
    }
    console.log(`Block #${bn} | Time: ${new Date(b.timestamp*1000).toISOString()} (Unix: ${b.timestamp}) | Success: ${ok} | Reverted: ${rev} | TotalBlockTxs: ${b.transactions.length}`);
    if (successfulTxs.length > 0) {
      console.log('  -> Successful Mint Winners in this block:', JSON.stringify(successfulTxs, null, 2));
    }
  }
}
checkSuccessBlocks().catch(console.error);
