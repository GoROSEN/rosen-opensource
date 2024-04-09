package rosen

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/GoROSEN/rosen-apiserver/business/mall"
	"github.com/GoROSEN/rosen-apiserver/core/blockchain"
	"github.com/GoROSEN/rosen-apiserver/core/common"
	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/GoROSEN/rosen-apiserver/core/rpc"
	"github.com/GoROSEN/rosen-apiserver/features/account"
	"github.com/GoROSEN/rosen-apiserver/features/member"
	"github.com/GoROSEN/rosen-apiserver/features/message"
	"github.com/go-redis/redis/v7"
	"github.com/google/martian/log"
	shell "github.com/ipfs/go-ipfs-api"
	"github.com/jinzhu/copier"
	"github.com/oschwald/geoip2-golang"
	"gorm.io/gorm"
)

const kSystemAccountID uint = 1

type AlphaSysConfig struct {
	MintBeforeOccupy        uint64  // 占地前需要mint几次
	HealthDropRate          float64 // 维护值下降率（n%每小时）
	UnhealthVal             float64 // 平台回收地块维护度临界值
	OccupyHoursBeforSell    float64 // 卖地前必须持有时间（小时）
	WaitHoursBeforeSell     float64 // 卖地挂牌公示期（小时）
	HealthBeforeSell        float64 // 卖地维护度要求
	ExpireHoursBeforeSell   float64 // 卖地挂牌经营权剩余时间（小时）
	CoolDownHoursBeforeSell float64 // 取消卖地后能够重新卖地的时间（小时）
	WithdrawAmountFloor     float64 // 最低提现金额
	EnableExchange          bool    // 是否开启兑换
	MoveToEarnRateLimit     uint64  // move to earn 会话更新最短时间（秒）
	TransferCoinFloor       float64 // 转账最低金额（USDT）
	TransferCoinMax         float64 // 单笔转账最高金额（USDT）
	TransferCoinDailyLimit  float64 // 单比转账最高金额（USDT）
	CustomServiceMemberId   uint64  // 客服用户ID
}

// Service 服务层
type Service struct {
	common.CrudService
	client         *redis.Client
	accountService *account.AccountService
	geo            *geoip2.Reader
	sysconfig      AlphaSysConfig
	m2eCacheLife   time.Duration
	msgMod         *message.MsgMod
	rpcServer      *rpc.AmqpRpcServer
	rpcClient      *rpc.AmqpRpcClient
}

// NewService 新建服务
func NewService(_db *gorm.DB, rds *redis.Client, account *account.AccountService, geoip *geoip2.Reader, msgMod *message.MsgMod) *Service {
	s := &Service{*common.NewCrudService(_db), rds, account, geoip, AlphaSysConfig{
		MintBeforeOccupy:        1,
		HealthDropRate:          0.02,
		UnhealthVal:             0.3,
		OccupyHoursBeforSell:    12.0,
		WaitHoursBeforeSell:     12.0,
		HealthBeforeSell:        0.9,
		ExpireHoursBeforeSell:   24.0,
		CoolDownHoursBeforeSell: 24.0,
		WithdrawAmountFloor:     50.0,
		EnableExchange:          false,
		MoveToEarnRateLimit:     5,
		TransferCoinFloor:       10.0,
		TransferCoinMax:         150.0,
		TransferCoinDailyLimit:  1000.0,
		CustomServiceMemberId:   0,
	}, time.Duration(config.GetConfig().Rosen.MTE.KeepAliveDurationInSec+1200) * time.Second, // redis缓存时间为keep alive时间加上两倍的update m2e周期（目前一个周期10m，见cronjob.go）
		msgMod,
		&rpc.AmqpRpcServer{},
		&rpc.AmqpRpcClient{}}
	s.LoadSysConfig()
	s.InitGame()
	return s
}

func (s *Service) LoadSysConfig() error {
	configs := []SysConfig{}
	if err := s.ListAll(&configs); err != nil {
		return err
	}
	log.Infof("setting up rosen alpha config:")
	for _, c := range configs {
		log.Infof("   %v = %v", c.Name, c.Value)
		switch c.Name {
		case "MintBeforeOccupy":
			s.sysconfig.MintBeforeOccupy, _ = strconv.ParseUint(c.Value, 10, 64)
		case "HealthDropRate":
			s.sysconfig.HealthDropRate, _ = strconv.ParseFloat(c.Value, 64)
		case "UnhealthVal":
			s.sysconfig.UnhealthVal, _ = strconv.ParseFloat(c.Value, 64)
		case "OccupyHoursBeforSell":
			s.sysconfig.OccupyHoursBeforSell, _ = strconv.ParseFloat(c.Value, 64)
		case "WaitHoursBeforeSell":
			s.sysconfig.WaitHoursBeforeSell, _ = strconv.ParseFloat(c.Value, 64)
		case "HealthBeforeSell":
			s.sysconfig.HealthBeforeSell, _ = strconv.ParseFloat(c.Value, 64)
		case "ExpireHoursBeforeSell":
			s.sysconfig.ExpireHoursBeforeSell, _ = strconv.ParseFloat(c.Value, 64)
		case "CoolDownHoursBeforeSell":
			s.sysconfig.CoolDownHoursBeforeSell, _ = strconv.ParseFloat(c.Value, 64)
		case "WithdrawAmountFloor":
			s.sysconfig.WithdrawAmountFloor, _ = strconv.ParseFloat(c.Value, 64)
		case "EnableExchange":
			s.sysconfig.EnableExchange, _ = strconv.ParseBool(c.Value)
		case "MoveToEarnRateLimit":
			s.sysconfig.MoveToEarnRateLimit, _ = strconv.ParseUint(c.Value, 10, 64)
		case "TransferCoinFloor":
			s.sysconfig.TransferCoinFloor, _ = strconv.ParseFloat(c.Value, 64)
		case "TransferCoinMax":
			s.sysconfig.TransferCoinMax, _ = strconv.ParseFloat(c.Value, 64)
		case "TransferCoinDailyLimit":
			s.sysconfig.TransferCoinDailyLimit, _ = strconv.ParseFloat(c.Value, 64)
		case "CustomServiceMemberId":
			s.sysconfig.CustomServiceMemberId, _ = strconv.ParseUint(c.Value, 10, 64)
		}
	}
	log.Infof("setup rosen alpha config: done")
	return nil
}

// SignUp 会员注册
func (s *Service) SignUpMember(obj *member.Member) error {

	db := s.Db.Begin()
	if err := db.Save(obj).Error; err != nil {
		log.Errorf("save member error: %v", err)
		db.Rollback()
		return err
	}
	log.Infof("saved member %v, got member-id %v", obj.UserName, obj.ID)
	if err := s.SetupNewMember(db, obj); err != nil {
		db.Rollback()
		return err
	}
	db.Commit()
	return nil
}

