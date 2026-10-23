/** True when a MetaMask-style wallet is injected; kept apart from the chain code so checking never loads viem. */
export const hasMetaMask = () => typeof window !== 'undefined' && !!window.ethereum
