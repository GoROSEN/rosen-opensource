package rosen

import (
	"context"
	"errors"
	"fmt"

	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/go-resty/resty/v2"
	"github.com/google/martian/log"
	"github.com/mr-tron/base58"
	"github.com/yosefl20/solana-go-sdk/client"
	"github.com/yosefl20/solana-go-sdk/common"
	solana "github.com/yosefl20/solana-go-sdk/common"
	"github.com/yosefl20/solana-go-sdk/pkg/pointer"
	"github.com/yosefl20/solana-go-sdk/program/associated_token_account"
	"github.com/yosefl20/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/yosefl20/solana-go-sdk/program/system"
	"github.com/yosefl20/solana-go-sdk/program/token"
	"github.com/yosefl20/solana-go-sdk/types"
)

func (s *Service) getSolanaChainConfig() *config.BlockchainConfig {
	cfg := config.GetConfig()
	var chainCfg *config.BlockchainConfig
	for i := range cfg.Rosen.Chains {
		if cfg.Rosen.Chains[i].Name == "solana" {
			chainCfg = &cfg.Rosen.Chains[i]
			break
		}
	}
	return chainCfg
}

func (s *Service) createAssociatedTokenAccount(wallet *types.Account, mintAddress string, autoCreate bool) (string, error) {

	cfg := config.GetConfig()
	feePayer, err := types.AccountFromBase58(cfg.Rosen.Chains[0].Funder)
	if err != nil {
		log.Errorf("failed to get fee payer, err: %v", err)
		return "", err
	}

	c := client.NewClient(cfg.Rosen.Chains[0].Endpoint)
	mint := common.PublicKeyFromString(mintAddress)
	if err != nil {
		log.Errorf("failed to get mint account, err: %v", err)
		return "", err
	}

	ata, _, err := solana.FindAssociatedTokenAddress(wallet.PublicKey, mint)
	if err != nil {
		log.Errorf("failed to find a valid ata, err: %v", err)
		return "", err
	}
	if autoCreate {
		recentBlockhashResponse, err := c.GetLatestBlockhash(context.Background())
		if err != nil {
			log.Errorf("failed to get recent blockhash, err: %v", err)
			return "", err
		}
		tx, err := types.NewTransaction(types.NewTransactionParam{
			Signers: []types.Account{feePayer},
			Message: types.NewMessage(types.NewMessageParam{
				FeePayer:        feePayer.PublicKey,
				RecentBlockhash: recentBlockhashResponse.Blockhash,
				Instructions: []types.Instruction{
					associated_token_account.CreateAssociatedTokenAccount(associated_token_account.CreateAssociatedTokenAccountParam{
						Funder:                 feePayer.PublicKey,
						Owner:                  wallet.PublicKey,
						Mint:                   mint,
						AssociatedTokenAccount: ata,
					}),
				}})})
		if err != nil {
			log.Errorf("failed to new a tx, err: %v", err)
			return "", err
		}

		if sig, err := c.SendTransaction(context.Background(), tx); err != nil {
			log.Errorf("failed to send tx, err: %v", err)
			return "", err
		} else {
			log.Infof("create ata account, tx = %v", sig)
		}
	}
	return ata.ToBase58(), nil
}