func (s *Service) SetupNewMember(db *gorm.DB, obj *member.Member) error {

	sns := &member.SnsSummary{MemberID: obj.ID}
	if err := db.Create(sns).Error; err != nil {
		log.Errorf("create sns error: %v", err)
		db.Rollback()
		return err
	}
	log.Infof("saved member sns summary")
	extra := &MemberExtra{MemberID: obj.ID, Level: 1, OccupyLimit: 2}
	if err := db.Omit("CurrentEquip").Create(extra).Error; err != nil {
		log.Errorf("save extra error: %v", err)
		return err
	}
	log.Infof("saved member position snapshot")
	pos := &MemberPosition{}
	pos.MemberRefer = obj.ID
	if err := db.Create(&pos).Error; err != nil {
		log.Errorf("save position error: %v", err)
		return err
	}
	chains := config.GetConfig().Rosen.Chains
	for i := range chains {
		c := &chains[i]
		var bc blockchain.BlockChainAccess
		if c.Name == "solana" {
			bc, _ = blockchain.NewSolanaChainAccess(c)
		} else if c.Name == "bnb" || c.Name == "okc" || c.Name == "polygon" {
			bc, _ = blockchain.NewGethChainAccess(c)
		}
		if bc != nil {
			log.Infof("create member wallet on %v", c.Name)
			pub, pri := bc.NewWallet()
			wallet := &Wallet{
				OwnerID: obj.ID,
				Chain:   c.Name,
				Address: pub,
				PubKey:  pub,
				PriKey:  pri,
			}
			if err := db.Create(&wallet).Error; err != nil {
				log.Errorf("save wallet error: %v", err)
				return err
			}
			if len(c.DefaultToken.Name) > 0 {
				log.Infof("create member token wallet for %v/%v", c.DefaultToken.Name, c.Name)
				var tokenAcc string
				if c.DefaultToken.AutoCreate {
					_, err := bc.NewTokenAccount(c.DefaultToken.ContractAddress, pub)
					if err != nil {
						log.Errorf("cannot create ata account: %v", err)
						return err
					}
				}
				tokenAcc, _ = bc.FindTokenAccount(c.DefaultToken.ContractAddress, pub)

				wallet = &Wallet{
					OwnerID:         obj.ID,
					Chain:           c.Name,
					Token:           c.DefaultToken.Name,
					ContractAddress: c.DefaultToken.ContractAddress,
					Address:         tokenAcc,
					PubKey:          tokenAcc,
					PriKey:          pri,
				}
				if err := db.Create(&wallet).Error; err != nil {
					log.Errorf("save token wallet error: %v", err)
					return err
				}
			}
		}
	}
	return nil
}

func (s *Service) MaintainPlot(plotId, memberId uint, energyCost float64) (float64, error) {

	cfg := config.GetConfig().Rosen
	var plot Plot
	if err := s.GetPreloadModelByID(&plot, plotId, []string{"Blazer.Member"}); err != nil {
		log.Errorf("cannot get plot: %v", err)
		return 0, errors.New("message.plot.plot-not-found")
	}
	// check owner
	if plot.BlazerID != memberId && plot.CoBlazerID != memberId {
		log.Errorf("member %v is not the blazer of %v", memberId, plotId)
		return 0, errors.New("message.common.privilege-error")
	}
	// check avaibility
	if !plot.Available {
		log.Errorf("plot %v is unavailable", plotId)
		return 0, errors.New("message.plot.plot-unavailable")
	}
	maxRequired := (1.0 - plot.Health) * math.Pow10(int(cfg.Energy.Decimals)) * float64(plot.MaintainCost)
	cost := math.Min(maxRequired, energyCost) * math.Pow10(int(cfg.Energy.Decimals))
	if cost <= 0 {
		return 0, nil
	}
	accservice := s.accountService.Begin()
	acc := accservice.Account(uint(memberId), "energy")
	if acc.Available < int64(cost) {
		log.Errorf("insufficient energy")
		return 0, errors.New("message.token.insufficient-energy")
	}
	if _, err := accservice.DecreaseAvailable(acc, int64(cost), fmt.Sprintf("maintain plot %v by %v", plotId, memberId)); err != nil {
		accservice.Rollback()
		log.Errorf("decrease energy failed: %v", err)
		return 0, errors.New("message.common.system-error")
	}
	increasement := cost / math.Pow10(int(cfg.Energy.Decimals)) / float64(plot.MaintainCost)
	if err := s.Db.Model(&plot).Update("health", gorm.Expr("health + ?", increasement/100.0)).Error; err != nil {
		accservice.Rollback()
		log.Errorf("update plot health failed: %v", err)
		return 0, errors.New("message.common.system-error")
	}
	accservice.Commit()
	c := cost / math.Pow10(int(cfg.Energy.Decimals))
	s.msgMod.SendSysMessage(memberId, "info-maintain-success", plot.Blazer.Member.Language, map[string]interface{}{
		"Increasement": increasement,
		"Cost":         c,
	})
	return c, nil
}

func (s *Service) SaveFileToIpfs(fs io.Reader) (string, error) {
	cfg := config.GetConfig()
	sh := shell.NewShell(cfg.Rosen.Ipfs.RpcAddr)
	cid, err := sh.Add(fs)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%v/%v", cfg.Rosen.Ipfs.Gateway, cid), nil
}

