const { ethers } = require('ethers');
const rpc = 'https://rpc.mainnet.chain.robinhood.com';
const provider = new ethers.JsonRpcProvider(rpc);

async function checkAllBlocksParallel() {
  const blockNumbers = [];
  for (let b = 67142956; b <= 67142990; b++) {
    blockNumbers.push(b);
  }

  const results = await Promise.all(
    blockNumbers.map(async (b) => {
      try {
        const block = await provider.getBlock(b);
        const ist = new Date(block.timestamp * 1000 + 5.5 * 3600 * 1000).toISOString().replace('Z', ' IST');
        const txCount = block.transactions.length;
        const baseFee = block.baseFeePerGas ? ethers.formatUnits(block.baseFeePerGas, 'gwei') : 'N/A';
        return {
          block: b,
          ist: ist.substring(11, 23),
          txCount,
          baseFee,
          gasUsed: block.gasUsed.toString()
        };
      } catch (e) {
        return { block: b, ist: 'Err', txCount: 0, baseFee: 'Err', gasUsed: '0' };
      }
    })
  );

  console.log('| Block Number | Time (IST) | Total Transactions | Base Fee (Gwei) | Gas Used |');
  console.log('| :--- | :--- | :--- | :--- | :--- |');
  for (const r of results) {
    console.log(`| #${r.block} | ${r.ist} | ${r.txCount} | ${r.baseFee} | ${r.gasUsed} |`);
  }
}
checkAllBlocksParallel();