func (s *Service) mintSolanaNFT(toAddress string, asset *Asset, fileUrl string) (string, error) {

	chainCfg := s.getSolanaChainConfig()
	var feePayer, _ = types.AccountFromBase58(chainCfg.Funder)
	c := client.NewClient(chainCfg.Endpoint)

	toAccountPublic := solana.PublicKeyFromString(toAddress)

	mint := types.NewAccount()
	fmt.Printf("NFT: %v\n", mint.PublicKey.ToBase58())
	asset.NFTAddress = mint.PublicKey.ToBase58()

	collection := types.NewAccount()
	fmt.Println(base58.Encode(collection.PrivateKey))
	fmt.Printf("collection: %v\n", collection.PublicKey.ToBase58())

	ata, _, err := solana.FindAssociatedTokenAddress(toAccountPublic, mint.PublicKey)
	if err != nil {
		log.Errorf("failed to find a valid ata, err: %v", err)
		return "", err
	}

	tokenMetadataPubkey, err := token_metadata.GetTokenMetaPubkey(mint.PublicKey)
	if err != nil {
		log.Errorf("failed to find a valid token metadata, err: %v", err)
		return "", err
	}

	tokenMasterEditionPubkey, err := token_metadata.GetMasterEdition(mint.PublicKey)
	if err != nil {
		log.Errorf("failed to find a valid master edition, err: %v", err)
		return "", err
	}

	mintAccountRent, err := c.GetMinimumBalanceForRentExemption(context.Background(), token.MintAccountSize)
	if err != nil {
		log.Errorf("failed to get mint account rent, err: %v", err)
		return "", err
	}

	recentBlockhashResponse, err := c.GetLatestBlockhash(context.Background())
	if err != nil {
		log.Errorf("failed to get recent blockhash, err: %v", err)
		return "", err
	}

	tx, err := types.NewTransaction(types.NewTransactionParam{
		Signers: []types.Account{mint, feePayer},
		Message: types.NewMessage(types.NewMessageParam{
			FeePayer:        feePayer.PublicKey,
			RecentBlockhash: recentBlockhashResponse.Blockhash,
			Instructions: []types.Instruction{
				system.CreateAccount(system.CreateAccountParam{
					From:     feePayer.PublicKey,
					New:      mint.PublicKey,
					Owner:    solana.TokenProgramID,
					Lamports: mintAccountRent,
					Space:    token.MintAccountSize,
				}),
				token.InitializeMint(token.InitializeMintParam{
					Decimals:   0,
					Mint:       mint.PublicKey,
					MintAuth:   feePayer.PublicKey,
					FreezeAuth: &feePayer.PublicKey,
				}),
				token_metadata.CreateMetadataAccountV3(token_metadata.CreateMetadataAccountV3Param{
					Metadata:                tokenMetadataPubkey,
					Mint:                    mint.PublicKey,
					MintAuthority:           feePayer.PublicKey,
					Payer:                   feePayer.PublicKey,
					UpdateAuthority:         feePayer.PublicKey,
					UpdateAuthorityIsSigner: true,
					IsMutable:               true,
					Data: token_metadata.DataV2{
						Name:                 asset.Name,
						Symbol:               asset.Kind,
						Uri:                  fileUrl,
						SellerFeeBasisPoints: 100,
						Creators: &[]token_metadata.Creator{
							{
								Address:  feePayer.PublicKey,
								Verified: true,
								Share:    100,
							},
						},
						Collection: &token_metadata.Collection{
							Verified: false,
							Key:      collection.PublicKey,
						},
						Uses: &token_metadata.Uses{
							UseMethod: token_metadata.Burn,
							Remaining: 10,
							Total:     10,
						},
					},
					CollectionDetails: nil,
				}),
				associated_token_account.CreateAssociatedTokenAccount(associated_token_account.CreateAssociatedTokenAccountParam{
					Funder:                 feePayer.PublicKey,
					Owner:                  toAccountPublic,
					Mint:                   mint.PublicKey,
					AssociatedTokenAccount: ata,
				}),
				token.MintTo(token.MintToParam{
					Mint:   mint.PublicKey,
					To:     ata,
					Auth:   feePayer.PublicKey,
					Amount: 1,
				}),
				token_metadata.CreateMasterEditionV3(token_metadata.CreateMasterEditionParam{
					Edition:         tokenMasterEditionPubkey,
					Mint:            mint.PublicKey,
					UpdateAuthority: feePayer.PublicKey,
					MintAuthority:   feePayer.PublicKey,
					Metadata:        tokenMetadataPubkey,
					Payer:           feePayer.PublicKey,
					MaxSupply:       pointer.Get[uint64](0),
				}),
			},
		}),
	})
	if err != nil {
		log.Errorf("failed to new a tx, err: %v", err)
		return "", err
	}

	sig, err := c.SendTransaction(context.Background(), tx)
	if err != nil {
		log.Errorf("failed to send tx, err: %v", err)
		return "", err
	}
	return sig, nil
}

