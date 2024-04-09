package rosen

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/GoROSEN/rosen-apiserver/core/cronjob"
	"github.com/GoROSEN/rosen-apiserver/core/rpc"
	"github.com/GoROSEN/rosen-apiserver/features/member"
	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
	"gorm.io/gorm"
)

type RosenJobRunner struct {
	service *Service
}

func (r *RosenJobRunner) PlotMonthlyJob() {
	log.Infof("PlotMonthlyJob started")
	// 月mint统计清零
	if result := r.service.Db.Model(&Plot{}).Where("monthly_mint_count > 0").Select("monthly_mint_count").Update("monthly_mint_count", 0); result.Error != nil {
		log.Errorf("PlotDailyJob reset plots monthly mint count failed: %v", result.Error)
	} else {
		log.Infof("PlotDailyJob reset plots monthly mint count for %v plots", result.RowsAffected)
	}

	log.Infof("PlotMonthlyJob recyle plots which are expired")
}

func (r *RosenJobRunner) HistroyEnergyTransactions() {
	var txid uint64
	if t := r.service.Db.Raw("select id from transactions where to_account_id in (select id from accounts where `type`='energy') order by id desc limit 1"); t.Error != nil {
		log.Errorf("HistroyEnergyTransactions cannot get last energy txid: %v", t.Error)
		return
	} else {
		if err := t.Scan(&txid).Error; err != nil {
			log.Errorf("HistroyEnergyTransactions cannot scan last energy txid: %v", err)
			return
		}
		log.Infof("HistroyEnergyTransactions last energy txid = %v", txid)
	}
	if t := r.service.Db.Raw("insert into history_transactions select * from transactions where to_account_id in (select id from accounts where `type`='energy') and id < ?", txid); t.Error != nil {
		log.Errorf("HistroyEnergyTransactions cannot get last energy txid: %v", t.Error)
		return
	} else {
		log.Infof("HistroyEnergyTransactions inserted %v rows to history", t.RowsAffected)
	}
	if t := r.service.Db.Raw("delete from transactions where to_account_id in (select id from accounts where `type`='energy') and id < ?", txid); t.Error != nil {
		log.Errorf("HistroyEnergyTransactions cannot delete old energy txs: %v", t.Error)
		return
	} else {
		log.Infof("HistroyEnergyTransactions successfully removed %v rows from active transactions", t.RowsAffected)
	}
}

func (r *RosenJobRunner) PlotDailyJob() {
	log.Infof("PlotDailyJob started")
	log.Infof("PlotDailyJob recyle plots which are expired")
	// plot经营权回收任务，回收经营权过期的地块
	now := time.Now().Unix()
	plots := []Plot{}
	if err := r.service.ListV2(&plots, []string{"Blazer.Member"}, nil, "id", "blazer_id is not null and due_to < ?", now); err != nil {
		log.Errorf("PlotHourlyJob cannot get plot list: %v", err)
	}
	if result := r.service.Db.Model(&Plot{}).Where("blazer_id is not null and due_to < ?", now).Updates(map[string]interface{}{"blazer_id": nil, "mint_price": gorm.Expr("original_mint_price")}); result.Error != nil {
		log.Errorf("PlotDailyJob recyle plots failed: %v", result.Error)
	} else {
		log.Infof("PlotDailyJob recyle %v plots", result.RowsAffected)
		for _, p := range plots {
			r.service.msgMod.SendMessage(p.BlazerID, "warn-plot-expired", p.Blazer.Member.Language, &p)
		}
	}
	// 清零plot各种mint状态
	if result := r.service.Db.Model(&Plot{}).Where("daily_mint_count > 0").Select("daily_mint_count").Update("daily_mint_count", 0); result.Error != nil {
		log.Errorf("PlotDailyJob reset plots daily mint count failed: %v", result.Error)
	} else {
		log.Infof("PlotDailyJob reset plots daily mint count for %v plots", result.RowsAffected)
	}
	// 处理无效挂单
	r.service.DeleteInvalidListings()
	// 更新日排行
	plots = []Plot{}
	if err := r.service.List(&plots, nil, "daily_mint_count desc,mint_count desc,monthly_mint_count,access_count desc", ""); err != nil {
		log.Errorf("PlotDailyJob cannot get plots for ranking, err %v", err)
	}
	for i := range plots {
		if err := r.service.Db.Model(&plots[i]).Update("rank", i+1).Error; err != nil {
			log.Errorf("PlotDailyJob cannot update plot %v ranking for %v", plots[i].ID, err)
		}
	}
	// 恢复玩家每日可玩游戏次数
	games := []Game{}
	r.service.ListAll(&games)
	for _, game := range games {
		if err := r.service.Db.Model(&PlayerGameStatus{}).Where("game_id = ?", game.ID).Update("remain_play_times", game.RemainPlayTimes); err != nil {
			log.Errorf("PlotDailyJob cannot restore player game times, err %v", err)
		}
		// 清除玩家状态
		redisKey := fmt.Sprintf(GAME_AVAILAVBLE_PLAYER_LIST, game.ID)
		// 建立可配对玩家集合
		var ps []PlayerGameStatus
		if err := r.service.ListAllWhere(&ps, "game_id = ?", game.ID); err != nil {
			log.Errorf("cronjob restore game %v(%v) failed: %v", game.Name, game.ID, err)
		}
		for _, st := range ps {
			if st.Status == 1 && st.Enabled == 1 {
				// 添加符合条件的玩家
				r.service.client.SAdd(redisKey, st.PlayerID)
			}
		}
		log.Infof("InitGame: %v players are matchable for game %v(%v).", len(ps), game.Name, game.ID)

	}

	log.Infof("PlotDailyJob done")
}

