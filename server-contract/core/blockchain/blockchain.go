package blockchain

import "math/big"

// BlockChainAccess interface for accessing any kind of block chain
type BlockChainAccess interface {
	NewWallet() (string, string)
	FindTokenAccount(contractAddress string, walletAddress string) (string, error)
	NewTokenAccount(contractAddress string, walletAddress string) (string, error)
	QueryCoin(address string) (*big.Int, error)
	QueryToken(address string, contractAddress string) (*big.Int, error)
	TransferCoin(from, to string, value *big.Int) (string, error)
	TransferToken(from, to string, value *big.Int, contractAddress string) (string, error)
	MintNFT(to string, contractAddress string, tokenId uint64, tokenUri string) (string, error)
	TransferNFT(from, to string, contractAddress string, tokenId uint64) (string, error)
	ConfirmTransaction(txhash string) (bool, error)
}