func (s *Service) transferSolanaNFT(mintAddr, fromPrikey, toAddr string) (string, error) {

	fromAccount, err := types.AccountFromBase58(fromPrikey)
	if err != nil {
		log.Errorf("invalid from account: %v", err)
		return "", err
	}

	mintAddress := solana.PublicKeyFromString(mintAddr)
	toAddress := solana.PublicKeyFromString(toAddr)

	cfg := config.GetConfig()
	var feePayer, _ = types.AccountFromBase58(cfg.Rosen.Chains[0].Funder)
	c := client.NewClient(cfg.Rosen.Chains[0].Endpoint)

	recentBlockhashResponse, err := c.GetLatestBlockhash(context.Background())
	if err != nil {
		log.Errorf("failed to get recent blockhash, err: %v", err)
		return "", err
	}

	ata, _, err := common.FindAssociatedTokenAddress(fromAccount.PublicKey, mintAddress)
	if err != nil {
		log.Errorf("failed to find a valid ata, err: %v", err)
		return "", err
	}

	ata2, _, err := common.FindAssociatedTokenAddress(toAddress, mintAddress)
	if err != nil {
		log.Errorf("failed to find a valid ata2, err: %v", err)
		return "", err
	}

	tx, err := types.NewTransaction(types.NewTransactionParam{
		Signers: []types.Account{feePayer, fromAccount},
		Message: types.NewMessage(types.NewMessageParam{
			FeePayer:        feePayer.PublicKey,
			RecentBlockhash: recentBlockhashResponse.Blockhash,
			Instructions: []types.Instruction{
				associated_token_account.CreateAssociatedTokenAccount(associated_token_account.CreateAssociatedTokenAccountParam{
					Funder:                 feePayer.PublicKey,
					Owner:                  toAddress,
					Mint:                   mintAddress,
					AssociatedTokenAccount: ata2,
				}),
				token.TransferChecked(token.TransferCheckedParam{
					From:     ata,
					To:       ata2,
					Mint:     mintAddress,
					Auth:     fromAccount.PublicKey,
					Amount:   1,
					Decimals: 0,
				}),
			},
		}),
	})

	if err != nil {
		log.Errorf("failed to new a tx, err: %v", err)
		return "", err
	}

	sig, err := c.SendTransaction(context.Background(), tx)
	if err != nil {
		log.Errorf("failed to send tx, err: %v", err)
		return "", err
	}

	return sig, nil
}

