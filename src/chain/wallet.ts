// Dashboard helpers around the handoff kit (krsiChain.ts / onchain.ts stay as delivered so `npm run sync` can refresh them).
import { BaseError, ContractFunctionRevertedError, createPublicClient, http, zeroAddress, type Abi, type Hex } from 'viem'
import { arbitrumSepolia } from 'viem/chains'
import resolverAbi from './abis/KrsiKycResolver.json'
import { addresses, userRef } from './krsiChain'
import { metaMaskProvider } from './metamask'

const reader = createPublicClient({ chain: arbitrumSepolia, transport: http() })

/** The MetaMask account selected right now (asks to connect the site if needed). */
export async function connectWallet(): Promise<Hex> {
  const provider = metaMaskProvider()
  if (!provider) throw new Error('MetaMask is not installed')
  const [account] = (await provider.request({ method: 'eth_requestAccounts' })) as Hex[]
  if (!account) throw new Error('No MetaMask account is selected')
  return account
}

/** The wallet holding a live KYC attestation for this KRSI user, or null when their KYC is not on chain. */
export async function kycWalletOnChain(userId: number): Promise<Hex | null> {
  const wallet = (await reader.readContract({
    address: addresses.kycResolver,
    abi: resolverAbi as Abi,
    functionName: 'verifiedWalletOf',
    args: [userRef(userId)],
  })) as Hex
  return wallet === zeroAddress ? null : wallet
}

/** A readable message for MetaMask rejections and contract reverts (viem puts the revert name in shortMessage). */
export function chainErrorMessage(e: unknown): string {
  let text = e instanceof Error ? e.message : String(e)
  if (e instanceof BaseError) {
    const revert = e.walk((cause) => cause instanceof ContractFunctionRevertedError)
    text = (revert instanceof ContractFunctionRevertedError && (revert.data?.errorName ?? revert.reason)) || e.shortMessage
  }
  if (text.includes('HolderNotVerified')) return "The holder's KYC is not on chain yet. Put it on chain from their Settings page first, then try again."
  if (text.includes('TokenExists')) return 'This receipt is already on chain.'
  if (/rejected|denied/i.test(text)) return 'The request was rejected in MetaMask.'
  return revertName(text) ? `The contract refused: ${text}` : text
}

const revertName = (text: string) => /^[A-Z][A-Za-z0-9]+$/.test(text)
