import type { EIP1193Provider } from 'viem'

// Other wallet extensions also claim window.ethereum and can swallow the request (an "evmAsk.js Unexpected error"
// before MetaMask ever opens). EIP-6963 lets each wallet announce itself, so we pick MetaMask by its id.
let announced: EIP1193Provider | undefined
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event) => {
    const { info, provider } = (event as CustomEvent<{ info: { rdns: string }; provider: EIP1193Provider }>).detail
    if (info.rdns === 'io.metamask') announced = provider
  })
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}

/** MetaMask itself when it announces itself (EIP-6963), otherwise whatever wallet sits on window.ethereum. */
export const metaMaskProvider = (): EIP1193Provider | undefined =>
  announced ?? (typeof window === 'undefined' ? undefined : window.ethereum)

/** True when a wallet is available; kept apart from the chain code so checking never loads viem. */
export const hasMetaMask = () => !!metaMaskProvider()