func (s *Service) MintNFT(chain string, extra *MemberExtra, plot *Plot, count int, imgOssUrl, imgIpfsUrl string, producerAcc *account.Account) (float64, error) {
	log.Infof("minting nft, chain = %v, memberid = %v, plot id = %v, count = %v, producerAccId = %v", chain, extra.MemberID, plot.ID, count, producerAcc.ID)
	memberId := extra.MemberID
	// prepare wallet address
	var toAddress string
	var transferrable bool
	for _, wa := range extra.Wallets {
		if wa.Chain == chain && (len(toAddress) == 0 || len(wa.PriKey) == 0) {
			// 用户自有钱包优先
			toAddress = wa.Address
			transferrable = len(wa.PriKey) > 0
		}
	}

	if len(toAddress) == 0 {
		log.Errorf("cannot get receive address for producer account %v: %v", producerAcc.ID)
		return 0, errors.New("message.member.wallet-not-found")
	}

	// billing: transfer rosen to blazer and system
	tokenName := config.GetConfig().Rosen.Coin.TokenName
	decimals := int64(config.GetConfig().Rosen.Coin.Decimals)
	blazerAcc := s.accountService.GetAccountByUserAndType(plot.BlazerID, tokenName)
	sysAcc := s.accountService.GetAccountByUserAndType(kSystemAccountID, tokenName)
	var coblazerAcc *account.Account
	if plot.CoBlazerID > 0 {
		coblazerAcc = s.accountService.GetAccountByUserAndType(plot.CoBlazerID, tokenName)
	} else {
		coblazerAcc = nil
	}

	var incoming, tax int64

	mintPrice := plot.MintPrice

	if plot.MintPriceByChains != nil && len(plot.MintPriceByChains) > 0 {
		// var mintPriceByChains map[string]uint64
		// json.Unmarshal([]byte(plot.MintPriceByChains), &mintPriceByChains)
		price, exists := plot.MintPriceByChains[chain]
		if !exists {
			log.Errorf("chain %v is not allowed to mint")
			return 0, errors.New("chain not allowed")
		}
		mintPrice = price
		log.Infof("mint price for chain %v is %v", chain, mintPrice)
	}

	outgoing0 := int64(mintPrice) * int64(math.Pow10(int(decimals)))
	outgoing := outgoing0 * int64(count)
	incoming0 := int64(float64(mintPrice) * (1.0 - plot.TaxRate) * math.Pow10(int(decimals)))
	tax0 := outgoing0 - incoming0
	successCount := 0

	if _, err := s.accountService.Freeze(producerAcc, outgoing, fmt.Sprintf("mint %v NFT at plot %v (ID:%v)", count, plot.Name, plot.ID)); err != nil {
		log.Errorf("cannot freeze rosen for producer account %v: %v", producerAcc.ID, err)
		return 0, errors.New("message.token.insufficient-token")
	}

	actualCount := 0
	for i := 0; i < count; i++ {
		mintlog := MintLog{ProducerID: memberId, PlotID: plot.ID, BlazerID: plot.BlazerID, PayedAmount: mintPrice}
		// 组织描述文件并存到ipfs
		var metaFilUrl string
		if str, err := s.saveMetaPlexFileToIpfs(plot.Name, plot.Description, imgIpfsUrl, i+1, count, &extra.Member, &plot.Blazer.Member); err != nil {
			log.Errorf("cannot get add meta file to ipfs: %v", err)
			continue
		} else {
			metaFilUrl = str
		}
		log.Infof("ipfs meta url: %v", metaFilUrl)
		var asset Asset
		asset.Name = plot.Name
		asset.Kind = "RPN"
		asset.OwnerID = uint(memberId)
		asset.Logo = imgOssUrl
		asset.Image = imgIpfsUrl
		asset.Count = 1
		asset.Type = 0
		asset.OwnerAddress = toAddress
		asset.ChainName = chain
		asset.Transferrable = &transferrable
		if err := s.CreateModel(&asset); err != nil {
			log.Errorf("cannot create asset: %v", err)
		}
		mintlog.ToAddress = toAddress
		mintlog.AssetID = asset.ID
		mintlog.MetaFileURL = metaFilUrl
		mintlog.Chain = chain
		// mint solana nft，若失败则重试（后续改为异步）
		// 失败1：链上mint失败
		// 失败2：数据库创建资产失败
		log.Infof("mint %v/%v on %v", i+1, count, chain)
		if chain == "solana" {
			cfg := config.GetConfig().Rosen
			var chainCfg *config.BlockchainConfig
			for i := range cfg.Chains {
				if cfg.Chains[i].Name == chain {
					chainCfg = &cfg.Chains[i]
					break
				}
			}
			if chainCfg == nil {
				return 0, errors.New("cannot load solana chain config")
			}

			var mintTx string
			mintSuccess := false
			if chainCfg.DefaultNFT.Compressed {
				chainCfg := s.getSolanaChainConfig()
				if chainCfg == nil {
					return 0, errors.New("cannot load solana chain config")
				}

				var plotCol PlotCollection
				// collection 合并为与suit相同一个
				// if err := s.FindModelWhere(&plotCol, "plot_id = ?", plot.ID); err != nil {
				if err := s.FindModelWhere(&plotCol, "plot_id = -1"); err != nil {
					// create collection
					if vo, err := s.createSolanaNFTCollection(plot.Name, "RPN", ""); err != nil {
						log.Errorf("cannot create compressed collection: %v", err)
						return 0, err
					} else {
						copier.Copy(&plotCol, vo)
						plotCol.PlotID = int(plot.ID)
						if err := s.CreateModel(&plotCol); err != nil {
							log.Errorf("cannot save plot collection: %v", err)
							return 0, err
						}
					}
				}
				var collection CollectionVO
				copier.Copy(&collection, &plotCol)
				if tx, err := s.mintSolanaCompressedNFT(toAddress, &asset, metaFilUrl, &collection); err != nil {
					// retry
					log.Errorf("mint nft failed: %v", err)
					mintlog.Result = fmt.Sprintf("mint nft failed: %v", err)
					mintlog.Success = false
				} else {
					mintTx = tx
					mintSuccess = true
				}
			} else {
				if tx, err := s.mintSolanaNFT(toAddress, &asset, metaFilUrl); err != nil {
					// retry
					log.Errorf("mint nft failed: %v", err)
					mintlog.Result = fmt.Sprintf("mint nft failed: %v", err)
					mintlog.Success = false
				} else {
					mintTx = tx
					mintSuccess = true
				}
			}
			if mintSuccess {
				log.Infof("mint nft success")
				if err := s.UpdateModel(&asset, []string{"NFTAddress", "TokenId"}, nil); err != nil {
					log.Errorf("cannot create asset: %v", err)
				}
				// solana个垃圾，这里改成pending，由定时任务复查
				mintlog.Result = fmt.Sprintf("pending, tx: %v", mintTx)
				mintlog.Success = true
				incoming += incoming0
				tax += tax0
				successCount++
			}
		} else if chain == "bnb" || chain == "okc" || chain == "polygon" {
			bc, chainCfg := s.getChainAccessor(chain)
			if bc != nil {
				if tx, err := bc.MintNFT(toAddress, chainCfg.DefaultNFT.ContractAddress, uint64(asset.ID), metaFilUrl); err != nil {
					log.Errorf("mint nft failed: %v", err)
					mintlog.Result = fmt.Sprintf("mint nft failed: %v", err)
					mintlog.Success = false
				} else {
					asset.TokenId = uint64(asset.ID)
					asset.NFTAddress = chainCfg.DefaultNFT.ContractAddress
					asset.ContractAddress = chainCfg.DefaultNFT.ContractAddress
					log.Infof("mint nft success")
					if err := s.UpdateModel(&asset, []string{"TokenId", "ContractAddress", "NFTAddress"}, nil); err != nil {
						log.Errorf("cannot create asset: %v", err)
					}
					mintlog.Result = fmt.Sprintf("success, tx: %v", tx)
					mintlog.Success = true
					incoming += incoming0
					tax += tax0
					successCount++
				}
			}
		}
		s.Db.Create(&mintlog)
	}
	// 分钱给blazer、coblazer和系统
	returnback := outgoing - incoming - tax
	if incoming > 0 {
		blazerIncoming := incoming
		if coblazerAcc != nil {
			coincoming := int64(float64(incoming) * plot.CoBlazerShare)
			blazerIncoming -= coincoming
			if _, err := s.accountService.Unfreeze(producerAcc, coblazerAcc, coincoming, fmt.Sprintf("mint %v NFT at plot %v (ID:%v)", actualCount, plot.Name, plot.ID)); err != nil {
				log.Errorf("cannot pay rosen to blazer account %v: %v", coblazerAcc.ID, err)
			}
			if _, err := s.accountService.Lock(coblazerAcc, coincoming, fmt.Sprintf("mint %v NFT at plot %v (ID:%v)", actualCount, plot.Name, plot.ID)); err != nil {
				log.Errorf("cannot lock blazer account %v: %v", coblazerAcc.ID, err)
			}
		}
		if _, err := s.accountService.Unfreeze(producerAcc, blazerAcc, blazerIncoming, fmt.Sprintf("mint %v NFT at plot %v (ID:%v)", actualCount, plot.Name, plot.ID)); err != nil {
			log.Errorf("cannot pay rosen to blazer account %v: %v", blazerAcc.ID, err)
		}
		if _, err := s.accountService.Lock(blazerAcc, blazerIncoming, fmt.Sprintf("mint %v NFT at plot %v (ID:%v)", actualCount, plot.Name, plot.ID)); err != nil {
			log.Errorf("cannot lock blazer account %v: %v", blazerAcc.ID, err)
		}
	}
	if tax > 0 {
		if _, err := s.accountService.Unfreeze(producerAcc, sysAcc, tax, fmt.Sprintf("mint %v NFT at plot %v (ID:%v)", actualCount, plot.Name, plot.ID)); err != nil {
			log.Errorf("cannot pay rosen to sys account %v: %v", sysAcc.ID, err)
		}
	}
	if returnback > 0 {
		if _, err := s.accountService.Unfreeze(producerAcc, producerAcc, returnback, fmt.Sprintf("failure part of mint %v NFT at plot %v (ID:%v)", (count-actualCount), plot.Name, plot.ID)); err != nil {
			log.Errorf("cannot pay rosen to producer account %v: %v", producerAcc.ID, err)
		}
	}

	// 更新plot被mint统计
	if successCount > 0 {
		var p Plot
		p.ID = uint(plot.ID)
		s.Db.Model(&p).Updates(map[string]interface{}{"daily_mint_count": gorm.Expr("daily_mint_count + ?", successCount), "monthly_mint_count": gorm.Expr("monthly_mint_count + ?", successCount), "mint_count": gorm.Expr("mint_count + ?", successCount)})
	}

	if plot.MintEnergy > 0 && actualCount > 0 {
		// 给用户发送energy奖励
		producerEnergyAcc := s.accountService.GetAccountByUserAndType(memberId, "energy")
		sysEnergyAcc := s.accountService.GetAccountByUserAndType(kSystemAccountID, "energy")
		if producerEnergyAcc != nil && sysEnergyAcc != nil {
			if _, err := s.accountService.Transfer(sysEnergyAcc, producerEnergyAcc, int64(plot.MintEnergy)*int64(successCount), fmt.Sprintf("bonus for minting on plot %v with count %v", plot.ID, successCount)); err != nil {
				log.Errorf("cannot send mint bonus for member %v, energy %v, plot %v, count %v", memberId, int64(plot.MintEnergy)*int64(count), plot.ID, successCount)
			}
		} else {
			log.Errorf("producerEnergyAcc or sysEnergyAcc is nil")
		}
	}

	return float64(incoming) / math.Pow10(int(decimals)), nil
}

