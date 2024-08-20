# DeFiScript-StackUp
## Overview of Script

Welcome to the Write a DeFi Script Bounty Challenge! This script demonstrates the integration and composability of different DeFi protocols by performing a token swap on Uniswap and then supplying the swapped tokens to Aave to start earning interest.

### Key Features:

1. **Token Swap on Uniswap**: The script swaps USDC for AAVE using Uniswap.
2. **Supply to Aave**: After the swap, the script supplies the AAVE tokens to Aave to yeild interest.

## Diagram Illustration

Below is a diagram illustrating the sequence of steps and interactions between the protocols:
![flowchart](https://github.com/user-attachments/assets/95918b2c-6da5-47c0-8d2b-858da7b5d87e)

### Workflow:

1. **Initialization and Configuration**:

   - Load environment variables using `dotenv`.
   - Define constants for contract addresses and token configurations.
   - Initialize the provider and signer.
   - Create contract instances for the factory, lending pool, and swap router.

2. **Token Approval**:

   - Approve the USDC token for the swap router contract.
   - Function: `approveToken(tokenAddress, tokenABI, amount, wallet)`

3. **Get Pool Information**:

   - Retrieve the pool contract address for the USDC-AAVE pair.
   - Function: `getPoolInfo(factoryContract, tokenIn, tokenOut)`

4. **Prepare Swap Parameters**:

   - Prepare the parameters required for the swap transaction.
   - Function: `prepareSwapParams(poolContract, signer, amountIn)`

5. **Execute Swap**:

   - Execute the swap transaction on the swap router contract.
   - Function: `executeSwap(swapRouter, params, signer)`

6. **Approve Lending Pool**:

   - Approve the AAVE token for the lending pool contract.
   - Function: `authorizeLendingPool(tokenAddress, amount, wallet)`

7. **Supply to Aave**:

   - Supply the swapped AAVE tokens to the Aave lending pool.
   - Function: `depositToAave(lendingPool, amount, tokenAddress, wallet)`

8. **Main Function Execution**:

   - Call the main function with the swap amount.
   - Function: `main(swapAmount)`

## Conclusion

This script demonstrates the integration of Uniswap and Aave protocols to perform a token swap and supply the swapped tokens to earn interest. By following the steps outlined in this README, you can understand the workflow and the interactions between the different DeFi protocols. Feel free to modify the script to suit your needs and explore other DeFi protocols to enhance the functionality further.
