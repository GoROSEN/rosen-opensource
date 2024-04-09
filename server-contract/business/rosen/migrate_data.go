package rosen

import (
	"github.com/GoROSEN/rosen-apiserver/core/blockchain"
	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/google/martian/log"
	"gorm.io/gorm"
)

func MigrateDataV1(db *gorm.DB) error {
	log.Infof("start migrating data v1")
	log.Infof("fetch all memebers")
	var members []MemberExtra
	if err := db.Model(&MemberExtra{}).Preload("Wallets").Find(&members).Error; err != nil {
		log.Errorf("cannot get members: %v", err)
		return err
	}

	accessors := map[string]blockchain.BlockChainAccess{}
	chains := config.GetConfig().Rosen.Chains
	for i := range chains {
		c := &chains[i]
		log.Infof("processing %v on %v", c.DefaultToken.Name, c.Name)
		var bc blockchain.BlockChainAccess
		if c.Name == "solana" {
			bc, _ = blockchain.NewSolanaChainAccess(c)
		} else if c.Name == "bnb" || c.Name == "okc" || c.Name == "polygon" {
			bc, _ = blockchain.NewGethChainAccess(c)
		}
		accessors[c.Name] = bc
	}
	for _, m := range members {
		for i := range chains {
			c := &chains[i]
			log.Infof("processing %v on %v", c.DefaultToken.Name, c.Name)
			bc, _ := accessors[c.Name]
			if bc == nil {
				continue
			}
			createWallet := true
			createTokenWallet := true
			var wallet *Wallet
			for _, w := range m.Wallets {
				if w.Chain == c.Name && len(w.PriKey) > 0 {
					createWallet = false
					wallet = w
					if w.Token == c.DefaultToken.Name {
						createTokenWallet = false
					}
				}
			}
			if createWallet {
				// 创建主钱包和token钱包
				pub, pri := bc.NewWallet()
				wallet = &Wallet{
					OwnerID: m.MemberID,
					Chain:   c.Name,
					Address: pub,
					PubKey:  pub,
					PriKey:  pri,
				}
				if err := db.Create(&wallet).Error; err != nil {
					log.Errorf("save wallet error: %v", err)
					db.Rollback()
					return err
				}
			}
			if createTokenWallet {
				if len(c.DefaultToken.Name) > 0 {
					log.Infof("create member token wallet for %v/%v", c.DefaultToken.Name, c.Name)
					var tokenAcc string
					if c.DefaultToken.AutoCreate {
						_, err := bc.NewTokenAccount(c.DefaultToken.ContractAddress, wallet.Address)
						if err != nil {
							log.Errorf("cannot create ata account: %v", err)
							db.Rollback()
							return err
						}
					}
					tokenAcc, _ = bc.FindTokenAccount(c.DefaultToken.ContractAddress, wallet.Address)
					wallet = &Wallet{
						OwnerID:         m.MemberID,
						Chain:           c.Name,
						Token:           c.DefaultToken.Name,
						ContractAddress: c.DefaultToken.ContractAddress,
						Address:         tokenAcc,
						PubKey:          tokenAcc,
						PriKey:          wallet.PriKey,
					}
					if err := db.Create(&wallet).Error; err != nil {
						log.Errorf("save token wallet error: %v", err)
						db.Rollback()
						return err
					}
				}
			}
		}
	}
	log.Infof("migrating data v1 done")
	return nil
}