func (s *Service) saveMetaPlexFileToIpfs(name, description, imgIpfsUrl string, number, count int, producer, blazer *member.Member) (string, error) {

	cfg := config.GetConfig()
	sh := shell.NewShell(cfg.Rosen.Ipfs.RpcAddr)
	// 组织描述文件并存到ipfs
	metaData := fmt.Sprintf(`{
		"name": "%v",
		"symbol": "%v",
		"description": "%v",
		"image": "%v",
		"attributes": [
			{
				"trait_type": "Number",
				"value": "%v"
			},
			{
				"trait_type": "Count",
				"value": "%v"
			},
			{
				"trait_type": "Producer",
				"value": "%v"
			},
			{
				"trait_type": "Blazer",
				"value": "%v"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "%v",
					"type": "image/png"
				}
			]
		}
	}`, name, "RPN", description, imgIpfsUrl, number, count, producer.Email, blazer.Email, imgIpfsUrl)
	cid, err := sh.Add(strings.NewReader(metaData))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%v/%v", cfg.Rosen.Ipfs.Gateway, cid), nil
}

func (s *Service) saveSuitMetaPlexFileToIpfs(name, description, imgIpfsUrl string, number, count, level int) (string, error) {

	cfg := config.GetConfig()
	sh := shell.NewShell(cfg.Rosen.Ipfs.RpcAddr)
	// 组织描述文件并存到ipfs
	metaData := fmt.Sprintf(`{
		"name": "%v",
		"symbol": "%v",
		"description": "%v",
		"image": "%v",
		"attributes": [
			{
				"trait_type": "Number",
				"value": "%v"
			},
			{
				"trait_type": "Count",
				"value": "%v"
			},
			{
				"trait_type": "Level",
				"value": "%v"
			},
			{
				"trait_type": "Minted Time",
				"value": "%v"
			}
		],
		"properties": {
			"files": [
				{
					"uri": "%v",
					"type": "image/png"
				}
			]
		}
	}`, name, "ROS-SUIT", description, imgIpfsUrl, number, count, level, time.Now().UTC().Format(time.UnixDate), imgIpfsUrl)
	cid, err := sh.Add(strings.NewReader(metaData))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%v/%v", cfg.Rosen.Ipfs.Gateway, cid), nil
}

func (s *Service) TransferAsset(memberId uint, assetID uint, toMemberId uint) error {

	var asset Asset
	if err := s.GetModelByID(&asset, assetID); err != nil {
		return err
	}
	// check asset owner
	if asset.OwnerID != memberId {
		return errors.New("message.common.privilege-error")
	}
	// check asset is transferable
	if (asset.Transferrable != nil && !*asset.Transferrable) || len(asset.NFTAddress) == 0 {
		return errors.New("message.assets.asset-not-transferable")
	}
	var wallet Wallet
	if err := s.FindModelWhere(&wallet, "address = ?", asset.OwnerAddress); err != nil {
		return err
	}
	if len(wallet.PriKey) == 0 {
		return errors.New("message.assets.asset-belongs-private-wallet")
	}
	// check receiver
	var recv MemberExtra
	if err := s.GetPreloadModelByID(&recv, toMemberId, []string{"Wallets"}); err != nil {
		return errors.New("message.member.member-not-found")
	}
	var toAddress string
	for _, w := range recv.Wallets {
		if w.Chain == asset.ChainName && (len(toAddress) == 0 || len(w.PriKey) == 0) {
			toAddress = w.Address
			b := len(w.PriKey) > 0
			asset.Transferrable = &b
		}
	}
	if len(toAddress) == 0 {
		return errors.New("message.assets.no-private-wallet-for-receiver")
	}
	//TODO: transfer via blockchain
	if asset.ChainName == "bnb" || asset.ChainName == "okc" || asset.ChainName == "polygon" {
		bc, bcconfig := s.getChainAccessor(asset.ChainName)
		if bc != nil {
			gasFee := big.NewInt(68566 * bcconfig.GasPrice) // gaslimit = 68,565（首次）;53,565（后续）
			if balance, err := bc.QueryCoin(asset.OwnerAddress); err != nil {
				log.Errorf("cannot query bsc account balance error: %v", err)
				return errors.New("message.mint.blockchain-op-error")
			} else if balance.Cmp(gasFee) < 0 {
				// 补充gas
				if _, err := bc.TransferCoin(bcconfig.Funder, asset.OwnerAddress, balance.Sub(gasFee, balance)); err != nil {
					log.Errorf("cannot transfer bsc balance for gas fee error: %v", err)
					return errors.New("message.mint.blockchain-op-error")
				}
			}
			if _, err := bc.TransferNFT(wallet.PriKey, toAddress, asset.NFTAddress, asset.TokenId); err != nil {
				log.Errorf("transfer bsc nft error: %v", err)
				return errors.New("message.mint.blockchain-op-error")
			}
		}
	} else {
		if asset.TokenId > 0 {
			if _, err := s.transferSolanaCompressedNFT(asset.NFTAddress, wallet.PriKey, toAddress); err != nil {
				log.Errorf("transfer compressed solana nft error: %v", err)
				return errors.New("message.mint.blockchain-op-error")
			}
		} else {
			if _, err := s.transferSolanaNFT(asset.NFTAddress, wallet.PriKey, toAddress); err != nil {
				log.Errorf("transfer solana nft error: %v", err)
				return errors.New("message.mint.blockchain-op-error")
			}
		}
	}

	// transfer on DB
	asset.OwnerID = toMemberId
	asset.OwnerAddress = toAddress
	if err := s.SaveModel(&asset); err != nil {
		log.Errorf("cannot save asset: %v", err)
		return errors.New("message.common.system-error")
	}

	// done

	return nil
}

