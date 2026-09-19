const { ethers } = require('ethers');
const rpc = 'https://robinhood-mainnet.g.alchemy.com/v2/alch_FtrEfyyJYzEBZ0SQ3ctbJ';
const provider = new ethers.JsonRpcProvider(rpc);

const wallets = [
  '0x84088584f3946502EE0F8cCD580C87D05D9e2537',
  '0x3AdCd26B1a4863fbF4470A191a08af57A047A89e',
  '0x5eE1717b2d2E626244A884F3b98BEffA40C6D52f',
  '0xdD9FA243641186DCad613b34FDc49CCFe8702a7b',
  '0xf53Aafbe3F1CeCbb016bb2b0D7ab246fe799B21C',
  '0x3Ac51C78DAC3093005567CA1F2C6cC821bd43eF7',
  '0xAdf599bC9658833D024052EaF5dB1852EAACb82a',
  '0xf8D52aEA78bAb12B1848965efdF9CA17E0F125E8',
  '0x893df8f0cd1A78d759113b341Af090b9856e71d4',
  '0x7B3A5e0671c68F5934De04625019B9E9beD551AF'
];

async function checkWallets() {
  console.log('--- Checking On-Chain State for 10 Worker Wallets ---');
  for (let i = 0; i < wallets.length; i++) {
    const addr = wallets[i];
    const nonce = await provider.getTransactionCount(addr);
    const bal = await provider.getBalance(addr);
    console.log(`Wallet #${i+2} (${addr}): Nonce = ${nonce} | Balance = ${ethers.formatEther(bal)} ETH | Link: https://robinhoodchain.blockscout.com/address/${addr}`);
  }
}
checkWallets().catch(console.error);