func (r *RosenJobRunner) PlotHourlyJob() {

	log.Infof("PlotHourlyJob started")
	log.Infof("PlotHourlyJob reduce plots' health")
	// plot维护度下降任务，每小时下降x%
	if result := r.service.Db.Model(&Plot{}).Where("blazer_id is not null and maintain_cost > 0").Update("health", gorm.Expr("health - ?", r.service.sysconfig.HealthDropRate)); result.Error != nil {
		log.Errorf("PlotHourlyJob reduce plots' health failed: %v", result.Error)
	} else {
		log.Infof("PlotHourlyJob reduced %v plots", result.RowsAffected)
	}
	plots := []Plot{}
	if err := r.service.ListV2(&plots, []string{"Blazer.Member"}, nil, "id", "blazer_id is not null and health <= ?", r.service.sysconfig.UnhealthVal+0.1); err != nil {
		log.Errorf("PlotHourlyJob cannot get plot list: %v", err)
	} else {
		for _, p := range plots {
			msgParams := map[string]interface{}{
				"Plot":        &p,
				"UnhealthVal": r.service.sysconfig.UnhealthVal,
			}
			r.service.msgMod.SendMessage(p.BlazerID, "warn-plot-low-health", p.Blazer.Member.Language, msgParams)
		}
	}
	// 维护度低于x%自动回收经营权
	log.Infof("PlotHourlyJob recyle plots which health is below than %v", r.service.sysconfig.UnhealthVal)
	plots = []Plot{}
	if err := r.service.ListV2(&plots, []string{"Blazer.Member"}, nil, "id", "blazer_id is not null and health < ?", r.service.sysconfig.UnhealthVal); err != nil {
		log.Errorf("PlotHourlyJob cannot get plot list: %v", err)
	}
	if result := r.service.Db.Model(&Plot{}).Where("blazer_id is not null and health < ?", r.service.sysconfig.UnhealthVal).Updates(map[string]interface{}{"blazer_id": nil, "mint_price": gorm.Expr("original_mint_price")}); result.Error != nil {
		log.Errorf("PlotHourlyJob recyle plots failed: %v", result.Error)
	} else {
		log.Infof("PlotHourlyJob recyle %v plots", result.RowsAffected)
		for _, p := range plots {
			msgParams := map[string]interface{}{
				"Plot":        &p,
				"UnhealthVal": r.service.sysconfig.UnhealthVal,
			}
			r.service.msgMod.SendMessage(p.BlazerID, "warn-plot-lost", p.Blazer.Member.Language, msgParams)
		}
	}
	// 处理无效挂单
	r.service.DeleteInvalidListings()

	log.Infof("PlotHourlyJob done")
}

