import { ethers } from "ethers";
import FACTORY_ABI from "./abis/factory.json" assert { type: "json" };
import SWAP_ROUTER_ABI from "./abis/swaprouter.json" assert { type: "json" };
import POOL_ABI from "./abis/pool.json" assert { type: "json" };
import TOKEN_IN_ABI from "./abis/token.json" assert { type: "json" };
import LENDING_POOL_ABI from "./abis/lendingpool.json" assert { type: "json" };
import dotenv from "dotenv";

dotenv.config();

const POOL_FACTORY_CONTRACT_ADDRESS =
  "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
const SWAP_ROUTER_CONTRACT_ADDRESS =
  "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
const LENDING_POOL_ADDRESS = 
  "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const factoryContract = new ethers.Contract(
  POOL_FACTORY_CONTRACT_ADDRESS,
  FACTORY_ABI,
  provider
);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const lendingPool = new ethers.Contract(
  LENDING_POOL_ADDRESS,
  LENDING_POOL_ABI,
  signer
);

//Part A - Input Token Configuration
const USDC = {
  chainId: 11155111,
  address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
  decimals: 6,
  symbol: "USDC",
  name: "USD//C",
  isToken: true,
  isNative: true,
  wrapped: false,
};

const AAVE = {
  chainId: 11155111,
  address: "0x88541670e55cc00beefd87eb59edd1b7c511ac9a",
  decimals: 18,
  symbol: "AAVE",
  name: "AAVE",
  isToken: true,
  isNative: true,
  wrapped: false,
};

//Part B - Write Approve Token Function
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), USDC.decimals);
    const approveTransaction = await tokenContract.approve.populateTransaction(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      approveAmount
    );
    const transactionResponse =
      await wallet.sendTransaction(approveTransaction);
    console.log(`-------------------------------`);
    console.log(`Sending Approval Transaction...`);
    console.log(`-------------------------------`);
    console.log(`Transaction Sent: ${transactionResponse.hash}`);
    console.log(`-------------------------------`);
    const receipt = await transactionResponse.wait();
    console.log(
      `Approval Transaction Confirmed! https://sepolia.etherscan.io/tx/${receipt.hash}`
    );
  } catch (error) {
    console.error("An error occurred during token approval:", error);
    throw new Error("Token approval failed");
  }
}

//Part C - Write Get Pool Info Function
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
  const poolAddress = await factoryContract.getPool(
    tokenIn.address,
    tokenOut.address,
    3000
  );
  if (!poolAddress) {
    throw new Error("Failed to get pool address");
  }
  const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);
  return { poolContract, token0, token1, fee };
}

//Part D - Write Prepare Swap Params Function
async function prepareSwapParams(poolContract, signer, amountIn) {
  return {
    tokenIn: USDC.address,
    tokenOut: AAVE.address,
    fee: await poolContract.fee(),
    recipient: signer.address,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };
}

// Get AAVE Token Balance
async function getTokenBalance(tokenAddress, wallet) {
  const tokenContract = new ethers.Contract(tokenAddress, TOKEN_IN_ABI, wallet);
  const balance = await tokenContract.balanceOf(wallet.address);
  return ethers.formatUnits(balance, AAVE.decimals);
}

//Part E - Write Execute Swap Function
async function executeSwap(swapRouter, params, signer) {
  // Get AAVE Token Balance before the swap
  const AAVEBalanceBefore = await getTokenBalance(AAVE.address, signer);

  // Execute the swap
  const transaction =
    await swapRouter.exactInputSingle.populateTransaction(params);
  const transactionResponse = await signer.sendTransaction(transaction);
  console.log(`-------------------------------`);
  console.log(`Transaction Sent: ${transactionResponse.hash}`);
  console.log(`-------------------------------`);

  // Wait for the transaction to be confirmed
  const receipt = await transactionResponse.wait();
  console.log(
    `Transaction Confirmed: https://sepolia.etherscan.io/tx/${receipt.hash}`
  );
  console.log(`-------------------------------`);

  // Get the AAVE balance after the swap
  const AAVEBalanceAfter = await getTokenBalance(AAVE.address, signer);

  // Calculate the swapped amount
  const swappedAmount = AAVEBalanceAfter - AAVEBalanceBefore;
  console.log(`Swapped AAVE Amount: ${swappedAmount}`);

  return swappedAmount;
}

async function authorizeLendingPool(tokenAddress, amount, wallet) {
  const tokenContract = new ethers.Contract(tokenAddress, TOKEN_IN_ABI, wallet);
  const formattedAmount = ethers.parseUnits(amount.toString(), AAVE.decimals);
  
  console.log(`Granting lending pool permission for ${formattedAmount} AAVE...`);
  
  const tx = await tokenContract.approve(LENDING_POOL_ADDRESS, formattedAmount);
  const receipt = await tx.wait();
  
  if (receipt.status === 1) {
    console.log("Lending pool authorization successful.");
  } else {
    console.error("Failed to authorize lending pool.");
  }
}

async function depositToAave(lendingPool, amount, tokenAddress, wallet) {
  const formattedAmount = ethers.parseUnits(amount.toString(), AAVE.decimals);
  
  console.log(`Depositing ${formattedAmount} AAVE to Aave...`);
  
  const tx = await lendingPool.supply(tokenAddress, formattedAmount, wallet.address, 0, { gasLimit: 500000 });
  const receipt = await tx.wait();
  
  if (receipt.status === 1) {
    console.log(`Deposit successful. Transaction: https://sepolia.etherscan.io/tx/${tx.hash}`);
  } else {
    console.error("Failed to deposit to Aave.");
  }
}

async function main(swapAmount) {
  const inputAmount = swapAmount;
  const amountIn = ethers.parseUnits(inputAmount.toString(), USDC.decimals);

  try {
    await approveToken(USDC.address, TOKEN_IN_ABI, inputAmount, signer);

    const { poolContract } = await getPoolInfo(factoryContract, USDC, AAVE);
    const params = await prepareSwapParams(poolContract, signer, amountIn);
    const swapRouter = new ethers.Contract(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      SWAP_ROUTER_ABI,
      signer
    );

    const swappedAmount = await executeSwap(swapRouter, params, signer);

    await authorizeLendingPool(AAVE.address, swappedAmount, signer);
    await depositToAave(lendingPool, swappedAmount, AAVE.address, signer);
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

main(1);
