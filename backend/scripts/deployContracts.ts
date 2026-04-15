import fs from 'fs';
import path from 'path';
import solc from 'solc';
import {ethers} from 'ethers';

const RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org';
const PRIVATE_KEY = process.env.DEV_WALLET_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error('DEV_WALLET_PRIVATE_KEY is required in backend/.env');
}
const REQUIRED_PRIVATE_KEY: string = PRIVATE_KEY;

function compileContracts() {
  const contractsDir = path.resolve(__dirname, '../contracts');
  const sources: Record<string, {content: string}> = {};

  for (const file of fs.readdirSync(contractsDir)) {
    if (file.endsWith('.sol')) {
      const abs = path.join(contractsDir, file);
      sources[file] = {content: fs.readFileSync(abs, 'utf8')};
    }
  }

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: {enabled: true, runs: 200},
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const errors = output.errors.filter((e: any) => e.severity === 'error');
    if (errors.length > 0) {
      throw new Error(errors.map((e: any) => e.formattedMessage).join('\n'));
    }
  }

  return output.contracts;
}

async function main() {
  const compiled = compileContracts();
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(REQUIRED_PRIVATE_KEY, provider);

  console.log('Deployer:', wallet.address);
  console.log('Network chainId:', (await provider.getNetwork()).chainId.toString());

  const tokenCompiled = compiled['OffgridTestToken.sol']['OffgridTestToken'];
  const settlementCompiled = compiled['OffgridSettlementLog.sol']['OffgridSettlementLog'];

  const tokenFactory = new ethers.ContractFactory(
    tokenCompiled.abi,
    tokenCompiled.evm.bytecode.object,
    wallet,
  );

  const initialSupply = ethers.parseUnits('1000000', 18); // 1,000,000 oUSD
  const token = await tokenFactory.deploy(initialSupply, wallet.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log('OffgridTestToken:', tokenAddress);

  const settlementFactory = new ethers.ContractFactory(
    settlementCompiled.abi,
    settlementCompiled.evm.bytecode.object,
    wallet,
  );
  const settlement = await settlementFactory.deploy();
  await settlement.waitForDeployment();
  const settlementAddress = await settlement.getAddress();
  console.log('OffgridSettlementLog:', settlementAddress);

  const deployment = {
    network: 'celo-sepolia',
    chainId: 11142220,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    contracts: {
      offgridTestToken: tokenAddress,
      offgridSettlementLog: settlementAddress,
    },
  };

  const outPath = path.resolve(__dirname, '../deployed.sepolia.json');
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log('Saved deployment:', outPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