func (s *Service) createSolanaNFTCollection(name, symbol, metaUrl string) (*CollectionVO, error) {
	client := resty.New()
	chainCfg := s.getSolanaChainConfig()
	serviceUrl := chainCfg.CompressedService
	if len(serviceUrl) == 0 {
		return nil, errors.New("invalid service URL")
	}
	// do request
	var result struct {
		Code uint   `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			Collection CollectionVO `json:"collection,omitempty"`
			Exception  string       `json:"exception,omitempty"`
		} `json:"data"`
	}
	if _, err := client.R().
		SetFormData(map[string]string{
			"payer":   chainCfg.Funder,
			"name":    name,
			"symbol":  symbol,
			"metaurl": metaUrl,
		}).
		SetResult(&result).Post(fmt.Sprintf("%v/api/createCollection", serviceUrl)); err != nil {
		log.Errorf("calling rosen solana service error: %v", err)
	}

	if result.Code != 200 {
		log.Errorf("create collection failed: %v", result.Msg)
		log.Errorf("%v", result.Data.Exception)
		return nil, errors.New(fmt.Sprintf("return code is %d", result.Code))
	}

	return &result.Data.Collection, nil
}

func (s *Service) mintSolanaCompressedNFT(toAddress string, asset *Asset, fileUrl string, collection *CollectionVO) ( /*txhash*/ string, error) {
	client := resty.New()
	chainCfg := s.getSolanaChainConfig()
	serviceUrl := chainCfg.CompressedService
	if len(serviceUrl) == 0 {
		return "", errors.New("invalid service URL")
	}
	// do request
	var result struct {
		Code uint   `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			TxHash    string `json:"txhash,omitempty"`
			AssetID   string `json:"assetId,omitempty"`
			LeafID    uint64 `json:"leafId,omitempty"`
			Exception string `json:"exception,omitempty"`
		} `json:"data"`
	}
	tree, err := types.AccountFromBase58(chainCfg.DefaultNFT.TreePriKey)
	if err != nil {
		log.Errorf("invalid from account: %v", err)
		return "", err
	}

	if _, err := client.R().
		SetFormData(map[string]string{
			"payer":                chainCfg.Funder,
			"tree":                 tree.PublicKey.ToBase58(),
			"creator":              toAddress,
			"mint":                 collection.MintAccount,
			"tokenAccount":         collection.TokenAccount,
			"metadataAccount":      collection.MetadataAccount,
			"masterEditionAccount": collection.MasterEditionAccount,
			"name":                 asset.Name,
			"symbol":               asset.Kind,
			"metaUrl":              fileUrl,
		}).
		SetResult(&result).Post(fmt.Sprintf("%v/api/compressed/mint", serviceUrl)); err != nil {
		log.Errorf("calling rosen solana service error: %v", err)
	}

	if result.Code != 200 {
		log.Errorf("create compressed nft failed: %v", result.Msg)
		log.Errorf("%v", result.Data.Exception)
		return "", errors.New(fmt.Sprintf("return code is %d", result.Code))
	}
	log.Infof("create compressed nft: %v", result.Data.AssetID)
	asset.NFTAddress = result.Data.AssetID
	asset.TokenId = result.Data.LeafID

	return result.Data.TxHash, nil
}

func (s *Service) transferSolanaCompressedNFT(mintAddr, fromPrikey, toAddr string) (string, error) {

	client := resty.New()
	chainCfg := s.getSolanaChainConfig()
	serviceUrl := chainCfg.CompressedService
	if len(serviceUrl) == 0 {
		return "", errors.New("invalid service URL")
	}
	tree, err := types.AccountFromBase58(chainCfg.DefaultNFT.TreePriKey)
	if err != nil {
		log.Errorf("invalid from account: %v", err)
		return "", err
	}

	// do request
	var result struct {
		Code uint   `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			TxHash    string `json:"txhash,omitempty"`
			AssetID   string `json:"assetId,omitempty"`
			Exception string `json:"exception,omitempty"`
		} `json:"data"`
	}
	if _, err := client.R().
		SetFormData(map[string]string{
			"payer":   chainCfg.Funder,
			"tree":    tree.PublicKey.ToBase58(),
			"owner":   fromPrikey,
			"to":      toAddr,
			"assetId": mintAddr,
		}).
		SetResult(&result).Post(fmt.Sprintf("%v/api/compressed/transfer/%s", serviceUrl, mintAddr)); err != nil {
		log.Errorf("calling rosen solana service error: %v", err)
	}

	if result.Code != 200 {
		log.Errorf("transfer compressed nft failed: %v", result.Msg)
		log.Errorf("%v", result.Data.Exception)
		return "", fmt.Errorf("return code is %d", result.Code)
	}
	log.Infof("create compressed nft: %v", result.Data.AssetID)

	return result.Data.TxHash, nil
}