func (s *Service) OccupyPlot(plotId, memberId uint, coinCfg *config.RosenCoinConfig) error {

	// 检查用户是否有资格占地
	var extra MemberExtra
	if err := s.GetPreloadModelByID(&extra, uint(memberId), []string{"Member"}); err != nil {
		log.Errorf("cannot find member with id: %v", err)
		return errors.New("message.member.member-not-found")
	}

	occupiedCount := s.Count(&Plot{}, "blazer_id = ?", memberId)
	if uint(occupiedCount) >= extra.OccupyLimit {
		log.Errorf("OccupyLimit exceeded")
		return errors.New("message.plot.occupy.blazer-occupy-limit-exceeded")
	}

	// 检查plot是否可占
	var plot Plot
	if err := s.GetModelByID(&plot, uint(plotId)); err != nil {
		log.Errorf("cannot get plot: %v", err)
		return errors.New("message.plot.plot-not-found")
	}
	if plot.BlazerID != 0 {
		log.Errorf("plot has already occupied by %v", plot.BlazerID)
		return errors.New("message.plot.occupy.plot-already-occupied")
	}
	// check avaibility
	if !plot.Available {
		log.Errorf("plot %v is unavailable", plotId)
		return errors.New("message.plot.plot-unavailable")
	}

	// 若非空投或首次发放，买家需要满足mint条件才能占地
	if plot.OccupiedAt.After(time.UnixMilli(0)) {
		if s.MintCount(memberId, &plot) < int64(s.sysconfig.MintBeforeOccupy) {
			log.Errorf("should mint %v times before occupy", s.sysconfig.MintBeforeOccupy)
			return errors.New("message.plot.occupy.mint-befor-occupy")
		}
	}

	// 检查用户是否有足够的钱
	r := s.accountService.GetAccountByUserAndType(uint(memberId), coinCfg.TokenName)
	if r == nil {
		log.Errorf("cannot get %v account for %v", coinCfg.TokenName, memberId)
		return errors.New("no token account")
	}
	if r.Available/int64(math.Pow10(int(coinCfg.Decimals))) < int64(plot.Price) {
		log.Errorf("insufficient rosen founds")
		return errors.New("message.token.insufficient-token")
	}
	sysacc := s.accountService.GetAccountByUserAndType(kSystemAccountID, coinCfg.TokenName)
	if sysacc == nil {
		log.Errorf("cannot get token account for sysacc")
		return errors.New("message.common.system-error")
	}
	a := s.accountService.Begin()
	if _, err := a.Transfer(r, sysacc, int64(plot.Price)*int64(math.Pow10(int(coinCfg.Decimals))), fmt.Sprintf("occupy plot %v", plot.ID)); err != nil {
		a.Rollback()
		log.Errorf("cannot occupy the plot: %v", err)
		return errors.New("message.common.system-error")
	}
	ret := s.Db.Model(&plot).Where("blazer_id = 0 or blazer_id is NULL").Updates(&Plot{BlazerID: uint(memberId), DueTo: uint64(time.Now().Unix() + int64(plot.OccupyDays*86400)), Health: 1.0, OccupiedAt: time.Now()})
	if ret.RowsAffected <= 0 || ret.Error != nil {
		a.Rollback()
		log.Errorf("cannot save the plot: %v", ret.Error)
		return errors.New("message.common.system-error")
	}
	a.Commit()
	s.msgMod.SendSysMessage(memberId, "info-occupy-success", extra.Member.Language, &plot)
	return nil
}

func (s *Service) ExchangeCoin(fromType, toType string, value, memberId uint) (int64, error) {

	if !s.sysconfig.EnableExchange {
		return 0, errors.New("message.common.coming-soon")
	}

	cfg := config.GetConfig().Rosen
	if fromType == "energy" {
		value *= uint(math.Pow10(int(cfg.Energy.Decimals)))
	} else {
		value *= uint(math.Pow10(int(cfg.Coin.Decimals)))
	}

	exchangeRates := map[string]map[string]float64{
		"energy": {"rosen": 0.00015625 * math.Pow10(int(cfg.Coin.Decimals)), "usdt": 0.00015625 * math.Pow10(int(cfg.Coin.Decimals))},
		"rosen":  {"energy": 64.0 * math.Pow10(int(cfg.Energy.Decimals)-int(cfg.Coin.Decimals))},
		"usdt": {"energy": 64.0 * math.Pow10(int(cfg.Energy.Decimals)-int(cfg.Coin.Decimals)),
			"gem": 1.0 * math.Pow10(int(cfg.Coin2.Decimals)-int(cfg.Coin.Decimals))},
	}

	m1, exists := exchangeRates[fromType]
	if !exists {
		log.Errorf("rosen/service/ExchangeCoin: cannot get exchange rate from %v", fromType)
		return 0, errors.New("message.common.system-error")
	}
	rate, exists := m1[toType]
	if !exists {
		log.Errorf("rosen/controller/exchangeCoin: cannot get exchange rate to %v", toType)
		return 0, errors.New("message.common.system-error")
	}

	fromAccount := s.accountService.GetAccountByUserAndType(memberId, fromType)
	if fromAccount == nil {
		log.Errorf("rosen/service/ExchangeCoin: invalid account")
		return 0, errors.New("message.common.system-error")
	}
	toAccount0 := s.accountService.GetAccountByUserAndType(kSystemAccountID, fromType)
	if toAccount0 == nil {
		log.Errorf("rosen/service/ExchangeCoin: invalid sys to account")
		return 0, errors.New("message.common.system-error")
	}

	if fromAccount.Available < int64(value) {
		log.Errorf("rosen/service/ExchangeCoin: insufficent account")
		return 0, errors.New("message.exchange.insufficent-founds")
	}

	toAccount := s.accountService.GetAccountByUserAndType(memberId, toType)
	if toAccount == nil {
		log.Errorf("rosen/service/ExchangeCoin: invalid account")
		return 0, errors.New("message.common.system-error")
	}
	fromAccount0 := s.accountService.GetAccountByUserAndType(kSystemAccountID, toType)
	if fromAccount0 == nil {
		log.Errorf("rosen/controller/exchangeCoin: invalid sys from account")
		return 0, errors.New("message.common.system-error")
	}

	value0 := int64(math.Floor(float64(value)*rate) / rate)
	ta := s.accountService.Begin()
	if _, err := ta.Transfer(fromAccount, toAccount0, value0, fmt.Sprintf("Exchange to %v with rate %v", toType, rate)); err != nil {
		ta.Rollback()
		log.Errorf("rosen/controller/exchangeCoin: decrease from account failed: %v", err)
		return 0, errors.New("message.common.system-error")
	}
	value1 := int64(float64(value) * rate)
	log.Infof("%v", value1)
	if _, err := ta.Transfer(fromAccount0, toAccount, value1, fmt.Sprintf("Exchange from %v with rate %v", fromType, rate)); err != nil {
		ta.Rollback()
		log.Errorf("rosen/controller/exchangeCoin: increase to account failed: %v", err)
		return 0, errors.New("message.common.system-error")
	}
	ta.Commit()
	ta = nil

	if fromType == "energy" {
		value0 /= int64(math.Pow10(int(cfg.Energy.Decimals)))
		value1 /= int64(math.Pow10(int(cfg.Coin.Decimals)))
	} else {
		value0 /= int64(math.Pow10(int(cfg.Coin.Decimals)))
		value1 /= int64(math.Pow10(int(cfg.Energy.Decimals)))
	}
	var m member.Member
	msgParams := map[string]interface{}{
		"FromType":  fromType,
		"FromValue": value0,
		"ToType":    toType,
		"ToValue":   value1,
	}
	if err := s.GetModelByID(&m, memberId); err != nil {
		log.Errorf("cannot get member: %v", err)
		s.msgMod.SendSysMessage(memberId, "info-exchange-success", "en-US", msgParams)
	} else {
		s.msgMod.SendSysMessage(memberId, "info-exchange-success", m.Language, msgParams)
	}
	return value0, nil
}

func (s *Service) checkPlotOwner(plotId, memberId uint) bool {

	plot := &Plot{}
	if err := s.GetModelByID(plot, uint(plotId)); err != nil {
		log.Errorf("cannot get plot by id %v: %v", plotId, err)
		return false
	}
	if plot.BlazerID != uint(memberId) {
		log.Errorf("blazer %v is not the owner of plot %v", memberId, plotId)
		return false
	}
	return true
}

// isAssetOwner 检查member是否为资产持有者
func (s *Service) isAssetOwner(assetId, memberId uint) bool {
	asset := &Asset{}
	if err := s.GetModelByID(asset, assetId); err != nil {
		log.Errorf("isAssetOwner: cannot get asset")
		return false
	}
	return asset.OwnerID == memberId
}

