package blockchain

import (
	"context"
	"crypto/ecdsa"
	"errors"
	"math/big"
	"strings"

	erc20 "github.com/GoROSEN/rosen-opensource/server-contract/core/blockchain/contracts_erc20"
	erc721 "github.com/GoROSEN/rosen-opensource/server-contract/core/blockchain/contracts_erc721"
	"github.com/GoROSEN/rosen-opensource/server-contract/core/config"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/google/martian/log"
)

type GethChainAccess struct {
	client *ethclient.Client
	cfg    *config.BlockchainConfig
}

func NewGethChainAccess(chainCfg *config.BlockchainConfig) (BlockChainAccess, error) {

	client, err := ethclient.Dial(chainCfg.Endpoint)
	if err != nil {
		log.Errorf("cannot create rpc client: %v", err)
		return nil, err
	}
	return &GethChainAccess{client, chainCfg}, nil
}

func (sca *GethChainAccess) NewWallet() (string, string) {
	getPrivateKey, err := crypto.GenerateKey()
	if err != nil {
		log.Errorf("geth cannot create private key: %v", err)
	}
	privateKey := hexutil.Encode(crypto.FromECDSA(getPrivateKey))
	thePublicAddress := crypto.PubkeyToAddress(getPrivateKey.PublicKey).Hex()
	return thePublicAddress, privateKey
}

func (sca *GethChainAccess) FindTokenAccount(contractAddress string, walletAddress string) (string, error) {

	return walletAddress, nil
}

func (sca *GethChainAccess) NewTokenAccount(contractAddress string, walletAddress string) (string, error) {

	return walletAddress, nil
}

func (sca *GethChainAccess) QueryCoin(address string) (*big.Int, error) {
	account := common.HexToAddress(address)
	balance, err := sca.client.BalanceAt(context.Background(), account, nil)
	if err != nil {
		log.Errorf("cannot get balance: %v", err)
		return nil, err
	}
	return balance, nil
}

func (sca *GethChainAccess) QueryToken(address string, contractAddress string) (*big.Int, error) {
	account := common.HexToAddress(address)
	mintAddr := common.HexToAddress(contractAddress)
	instance, err := erc20.NewToken(mintAddr, sca.client)
	if err != nil {
		log.Errorf("cannot get token balance: %v", err)
		return nil, err
	}
	bal, err := instance.BalanceOf(&bind.CallOpts{}, account)
	if err != nil {
		log.Errorf("cannot get token balance: %v", err)
		return nil, err
	}
	return bal, nil
}

func (sca *GethChainAccess) TransferCoin(from, to string, value *big.Int) (string, error) {
	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(from, "0x"))
	if err != nil {
		log.Errorf("cannot get from private key: %v", err)
	}
	toAddress := common.HexToAddress(to)
	return sca.signAndSendTx(privateKey, &toAddress, value, nil)
}

func (sca *GethChainAccess) TransferToken(from, to string, value *big.Int, contractAddress string) (string, error) {
	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(from, "0x"))
	if err != nil {
		log.Errorf("cannot get from private key: %v", err)
		return "", err
	}
	tokenAddress := common.HexToAddress(contractAddress)
	toAddress := common.HexToAddress(to)

	token, err := erc20.NewToken(tokenAddress, sca.client)
	if err != nil {
		log.Errorf("cannot attach contract: %v", err)
		return "", err
	}
	tx, err := token.Transfer(bind.NewKeyedTransactor(privateKey), toAddress, value)
	if err != nil {
		log.Errorf("cannot create transaction: %v", err)
		return "", err
	}

	return tx.Hash().Hex(), err
}

func (sca *GethChainAccess) MintNFT(to string, contractAddress string, tokenId uint64, tokenUri string) (string, error) {
	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(sca.cfg.Funder, "0x"))
	if err != nil {
		log.Errorf("cannot get from private key: %v", err)
		return "", err
	}
	tokenAddress := common.HexToAddress(contractAddress)
	toAddress := common.HexToAddress(to)
	token, err := erc721.NewToken(tokenAddress, sca.client)
	if err != nil {
		log.Errorf("cannot attach contract: %v", err)
		return "", err
	}

	tx, err := token.Mint(bind.NewKeyedTransactor(privateKey), toAddress, big.NewInt(int64(tokenId)), tokenUri)
	if err != nil {
		log.Errorf("cannot create transaction: %v", err)
		return "", err
	}

	return tx.Hash().Hex(), err
}

func (sca *GethChainAccess) TransferNFT(from, to string, contractAddress string, tokenId uint64) (string, error) {
	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(from, "0x"))
	if err != nil {
		log.Errorf("cannot get from private key: %v", err)
		return "", err
	}
	publicKeyECDSA, ok := privateKey.Public().(*ecdsa.PublicKey)
	if !ok {
		log.Errorf("error casting public key to ECDSA")
		return "", errors.New("error casting public key to ECDSA")
	}
	tokenAddress := common.HexToAddress(contractAddress)
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	toAddress := common.HexToAddress(to)
	token, err := erc721.NewToken(tokenAddress, sca.client)
	if err != nil {
		log.Errorf("cannot attach contract: %v", err)
		return "", err
	}

	tx, err := token.SafeTransferFrom(bind.NewKeyedTransactor(privateKey), fromAddress, toAddress, big.NewInt(int64(tokenId)))
	if err != nil {
		log.Errorf("cannot create transaction: %v", err)
		return "", err
	}

	return tx.Hash().Hex(), err
}

func (sca *GethChainAccess) signAndSendTx(privateKey *ecdsa.PrivateKey, toAddress *common.Address, value *big.Int, data []byte) (string, error) {

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Errorf("error casting public key to ECDSA")
		return "", errors.New("error casting public key to ECDSA")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	gasLimit, err := sca.client.EstimateGas(context.Background(), ethereum.CallMsg{
		From: fromAddress,
		To:   toAddress,
		Data: data,
	})
	if err != nil {
		log.Errorf("cannot estimate gas: %v", err)
		return "", err
	}
	nonce, err := sca.client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Errorf("cannot get nonce: %v", err)
		return "", err
	}
	gasPrice, err := sca.client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Infof("cannot get suggest gas price: %v", err)
		log.Infof("use default gas price")
		gasPrice = big.NewInt(int64(sca.cfg.GasPrice)) // 30 gwei
	}
	tx := types.NewTransaction(nonce, *toAddress, value, gasLimit, gasPrice, data)
	chainID, err := sca.client.NetworkID(context.Background())
	if err != nil {
		log.Errorf("cannot get chain id: %v", err)
		return "", err
	}
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		log.Errorf("cannot sign tx: %v", err)
		return "", err
	}
	err = sca.client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		log.Errorf("cannot send tx: %v", err)
		return "", err
	}
	return signedTx.Hash().Hex(), nil
}
