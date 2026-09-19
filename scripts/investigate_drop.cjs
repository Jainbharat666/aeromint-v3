const { ethers } = require('ethers');
const rpc = 'https://robinhood-mainnet.g.alchemy.com/v2/alch_FtrEfyyJYzEBZ0SQ3ctbJ';
const provider = new ethers.JsonRpcProvider(rpc);

async function investigate() {
  const targetContract = '0x80121df5f70b20c85d764468252282d053177e8a';
  const targetUtcTime = Math.floor(new Date('2026-09-19T14:10:00.000Z').getTime() / 1000);
  console.log('Target UTC Unix Time:', targetUtcTime, 'ISO:', new Date(targetUtcTime * 1000).toISOString());

  const latestBlock = await provider.getBlock('latest');
  console.log('Latest Block:', latestBlock.number, 'Time:', new Date(latestBlock.timestamp * 1000).toISOString());

  // Binary search to find block with timestamp matching targetUtcTime
  let low = latestBlock.number - 50000;
  let high = latestBlock.number;
  let targetBlock = null;

  while (low <= high) {
    let mid = Math.floor((low + high) / 2);
    let b = await provider.getBlock(mid);
    if (!b) { high = mid - 1; continue; }
    if (Math.abs(b.timestamp - targetUtcTime) <= 1) {
      targetBlock = b;
      break;
    }
    if (b.timestamp < targetUtcTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (!targetBlock) {
    targetBlock = await provider.getBlock(low);
  }

  console.log('Target Drop Block:', targetBlock.number, 'Timestamp:', targetBlock.timestamp, 'Time:', new Date(targetBlock.timestamp * 1000).toISOString());

  const seadropAddr = '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5'.toLowerCase();
  const seadropSecondary = '0x6B0183AC4446863D85B6a5D9c34888E8f4d2dC66'.toLowerCase();

  // Scan 40 blocks around the drop
  for (let bn = targetBlock.number - 10; bn <= targetBlock.number + 30; bn++) {
    const fullBlock = await provider.getBlock(bn, true);
    if (!fullBlock) continue;
    
    // Find all transactions touching the target NFT contract or SeaDrop
    const txs = fullBlock.prefetchedTransactions.filter(t => {
      const to = (t.to || '').toLowerCase();
      return to === targetContract.toLowerCase() || to === seadropAddr || to === seadropSecondary;
    });

    if (txs.length > 0) {
      console.log(`\n======================================================`);
      console.log(`📦 Block #${bn} | Timestamp: ${new Date(fullBlock.timestamp * 1000).toISOString()} | Total Txs: ${fullBlock.transactions.length}`);
      console.log(`======================================================`);
      for (const t of txs) {
        const receipt = await provider.getTransactionReceipt(t.hash);
        console.log(`  Hash: ${t.hash}`);
        console.log(`  From: ${t.from} -> To: ${t.to}`);
        console.log(`  Method Selector: ${t.data.slice(0, 10)} | Value: ${ethers.formatEther(t.value)} ETH`);
        console.log(`  GasPrice: ${ethers.formatUnits(t.gasPrice || t.maxFeePerGas || 0, 'gwei')} Gwei | MaxPriority: ${ethers.formatUnits(t.maxPriorityFeePerGas || 0, 'gwei')} Gwei`);
        console.log(`  Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ REVERTED'} | GasUsed: ${receipt.gasUsed.toString()}`);
      }
    }
  }

  // Also query SeaDrop contract for the public drop configuration of targetContract
  console.log('\n--- Querying SeaDrop Public Drop Info for Contract ---');
  const seadropAbi = [
    'function getPublicDrop(address nftContract) view returns (tuple(uint80 mintPrice, uint48 startTime, uint48 endTime, uint16 maxTotalMintableByWallet, uint16 feeBps, bool restrictFeeRecipients))',
    'function getAllowListApproval(address nftContract, address minter) view returns (bool)'
  ];
  const seadropContract = new ethers.Contract(seadropAddr, seadropAbi, provider);
  try {
    const publicDrop = await seadropContract.getPublicDrop(targetContract);
    console.log('PublicDrop Config:', {
      mintPrice: ethers.formatEther(publicDrop.mintPrice),
      startTime: new Date(Number(publicDrop.startTime) * 1000).toISOString(),
      startTimeUnix: Number(publicDrop.startTime),
      endTime: new Date(Number(publicDrop.endTime) * 1000).toISOString(),
      maxTotalMintableByWallet: Number(publicDrop.maxTotalMintableByWallet),
      feeBps: Number(publicDrop.feeBps),
      restrictFeeRecipients: publicDrop.restrictFeeRecipients
    });
  } catch (e) {
    console.log('Error reading public drop:', e.message);
  }
}

investigate().catch(console.error);