func (s *Service) MintCount(ownerId uint, plot *Plot) int64 {

	var count int64
	s.Db.Model(&Asset{}).Where("kind = ? and name = ? and owner_id = ?", "RPN", plot.Name, ownerId).Count(&count)
	return count
}

func (s *Service) TransferPlot(listing *ListingPlot, successorId uint) (float64, error) {

	log.Infof("transfering plot %v from %v to %v", listing.PlotID, listing.BlazerID, successorId)
	// 检查用户是否有资格占地
	var extra MemberExtra
	if err := s.GetPreloadModelByID(&extra, uint(successorId), []string{"Member"}); err != nil {
		log.Errorf("cannot find member with id: %v", err)
		return 0, errors.New("message.member.member-not-found")
	}
	occupiedCount := s.Count(&Plot{}, "blazer_id = ?", successorId)
	if uint(occupiedCount) >= extra.OccupyLimit {
		log.Errorf("OccupyLimit exceeded")
		return 0, errors.New("message.plot.occupy.blazer-occupy-limit-exceeded")
	}
	if uint64(s.MintCount(successorId, listing.Plot)) < s.sysconfig.MintBeforeOccupy {
		log.Errorf("You should mint %v NFT on this plot before.", s.sysconfig.MintBeforeOccupy)
		return 0, errors.New("message.plot.occupy.mint-befor-occupy")
	}
	// 检查余额
	tokenName := config.GetConfig().Rosen.Coin.TokenName
	decimals := int64(config.GetConfig().Rosen.Coin.Decimals)
	fromAccount := s.accountService.GetAccountByUserAndType(successorId, tokenName)
	if fromAccount == nil {
		log.Errorf("cannot get rosen account for fromAccount")
	} else if fromAccount.Available < int64(listing.Price) {
		return 0, errors.New("message.token.insufficient-token")
	}
	toAccount := s.accountService.GetAccountByUserAndType(listing.BlazerID, tokenName)
	if toAccount == nil {
		log.Errorf("cannot get rosen account for toAccount")
		return 0, errors.New("message.common.system-error")
	}
	sysacc := s.accountService.GetAccountByUserAndType(kSystemAccountID, tokenName)
	if sysacc == nil {
		log.Errorf("cannot get rosen account for sysacc")
		return 0, errors.New("message.common.system-error")
	}

	// 经营权交易，平台收取15%-20%的费用，其余归原Blazer；
	a := s.accountService.Begin()
	incoming := float64(listing.Price) * (1.0 - listing.Plot.TaxRate)
	tax := float64(listing.Price) - incoming
	if _, err := a.TransferToLock(fromAccount, toAccount, int64(incoming*math.Pow10(int(decimals))), fmt.Sprintf("take listing [%v] plot %v[ID:%v]", listing.ID, listing.Plot.Name, listing.Plot.ID)); err != nil {
		a.Rollback()
		log.Errorf("cannot transfer rosen to blazer: %v", err)
		return 0, errors.New("message.common.system-error")
	}
	if _, err := a.Transfer(fromAccount, sysacc, int64(tax*math.Pow10(int(decimals))), fmt.Sprintf("take listing [%v] plot %v[ID:%v]", listing.ID, listing.Plot.Name, listing.Plot.ID)); err != nil {
		a.Rollback()
		log.Errorf("cannot transfer rosen to system: %v", err)
		return 0, errors.New("message.common.system-error")
	}

	// 关闭挂牌
	if err := a.Database().Model(listing).Where("successor_id is NULL or successor_id = 0").Update("successor_id", successorId).Error; err != nil {
		a.Rollback()
		log.Errorf("cannot update listing: %v", err)
		return 0, errors.New("message.common.system-error")
	}
	// 改变blazer和占领时间
	if tx := a.Database().Model(listing.Plot).Where("blazer_id = ?", listing.BlazerID).Updates(map[string]interface{}{"blazer_id": successorId, "co_blazer_id": nil, "occupied_at": time.Now(), "due_to": uint64(time.Now().Unix() + int64(listing.Plot.OccupyDays*86400))}); tx.RowsAffected <= 0 || tx.Error != nil {
		a.Rollback()
		log.Errorf("cannot update plot: %v", tx.Error)
		return 0, errors.New("message.common.system-error")
	}

	a.Commit()
	s.msgMod.SendSysMessage(successorId, "info-buy-listing-success", extra.Member.Language, listing)

	return incoming, nil
}

func (s *Service) ListingPlot(plotId, memberId uint, price int64) error {

	var plot Plot
	if err := s.Db.First(&plot, "id = ?", plotId).Error; err != nil {
		return err
	}
	if plot.BlazerID != memberId {
		return errors.New("message.common.privilege-error")
	}
	if plot.Style == 1 {
		return errors.New("message.plot.plot-unavailable")
	}
	// 检查是否已挂卖
	if err := s.Db.First(&ListingPlot{}, "plot_id = ? and blazer_id = ? and (successor_id is NULL or successor_id = 0)", plotId, memberId); err == nil {
		return nil // errors.New("already selling")
	}
	/*
	 3、用户挂牌经营权，需满足对该plot占领满1周；
	 4、维护度低于90%不得挂牌；
	 5、经营权剩余到期时间不满24小时的，不得挂牌；
	 7、挂牌次数（or频率）应有限制：一次挂牌取消后，24小时内不得再挂牌上架；
	*/
	// 占领时间检查（满一周）
	now := time.Now()
	if now.Sub(plot.OccupiedAt) < time.Duration(s.sysconfig.OccupyHoursBeforSell)*time.Hour {
		log.Errorf("You should occupied the plot at least %v hours", s.sysconfig.OccupyHoursBeforSell)
		return errors.New("message.plot.occupy.insufficient-occupy-time")
	}
	// 维护度检查
	if plot.Health < s.sysconfig.HealthBeforeSell {
		log.Errorf("The plot's health is less than %v%%", s.sysconfig.HealthBeforeSell*100.0)
		return errors.New("message.plot.insufficient-plot-health")
	}
	// 经营权剩余到期时间不满24小时的，不得挂牌
	if plot.DueTo < uint64(now.Unix()) || plot.DueTo-uint64(now.Unix()) < uint64(s.sysconfig.ExpireHoursBeforeSell*3600) {
		log.Errorf("The Plot will expired in %v hrs", s.sysconfig.ExpireHoursBeforeSell)
		return errors.New("message.plot.insufficient-rent-time")
	}
	// 一次挂牌取消后，24小时内不得再挂牌上架
	var t ListingPlot
	if err := s.Db.Unscoped().Last(&t, "blazer_id = ? and plot_id = ?", memberId, plotId).Error; err == nil {
		if now.Sub(t.CreatedAt) < time.Duration(s.sysconfig.CoolDownHoursBeforeSell)*time.Hour {
			log.Errorf("You cannot relisting the plot in %v hrs", s.sysconfig.CoolDownHoursBeforeSell)
			return errors.New("message.market.insufficient-relisting-cooldown-time")
		}
	}

	var listing ListingPlot
	listing.BlazerID = uint(memberId)
	listing.PlotID = uint(plotId)
	listing.StartSellAt = time.Now().Add(time.Duration(s.sysconfig.WaitHoursBeforeSell) * time.Hour).Unix()
	listing.Price = uint64(price)

	if err := s.Db.Create(&listing).Error; err != nil {
		return errors.New("message.common.system-error")
	}
	return nil
}

func (s *Service) DeleteInvalidListings() {

	listings := []ListingPlot{}
	if err := s.List(&listings, []string{"Plot"}, "id desc", "successor_id is NULL or successor_id = 0"); err == nil {
		for _, t := range listings {
			if t.BlazerID != t.Plot.BlazerID {
				if err := s.DeleteModel(&t); err != nil {
					log.Errorf("PlotDailyJob cannot delete invalid listing %v: %v", t.ID, err)
				}
			}
		}
	} else {
		log.Errorf("PlotDailyJob cleanup listings failed: %v", err)
	}
}

