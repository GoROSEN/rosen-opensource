package rosen

import (
	"fmt"
	"time"

	"github.com/GoROSEN/rosen-opensource/server-contract/core/config"
	"github.com/GoROSEN/rosen-opensource/server-contract/core/cronjob"
	"github.com/google/martian/log"
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

func (r *RosenJobRunner) PlotDailyJob() {
	log.Infof("PlotDailyJob started")
	log.Infof("PlotDailyJob recyle plots which are expired")
	// plot经营权回收任务，回收经营权过期的地块
	now := time.Now().Unix()
	plots := []Plot{}
	if err := r.service.ListAllWhere(&plots, "blazer_id is not null and due_to < ?", now); err != nil {
		log.Errorf("PlotHourlyJob cannot get plot list: %v", err)
	}
	if result := r.service.Db.Model(&Plot{}).Where("blazer_id is not null and due_to < ?", now).Select("blazer_id").Update("blazer_id", nil); result.Error != nil {
		log.Errorf("PlotDailyJob recyle plots failed: %v", result.Error)
	} else {
		log.Infof("PlotDailyJob recyle %v plots", result.RowsAffected)
		for _, p := range plots {
			r.service.msgMod.SendMessage(p.BlazerID, "warn-plot-expired", "en_US", p.Name)
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
	if err := r.service.ListAllWhere(&plots, "blazer_id is not null and health <= ?", r.service.sysconfig.UnhealthVal+0.1); err != nil {
		log.Errorf("PlotHourlyJob cannot get plot list: %v", err)
	} else {
		for _, p := range plots {
			r.service.msgMod.SendMessage(p.BlazerID, "warn-plot-low-health", "en_US", p.Name, p.Health*100.0)
		}
	}
	// 维护度低于x%自动回收经营权
	log.Infof("PlotHourlyJob recyle plots which health is below than %v", r.service.sysconfig.UnhealthVal)
	plots = []Plot{}
	if err := r.service.ListAllWhere(&plots, "blazer_id is not null and health < ?", r.service.sysconfig.UnhealthVal); err != nil {
		log.Errorf("PlotHourlyJob cannot get plot list: %v", err)
	}
	if result := r.service.Db.Model(&Plot{}).Where("blazer_id is not null and health < ?", r.service.sysconfig.UnhealthVal).Select("blazer_id").Update("blazer_id", nil); result.Error != nil {
		log.Errorf("PlotHourlyJob recyle plots failed: %v", result.Error)
	} else {
		log.Infof("PlotHourlyJob recyle %v plots", result.RowsAffected)
		for _, p := range plots {
			r.service.msgMod.SendMessage(p.BlazerID, "warn-plot-lost", "en_US", p.Name, r.service.sysconfig.UnhealthVal*100.0)
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
			r.service.StopMTE(t.MemberID, t.MteSessionID, 0, 0)
			r.service.msgMod.SendMessage(t.MemberID, "warn-m2e-interrupted", "en_US", aliveDuration)
		}
	}
	log.Infof("M2EUpdater done")
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
	s.AddFunc("@every 10m", r.M2EUpdater)

	return nil
}