func (r *RosenJobRunner) UnlockBlazerRosen() {

	log.Infof("UnlockBlazerRosen started")
	// 解锁blazer当日收入
	var blazers []MemberExtra
	if err := r.service.List(&blazers, []string{}, "member_id", ""); err != nil {
		log.Errorf("UnlockBlazerRosen cannot get blazer list: %v", err)
		return
	}
	tokenName := config.GetConfig().Rosen.Chains[0].DefaultToken.Name
	for i, _ := range blazers {
		bid := blazers[i].MemberID
		acc := r.service.accountService.GetAccountByUserAndType(bid, tokenName)
		if acc != nil && acc.Locked > 0 {
			if _, err := r.service.accountService.Unlock(acc, acc.Locked, fmt.Sprintf("unlock daily incoming")); err != nil {
				log.Errorf("UnlockBlazerRosen cannot unlock blazer %v's rosen: %v", bid, err)
			}
		}
	}
	log.Infof("UnlockBlazerRosen done")
}

func (r *RosenJobRunner) M2EUpdater() {
	log.Infof("M2EUpdater started")
	aliveDuration := config.GetConfig().Rosen.MTE.KeepAliveDurationInSec
	now := time.Now().Unix()
	tvos := r.service.AllCachedMteTraces()
	for _, t := range tvos {
		// 检查是否超时
		if now-int64(t.Timestamp) > int64(aliveDuration) {
			// 超时，关闭会话、发通知
			r.service.StopMTE(t.MemberExtraID, t.MteSessionID, 0, 0)
			var m member.Member
			if err := r.service.GetModelByID(&m, t.MemberExtraID); err != nil {
				log.Errorf("cannot get member: %v", err)
				r.service.msgMod.SendMessage(t.MemberExtraID, "warn-m2e-interrupted", "en-US", map[string]interface{}{})
			} else {
				r.service.msgMod.SendMessage(t.MemberExtraID, "warn-m2e-interrupted", m.Language, map[string]interface{}{})
			}
		}
	}
	log.Infof("M2EUpdater done")
}

func (r *RosenJobRunner) CheckMintTx() {
	log.Infof("CheckMintTx started")
	mintlogs := []*MintLog{}
	// 只管48小时内
	if err := r.service.Db.Where("(result like 'pending,%' or success = 0) and (now() - created_at < 172800)").Find(&mintlogs).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Infof("CheckMintTx: cannot find mint logs: %v", err)
		}
		return
	}
	for i := range mintlogs {
		m := mintlogs[i]
		chain := m.Chain
		if len(chain) == 0 {
			chain = "solana"
		}
		client, cfg := r.service.getChainAccessor(chain)
		// 逐个验证
		tx := strings.TrimPrefix(m.Result, "pending, tx: ")
		confirm, _ := client.ConfirmTransaction(tx)
		if confirm {
			m.Result = strings.Replace(mintlogs[i].Result, "pending, tx: ", "success, tx: ", 1)
			r.service.UpdateModel(m, []string{"result"}, nil)
		} else {
			// 补偿
			if m.AssetID > 0 && len(m.MetaFileURL) > 0 {
				if chain == "solana" {
					var plotCol PlotCollection
					// collection 合并为与suit相同一个
					if err := r.service.FindModelWhere(&plotCol, "plot_id = -1"); err == nil {
						var collection CollectionVO
						copier.Copy(&collection, &plotCol)
						var asset Asset
						if err := r.service.GetModelByID(&asset, m.AssetID); err == nil {
							log.Infof("remint for mintlog %v", m.ID)
							if tx, err := r.service.mintSolanaCompressedNFT(m.ToAddress, &asset, m.MetaFileURL, &collection); err == nil {
								m.Result = fmt.Sprintf("pending, tx: %v", tx)
								m.Success = true
								r.service.UpdateModel(m, []string{"result", "success"}, nil)
							}
						}
					}
				} else {
					var asset Asset
					if err := r.service.GetModelByID(&asset, m.AssetID); err == nil {
						log.Infof("remint for mintlog %v", m.ID)
						if tx, err := client.MintNFT(m.ToAddress, cfg.DefaultNFT.ContractAddress, uint64(asset.ID), m.MetaFileURL); err == nil {
							m.Result = fmt.Sprintf("success, tx: %v", tx)
							m.Success = true
							r.service.UpdateModel(m, []string{"result", "success"}, nil)
						}
					}
				}
			}
		}
	}
	log.Infof("CheckMintTx done")
}