func (s *Service) AllCachedMteSessions() []*MteSessionVO {

	keys, err := s.client.Keys("rosen/mte/session/*").Result()
	if err != nil {
		return nil
	}
	sessions := make([]*MteSessionVO, len(keys))
	if len(sessions) == 0 {
		return sessions
	}
	for i := range keys {
		sessions[i] = s._readCachedSession(keys[i])
	}
	return sessions
}

func (s *Service) AllCachedMteTraces() []*MteTraceItemVO {
	keys, err := s.client.Keys("rosen/mte/trace/*").Result()
	if err != nil {
		return nil
	}
	tvo := make([]*MteTraceItemVO, len(keys))
	if len(tvo) == 0 {
		return tvo
	}
	for i := range keys {
		tvo[i] = s._readCachedTrace(keys[i])
	}
	return tvo
}

func (s *Service) WithdrawToken(memberId uint, amount float64, token, chain string) error {

	rosenCfg := config.GetConfig().Rosen

	acc := s.accountService.GetAccountByUserAndType(memberId, token)
	if acc == nil {
		log.Errorf("invalid account")
		return errors.New("message.common.system-error")
	}
	var wallet Wallet
	if err := s.FindModelWhere(&wallet, "owner_id = ? and chain = ? and (pri_key is NULL or pri_key = '')", memberId, chain); err != nil {
		log.Errorf("no private wallet for withdraw")
		return errors.New("message.member.wallet-not-found")
	}
	decimals := rosenCfg.Coin.Decimals
	amount0 := int64(amount * math.Pow10(int(decimals)))
	if acc.Available < amount0 {
		log.Errorf("insufficent token for %v: %v < %v", memberId, acc.Available, amount0)
		return errors.New("message.token.insufficient-token")
	}
	if _, err := s.accountService.Freeze(acc, amount0, "freeze for withdraw"); err != nil {
		log.Errorf("cannot freeze account for withdraw: %v", err)
		return errors.New("message.common.system-error")
	}
	tx := ""
	err := errors.New("not implemented")
	var chainAccess blockchain.BlockChainAccess
	var funder string
	var chainCfg *config.BlockchainConfig
	for i := range rosenCfg.Chains {
		if rosenCfg.Chains[i].Name == wallet.Chain {
			chainCfg = &rosenCfg.Chains[i]
			funder = chainCfg.Funder
			break
		}
	}
	if wallet.Chain == "solana" {
		chainAccess, err = blockchain.NewSolanaChainAccess(chainCfg)
	} else if wallet.Chain == "bnb" || wallet.Chain == "okc" || wallet.Chain == "polygon" {
		chainAccess, err = blockchain.NewGethChainAccess(chainCfg)
	}
	if chainAccess != nil {
		r := big.NewInt(0)
		if chainCfg.DefaultToken.Decimals >= decimals {
			r.Mul(big.NewInt(amount0), big.NewInt(int64(math.Pow10(int(chainCfg.DefaultToken.Decimals-decimals)))))
			tx, err = chainAccess.TransferToken(funder, wallet.Address, r, chainCfg.DefaultToken.ContractAddress)
		} else {
			err = errors.New("invalid decimals")
		}
	}
	if err != nil {
		s.accountService.Unfreeze(acc, acc, amount0, "withdraw failed on chain")
		log.Errorf("cannot withdraw token: %v", err)
		return errors.New("message.common.system-error")
	} else {
		if _, err = s.accountService.DecreaseFrozen(acc, amount0, fmt.Sprintf("withdraw success, tx = %v", tx)); err != nil {
			log.Errorf("cannot decrease account frozen for member %v, amount %v, token %v", memberId, amount0, token)
			return nil
		}
	}
	return nil
}

func (s *Service) SetCoblazer(memberId, plotId, coBlazerId uint) error {

	var blazer, coblazer member.Member
	var plot Plot

	if err := s.GetModelByID(&plot, plotId); err != nil {
		log.Errorf("cannot find plot: %v", err)
		return errors.New("message.plot.plot-not-found")
	}
	if plot.BlazerID != memberId {
		log.Errorf("member is not the blazer")
		return errors.New("message.plot.plot-unavailable")
	}
	if plot.CoBlazerID != 0 {
		log.Errorf("plot already has a co-blazer")
		return errors.New("message.plot.plot-unavailable")
	}
	var extra MemberExtra
	if err := s.GetModelByID(&extra, uint(coBlazerId)); err != nil {
		log.Errorf("cannot find member with id: %v", err)
		return errors.New("message.member.member-not-found")
	}
	occupiedCount := s.Count(&Plot{}, "blazer_id = ?", coBlazerId)
	if uint(occupiedCount) >= extra.OccupyLimit {
		log.Errorf("OccupyLimit exceeded")
		return errors.New("message.plot.occupy.blazer-occupy-limit-exceeded")
	}
	if err := s.GetModelByID(&blazer, memberId); err != nil {
		log.Errorf("cannot find blazer: %v", err)
		return errors.New("message.member.member-info-not-found")
	}
	if err := s.GetModelByID(&coblazer, coBlazerId); err != nil {
		log.Errorf("cannot find co-blazer: %v", err)
		return errors.New("message.member.member-info-not-found")
	}
	plot.CoBlazerID = coBlazerId
	if err := s.UpdateModel(&plot, []string{"co_blazer_id"}, nil); err != nil {
		log.Errorf("cannot set co-blazer: %v", err)
		return errors.New("message.plot.plot-save-error")
	}

	return nil
}

func (s *Service) getChainAccessor(chain string) (blockchain.BlockChainAccess, *config.BlockchainConfig) {
	chains := config.GetConfig().Rosen.Chains
	var bc blockchain.BlockChainAccess
	var c *config.BlockchainConfig
	for i := range chains {
		c = &chains[i]
		if c.Name == chain {
			if c.Name == "solana" {
				bc, _ = blockchain.NewSolanaChainAccess(c)
				break
			} else if c.Name == "bnb" || c.Name == "okc" || c.Name == "polygon" {
				bc, _ = blockchain.NewGethChainAccess(c)
				break
			}
		}
	}
	return bc, c
}

func (s *Service) OrderMallEquip(memberId int, chain, coin string, good *mall.Good) error {

	var cfg *config.RosenCoinConfig

	if coin == "gem" {
		cfg = &config.GetConfig().Rosen.Coin2
	} else {
		cfg = &config.GetConfig().Rosen.Coin
	}

	// 验证用户id是否有效
	var extra MemberExtra
	if err := s.GetPreloadModelByID(&extra, uint(memberId), []string{"Wallets"}); err != nil {
		log.Errorf("cannot find member with id: %v", err)
		return errors.New("message.member.member-not-found")
	}

	memberAcc := s.accountService.GetAccountByUserAndType(extra.MemberID, cfg.TokenName)
	if memberAcc == nil {
		log.Errorf("cannot find member account for member %v", extra.MemberID)
		return errors.New("message.member.member-not-found")
	}
	sysAcc := s.accountService.GetAccountByUserAndType(kSystemAccountID, cfg.TokenName)
	if sysAcc == nil {
		log.Errorf("cannot find system account")
		return errors.New("message.common.system-error")
	}

	price := int64(good.Price * math.Pow10(int(cfg.Decimals)))

	// 扣钱
	accTxService := s.accountService.Begin()
	if _, err := accTxService.Transfer(memberAcc, sysAcc, price, fmt.Sprintf("purchase equip good %v", good.ID)); err != nil {
		// 钱不够
		log.Errorf("cannot transfer coins: %v", err)
		return errors.New("message.token.insufficient-token")
	}

	// 发货
	if err := s.SendEquip(&extra, chain, good); err != nil {
		accTxService.Rollback()
		return err
	}

	accTxService.Commit()
	return nil
}

