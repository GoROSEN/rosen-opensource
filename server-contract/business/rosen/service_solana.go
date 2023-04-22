package rosen

import (
	"context"
	"fmt"

	"github.com/GoROSEN/rosen-opensource/server-contract/core/config"
	"github.com/google/martian/log"
	"github.com/mr-tron/base58"
	"github.com/portto/solana-go-sdk/client"
	"github.com/portto/solana-go-sdk/common"
	solana "github.com/portto/solana-go-sdk/common"
	"github.com/portto/solana-go-sdk/pkg/pointer"
	"github.com/portto/solana-go-sdk/program/associated_token_account"
	"github.com/portto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/portto/solana-go-sdk/program/system"
	"github.com/portto/solana-go-sdk/program/token"
	"github.com/portto/solana-go-sdk/types"
)

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

	cfg := config.GetConfig()
	var feePayer, _ = types.AccountFromBase58(cfg.Rosen.Chains[0].Funder)
	c := client.NewClient(cfg.Rosen.Chains[0].Endpoint)

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
				token_metadata.CreateMetadataAccountV2(token_metadata.CreateMetadataAccountV2Param{
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