func (r *RosenJobRunner) CheckExpiredTransfer() {

	log.Infof("CheckExpiredTransfer started")
	// 查询过期转账
	pendingTcs := []ChatTransferCoin{}
	if err := r.service.FindModelWhere(&pendingTcs, "status = 1 and (now() - created_at > 86400)"); err != nil {
		log.Infof("cannot find any pending transferring coins")
		return
	}
	var ids []uint = make([]uint, len(pendingTcs))
	for i := range pendingTcs {
		ids[i] = pendingTcs[i].ID
	}

	// 变更状态
	if err := r.service.Db.Model(ChatTransferCoinReceipt{}).Where("chat_transfer_coin_id in ? and status = 0", ids).Update("status", -1).Error; err != nil {
		log.Errorf("cannot update status of transferring coins")
	}
	if err := r.service.Db.Model(ChatTransferCoin{}).Where("id in ? and status = 1", ids).Update("status", -1).Error; err != nil {
		log.Errorf("cannot update status of transferring coins")
	}
	// 取回变更成功的转账
	cancelledTcs := []*ChatTransferCoin{}
	if err := r.service.FindModelWhere(&cancelledTcs, "status = -1 and id in ?", ids); err != nil {
		log.Errorf("cannot find any expired transferring coins")
		return
	}
	receipts := []ChatTransferCoinReceipt{}
	if err := r.service.FindModelWhere(&receipts, "status = -1 and chat_transfer_coin_id in ?", ids); err != nil {
		log.Infof("cannot find any pending transferring coins")
		return
	}

	// 组个map tcid -> tc
	tcsMap := map[uint]*ChatTransferCoin{}
	for _, tc := range cancelledTcs {
		tcsMap[tc.ID] = tc
	}

	rpcCfg := config.GetConfig().Rpc
	senderAmountMap := map[uint]int64{}

	// 计算解冻金额，并发送消息
	for _, recept := range receipts {
		tc, exists := tcsMap[recept.ChatTransferCoinID]
		if !exists {
			log.Errorf("cannot find transfer coin record: %v", recept.ChatTransferCoinID)
			continue
		}
		senderAmountMap[tc.FromAccountID] += recept.Amount
		// 通知发送人和接收人
		r.service.rpcClient.Call(rpcCfg.Queues["im"],
			"transfer-currency-cancel",
			map[string]interface{}{"from": tc.FromMemberID,
				"to":   recept.ReceiverMemberID,
				"uuid": tc.UUID,
				"msg":  "expired"},
			func(data []byte) {
				var reply rpc.RpcCallSimpleReply
				if err := json.Unmarshal(data, &reply); err != nil {
					log.Errorf("CancelTransferCoin: cannot unmarshal data")
				} else {
					log.Debugf("CancelTransferCoin sent successfully")
				}
			})
		// 推送和系统消息
		var sender, receiver member.Member
		r.service.GetModelByID(&sender, tc.FromMemberID)
		r.service.GetModelByID(&receiver, recept.ReceiverMemberID)
		r.service.msgMod.SendMessage(tc.FromMemberID, "info-transfer-expired", sender.Language, &map[string]interface{}{})
		r.service.msgMod.SendMessage(recept.ReceiverMemberID, "info-transfer-expired", receiver.Language, &map[string]interface{}{})
	}
	// 解冻退款
	for accountId, amount := range senderAmountMap {
		acc := r.service.accountService.GetAccountByID(accountId)
		if _, err := r.service.accountService.Unfreeze(acc, acc, amount, "drawback from transfer coin"); err != nil {
			log.Errorf("cannot unfreeze transfer coin for account %v, amount %v", accountId, amount)
		}
	}
	log.Infof("CheckExpiredTransfer done")
}

func SetupCronJobs(service *Service) error {
	r := &RosenJobRunner{}
	r.service = service

	s := cronjob.GetScheduler()
	// add funcs here
	s.AddFunc("@midnight", r.PlotDailyJob)
	s.AddFunc("@midnight", r.UnlockBlazerRosen)
	s.AddFunc("@hourly", r.PlotHourlyJob)
	s.AddFunc("@monthly", r.PlotMonthlyJob)
	s.AddFunc("@weekly", r.HistroyEnergyTransactions)
	s.AddFunc("@every 10m", r.M2EUpdater)
	s.AddFunc("@every 5m", r.CheckMintTx)
	s.AddFunc("@every 1m", r.CheckExpiredTransfer)

	return nil
}