func (s *Service) SendEquip(extra *MemberExtra, chain string, good *mall.Good) error {

	if good.Detail == nil {
		return errors.New("good detail is null")
	}

	var suitInfo SuitGoodVO

	if err := json.Unmarshal([]byte(good.Detail.Description), &suitInfo); err != nil {
		log.Errorf("cannot decode suit detail: %v", err)
		return errors.New("message.common.system-error")
	}

	// 生成装备实例数据
	var sp SuitParamsVO
	logos := strings.Split(good.Detail.ImageList, ",")
	var suit Asset
	suit.Name = good.Name
	suit.Kind = "suit"
	if len(logos) > 0 {
		suit.Logo = logos[0]
		sp.AvatarFrame = logos[0]
	}
	if len(logos) > 1 {
		sp.SuitImage = logos[1]
	}
	sp.Image = good.Image
	suit.Image = good.Image
	if i, err := strconv.Atoi(good.Image); err == nil {
		// good.Image是数字
		sp.ImageIndex = uint(i)
	} else {
		sp.ImageIndex = 1
	}
	bytes, _ := json.Marshal(&sp)
	suit.Description = string(bytes)
	suit.OwnerID = extra.MemberID
	suit.Type = 1
	suit.EarnRate = suitInfo.EarnRate
	suit.Count = uint(suitInfo.Life)
	suit.Level = suitInfo.Level
	if len(suitInfo.Duration) > 0 {
		suitDuration, _ := time.ParseDuration(suitInfo.Duration)
		suit.DueTo = time.Now().Add(suitDuration).Unix()
	} else {
		suit.DueTo = 0
	}
	// mint装备实例
	if len(chain) > 0 && (!suitInfo.DisableMint) {
		// 图像传到IPFS
		if len(suitInfo.ImgIpfsUrl) == 0 {
			if resp, err := http.Get(suit.Image); err != nil {
				log.Errorf("cannot download suit image: %v", err)
				return err
			} else {
				defer resp.Body.Close()
				if suitInfo.ImgIpfsUrl, err = s.SaveFileToIpfs(resp.Body); err != nil {
					log.Errorf("cannot put suit image to ipfs: %v", err)
					return err
				}
			}
			log.Infof("suit image of ipfs: %v", suitInfo.ImgIpfsUrl)
		}
		if err := s.MintSuitNFT(chain, extra, &suit, suitInfo.ImgIpfsUrl); err != nil {
			if suit.ID > 0 {
				// 删除失败的装备
				s.CrudService.DeleteModel(&suit)
			}
			log.Errorf("cannot mint suit NFT: %v", err)
			return errors.New("message.common.system-error")
		}
	} else {
		log.Infof("send suit to user %v without mint", extra.MemberID)
		if err := s.CreateModel(&suit); err != nil {
			log.Errorf("cannot create suit asset: %v", err)
			return err
		}
	}
	return nil
}

func (s *Service) MintSuitNFT(chain string, extra *MemberExtra, suit *Asset, imgIpfsUrl string) error {

	log.Infof("minting suit nft, chain = %v, memberid = %v, suit id = %v", chain, extra.MemberID, suit.ID)
	memberId := extra.MemberID
	// prepare wallet address
	var toAddress string
	var transferrable bool
	for _, wa := range extra.Wallets {
		if wa.Chain == chain && (len(toAddress) == 0 || len(wa.PriKey) == 0) {
			// 用户自有钱包优先
			toAddress = wa.Address
			transferrable = len(wa.PriKey) > 0
		}
	}

	if len(toAddress) == 0 {
		log.Errorf("cannot get receive address for producer account %v", memberId)
		return errors.New("message.member.wallet-not-found")
	}

	// 组织描述文件并存到ipfs
	var metaFilUrl string
	if str, err := s.saveSuitMetaPlexFileToIpfs(suit.Name, "", imgIpfsUrl, 1, 1, suit.Level); err != nil {
		log.Errorf("cannot get add meta file to ipfs: %v", err)
		return err
	} else {
		metaFilUrl = str
	}
	log.Infof("ipfs meta url: %v", metaFilUrl)
	suit.OwnerAddress = toAddress
	suit.ChainName = chain
	suit.Transferrable = &transferrable

	if err := s.CreateModel(suit); err != nil {
		log.Errorf("cannot create suit asset: %v", err)
		return err
	}

	// mint solana nft，若失败则重试（后续改为异步）
	// 失败1：链上mint失败
	// 失败2：数据库创建资产失败
	if chain == "solana" {
		mintSuccess := false
		chainCfg := s.getSolanaChainConfig()
		if chainCfg.DefaultNFT.Compressed {
			chainCfg := s.getSolanaChainConfig()
			if chainCfg == nil {
				return errors.New("cannot load solana chain config")
			}
			// 装备使用plot id=0的collection
			var plotCol PlotCollection
			if err := s.FindModelWhere(&plotCol, "plot_id = 0"); err != nil {
				// create collection
				if vo, err := s.createSolanaNFTCollection("Suit", "RPN", ""); err != nil {
					log.Errorf("cannot create compressed collection: %v", err)
					return err
				} else {
					copier.Copy(&plotCol, vo)
					plotCol.PlotID = 0
					if err := s.CreateModel(&plotCol); err != nil {
						log.Errorf("cannot save plot collection: %v", err)
						return err
					}
				}
			}
			var collection CollectionVO
			copier.Copy(&collection, &plotCol)
			if _, err := s.mintSolanaCompressedNFT(toAddress, suit, metaFilUrl, &collection); err != nil {
				// retry
				log.Errorf("mint nft failed: %v", err)
			} else {
				mintSuccess = true
			}
		} else {
			if _, err := s.mintSolanaNFT(toAddress, suit, metaFilUrl); err != nil {
				// retry
				log.Errorf("mint nft failed: %v", err)
				return err
			} else {
				mintSuccess = true
			}
		}
		if mintSuccess {
			log.Infof("mint nft success")
			if err := s.UpdateModel(suit, []string{"NFTAddress", "TokenId"}, nil); err != nil {
				log.Errorf("cannot create asset: %v", err)
			}
		}
	} else if chain == "bnb" || chain == "okc" || chain == "polygon" {
		bc, chainCfg := s.getChainAccessor(chain)
		if bc != nil {
			log.Infof("chainCfg: %v", chainCfg)
			if _, err := bc.MintNFT(toAddress, chainCfg.DefaultNFT.ContractAddress, uint64(suit.ID), metaFilUrl); err != nil {
				log.Errorf("mint nft failed: %v", err)
				return err
			} else {
				suit.TokenId = uint64(suit.ID)
				suit.NFTAddress = chainCfg.DefaultNFT.ContractAddress
				suit.ContractAddress = chainCfg.DefaultNFT.ContractAddress
				log.Infof("mint nft success")
				if err := s.UpdateModel(&suit, []string{"TokenId", "ContractAddress", "NFTAddress"}, nil); err != nil {
					log.Errorf("cannot create asset: %v", err)
					return err
				}
			}
		}
	}
	return nil
}

func (s *Service) ProducerMintCountInPeroid(producerId uint, plot *Plot) int64 {

	var count int64
	if err := s.Db.Model(&MintLog{}).Where("producer_id = ? and plot_id = ? and success = 1 and DATEDIFF(NOW(), created_at) <= ?", producerId, plot.ID, plot.MintLimitDuration).Count(&count).Error; err != nil {
		log.Errorf("cannot get producer mint count: %v", err)
	}
	return count
}
