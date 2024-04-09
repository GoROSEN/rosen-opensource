package rosen

import (
	"encoding/csv"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/GoROSEN/rosen-apiserver/business/mall"
	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/GoROSEN/rosen-apiserver/core/utils"
	"github.com/GoROSEN/rosen-apiserver/features/account"
	"github.com/GoROSEN/rosen-apiserver/features/member"
	"github.com/gin-gonic/gin"
	"github.com/gofrs/uuid"
	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
)

// setupAdminController 初始化控制器
func (c *Controller) setupAdminController(r *gin.RouterGroup) {

	// dashboard
	r.GET("dashboard", c.dashboard)
	// plots
	r.GET("plot/list/:page", c.pagePlots)
	r.GET("plot/listAvailable", func(ctx *gin.Context) {
		// c.ListAll(ctx, &[]Plot{}, &[]PlotVO{}, &Plot{}, nil, nil, c.plotList2PlotVoList2, "name asc", "(blazer_id = 0 or blazer_id is null) and available = 1 and visible = 1")
		c.ListAll(ctx, &[]Plot{}, &[]PlotVO{}, &Plot{}, nil, nil, c.plotList2PlotVoList2, "name asc", "available = 1 and visible = 1")
	})
	r.GET("plot/listOccupied", func(ctx *gin.Context) {
		c.ListAll(ctx, &[]Plot{}, &[]PlotVO{}, &Plot{}, nil, nil, c.plotList2PlotVoList2, "name asc", "blazer_id > 0 and available = 1 and visible = 1")
	})
	r.GET("plot/pageOccupied/:page", c.pageOccupiedPlots)
	r.GET("plot/item/:id", func(ctx *gin.Context) {
		c.CrudController.GetModel(ctx, &Plot{}, &PlotVO{}, []string{"Blazer", "Blazer.Member", "Listing"})
	})
	r.POST("plot/save", func(ctx *gin.Context) {
		c.CrudController.CreateOrUpdateModel(ctx, &PlotVO{}, &Plot{}, []string{"*"}, []string{"created_at", "health", "access_count", "daily_mint_count", "monthly_mint_count", "mint_count", "rank", "occupied_at", "due_to", "blazer_id", "co_blazer_id"}, []string{"health", "access_count", "daily_mint_count", "monthly_mint_count", "mint_count", "rank", "occupied_at", "due_to", "blazer_id", "co_blazer_id"}) //, plotVo2Plot)
	})
	r.POST("plot/saveBlazer", func(ctx *gin.Context) {
		c.CrudController.CreateOrUpdateModel(ctx, &PlotVO{}, &Plot{}, []string{"occupied_at", "due_to", "blazer_id", "health"}, nil, nil)
	})
	r.POST("plot/delete/:id", func(ctx *gin.Context) {
		id, err := strconv.Atoi(ctx.Param("id"))
		if err != nil || id < 1 {
			utils.SendFailureResponse(ctx, 400, "message.common.system-error")
			return
		}
		obj := &Plot{}
		obj.ID = uint(id)
		if err := c.Crud.DeleteModel(obj); err != nil {
			log.Errorf("delete model error: %v", err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
		utils.SendSimpleSuccessResponse(ctx)
	})
	r.POST("plot/img/upload", c.uploadPlotImg)
	// members
	r.GET("member/listAll", func(ctx *gin.Context) {
		c.ListAll(ctx, &[]member.Member{}, &[]member.MemberVO{}, &member.Member{}, nil, nil, nil, "user_name", "")
	})
	r.GET("member/exportAll", c.exportMembers)
	r.GET("member/list/:page", c.pageMembers)
	r.POST("member/airdrop/plot/:id", c.airdropPlot)
	r.POST("member/airdrop/token/:id", c.airdropToken)
	r.POST("member/airdrop/equip/:id", c.airdropEquip)
	r.GET("member/info/:id", c.adminMemberInfo)
	// ranking
	r.GET("ranking/cities/:page", c.pageCities)
	r.POST("ranking/city/save", c.saveCity)
	r.POST("ranking/city/delete/:id", func(ctx *gin.Context) {
		c.DeleteModelByID(ctx, &CityRank{})
	})
}

func (c *Controller) uploadPlotImg(ctx *gin.Context) {
	u, _ := uuid.NewV1()
	objectName := "plots/" + u.String()
	// 上传至oss
	if c.Oss != nil {
		ossFileName, err := c.SaveFormFileToOSS(ctx, "file", objectName)
		if err != nil {
			log.Errorf("put object error: ", err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
		imgUrl, _ := c.PresignedOssDownloadURLWithoutPrefix(ossFileName)
		utils.SendSuccessResponse(ctx, gin.H{"filename": strings.TrimPrefix(ossFileName, "rosen/"), "previewURL": imgUrl.String()})
	} else {
		log.Errorf("oss client is nil")
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
}

func (c *Controller) pageOccupiedPlots(ctx *gin.Context) {
	keyword := ctx.Query("key")
	style := ctx.Query("style")
	continent := ctx.Query("continent")
	sort := ctx.Query("sort")
	order := ctx.Query("order")

	whereCaluse := "blazer_id > 0 "
	params := []interface{}{}
	if len(keyword) > 0 {
		whereCaluse += "and (name like CONCAT('%',?,'%') or description like CONCAT('%',?,'%') or tags like CONCAT('%',?,'%')) "
		params = append(params, keyword, keyword, keyword)
	}
	if len(style) > 0 {
		styleVal, _ := strconv.Atoi(style)
		if len(whereCaluse) > 0 {
			whereCaluse += "and "
		}
		whereCaluse += "style = ? "
		params = append(params, styleVal)
	}
	if len(continent) > 0 {
		if len(whereCaluse) > 0 {
			whereCaluse += "and "
		}
		whereCaluse += "continent = ? "
		params = append(params, continent)
	}
	orderby := ""
	if len(sort) > 0 {
		orderby = fmt.Sprintf("`%s`", sort)
		if order == "descending" {
			orderby += " desc"
		}
	} else {
		orderby = "id desc"
	}
	c.PageFull(ctx, &[]Plot{}, &[]PlotVO{}, &Plot{}, []string{"Blazer", "Blazer.Member", "Listing"}, nil, c.plotList2PlotVoList2, orderby, whereCaluse, params...)
}

func (c *Controller) pagePlots(ctx *gin.Context) {

	keyword := ctx.Query("key")
	style := ctx.Query("style")
	continent := ctx.Query("continent")
	sort := ctx.Query("sort")
	order := ctx.Query("order")

	whereCaluse := ""
	params := []interface{}{}
	if len(keyword) > 0 {
		whereCaluse += "(name like CONCAT('%',?,'%') or description like CONCAT('%',?,'%') or tags like CONCAT('%',?,'%')) "
		params = append(params, keyword, keyword, keyword)
	}
	if len(style) > 0 {
		styleVal, _ := strconv.Atoi(style)
		if len(whereCaluse) > 0 {
			whereCaluse += "and "
		}
		whereCaluse += "style = ? "
		params = append(params, styleVal)
	}
	if len(continent) > 0 {
		if len(whereCaluse) > 0 {
			whereCaluse += "and "
		}
		whereCaluse += "continent = ? "
		params = append(params, continent)
	}
	orderby := ""
	if len(sort) > 0 {
		orderby = sort
		if order == "descending" {
			orderby += " desc"
		}
	} else {
		orderby = "id desc"
	}
	c.PageFull(ctx, &[]Plot{}, &[]PlotVO{}, &Plot{}, []string{"Blazer", "Blazer.Member", "Listing"}, nil, c.plotList2PlotVoList2, orderby, whereCaluse, params...)
}

func (c *Controller) pageMembers(ctx *gin.Context) {

	page, err := strconv.Atoi(ctx.Param("page"))
	if err != nil || page < 1 {
		if page, err = strconv.Atoi(ctx.Query("page")); err != nil || page < 1 {
			page = 1
		}
	}
	pageSize, err := strconv.Atoi(ctx.Query("pageSize"))
	if err != nil || pageSize <= 0 {
		pageSize = 10
	}
	keyword := ctx.Query("key")
	sort := ctx.Query("sort")
	order := ctx.Query("order")

	orderby := ""
	if len(sort) > 0 {
		switch sort {
		case "id":
			orderby = "member_id"
		case "userName":
			orderby = "Member.user_name"
		case "email":
			orderby = "Member.email"
		case "displayName":
			orderby = "Member.display_name"
		}
		if order == "descending" {
			orderby += " desc"
		}
	} else {
		orderby = "member_id desc"
	}

	extras := []MemberExtra{}
	var count int64
	if len(keyword) > 0 {
		count, err = c.Crud.PagedV2(&extras, &MemberExtra{}, []string{"Member.SnsSummary", "Wallets"}, []string{"Member"}, orderby, page-1, pageSize, "Member.user_name like ? or Member.display_name like ? or Member.email like ? or Member.cell_phone like ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	} else {
		count, err = c.Crud.PagedV2(&extras, &MemberExtra{}, []string{"Member.SnsSummary", "Wallets"}, []string{"Member"}, orderby, page-1, pageSize, "")
	}
	if err != nil {
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	volist := make([]*MemberFullVO, len(extras))
	for i := range volist {
		var account0, account1, account2 account.Account
		c.Crud.FindModelWhere(&account0, "user_id = ? and type = ?", extras[i].MemberID, "energy")
		c.Crud.FindModelWhere(&account1, "user_id = ? and type = ?", extras[i].MemberID, "gold")
		c.Crud.FindModelWhere(&account2, "user_id = ? and type = ?", extras[i].MemberID, config.GetConfig().Rosen.Coin.TokenName)
		volist[i] = c.composeRosenMemberFullVO(&extras[i], &extras[i].Member.SnsSummary, &account0, &account1, &account2)
	}
	utils.SendPagedSuccessResponse(ctx, page, pageSize, count, volist)
}

func (c *Controller) plotList2PlotVoList2(d interface{}) interface{} {
	// 对s3图片地址进行签名
	plots := *d.(*[]Plot)
	for i, _ := range plots {
		obj := &plots[i]
		u, _ := c.OssController.PresignedOssDownloadURL(obj.Logo)
		obj.Logo = u.String()
		u, _ = c.OssController.PresignedOssDownloadURL(obj.Cover)
		obj.Cover = u.String()

		if obj.Blazer != nil && len(obj.Blazer.Member.Avatar) > 0 {
			u, _ = c.OssController.PresignedOssDownloadURLWithoutPrefix(obj.Blazer.Member.Avatar)
			if u != nil {
				obj.Blazer.Member.Avatar = u.String()
			}
		}

		if obj.CoBlazer != nil && len(obj.CoBlazer.Member.Avatar) > 0 {
			u, _ = c.OssController.PresignedOssDownloadURLWithoutPrefix(obj.CoBlazer.Member.Avatar)
			if u != nil {
				obj.CoBlazer.Member.Avatar = u.String()
			}
		}
	}

	vo := make([]*PlotVO, len(plots))
	for i, obj := range plots {
		vo[i] = &PlotVO{}
		copier.Copy(vo[i], obj)
		if obj.Blazer != nil {
			vo[i].BlazerName = obj.Blazer.Member.DisplayName
		}
	}

	return vo
}

func (c *Controller) exportMembers(ctx *gin.Context) {
	extras := []MemberExtra{}
	if err := c.Crud.List(&extras, []string{"Member", "Member.SnsSummary", "Wallets"}, "member_id desc", ""); err != nil {
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	volist := make([]*MemberFullVO, len(extras))
	for i := range volist {
		var account0, account1, account2 account.Account
		c.Crud.FindModelWhere(&account0, "user_id = ? and type = ?", extras[i].MemberID, "energy")
		c.Crud.FindModelWhere(&account1, "user_id = ? and type = ?", extras[i].MemberID, "gold")
		c.Crud.FindModelWhere(&account2, "user_id = ? and type = ?", extras[i].MemberID, config.GetConfig().Rosen.Coin.TokenName)
		volist[i] = c.composeRosenMemberFullVO(&extras[i], &extras[i].Member.SnsSummary, &account0, &account1, &account2)
	}
	filename := fmt.Sprintf("users_%v", time.Now().Unix())
	ctx.Writer.Header().Add("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	ctx.Writer.Header().Add("Content-Type", "application/octet-stream")
	w := csv.NewWriter(ctx.Writer)
	w.Comma = ','
	w.UseCRLF = true

	columns := []string{"ID", "登录名", "昵称", "粉丝数量", "关注数量", "Energy", "可用USDT", "锁定USDT", "系统钱包", "用户钱包"}

	if err := w.Write(columns); err != nil {
		log.Errorf("can not write, err is %+v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	for _, row := range volist {
		record := []string{
			fmt.Sprintf("%d", row.ID),
			row.UserName,
			row.DisplayName,
			fmt.Sprintf("%d", row.FollowersCount),
			fmt.Sprintf("%d", row.FolllowingCount),
			fmt.Sprintf("%d", row.Energy),
			fmt.Sprintf("%f", row.TokenCoin),
			fmt.Sprintf("%f", row.LockedTokenCoin),
		}
		tstr := ""
		for _, t := range row.SysWalletAddresses {
			tstr += t
			tstr += ","
		}
		if len(tstr) > 0 {
			tstr = strings.TrimSuffix(tstr, ",")
		}
		record = append(record, tstr)
		tstr = ""
		for _, t := range row.UserWallets {
			tstr += t.Address
			tstr += ","
		}
		if len(tstr) > 0 {
			tstr = strings.TrimSuffix(tstr, ",")
		}
		record = append(record, tstr)
		if err := w.Write(record); err != nil {
			log.Errorf("can not write, err is %+v", err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
	}
	w.Flush()
}

func (c *Controller) airdropPlot(ctx *gin.Context) {
	memberId, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || memberId == 0 {
		log.Errorf("invalid member id: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	var params struct {
		PlotId uint   `json:"plotId"`
		DueTo  uint64 `json:"dueTo"`
		Notify bool   `json:"notify"`
	}
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot bind params: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	// check member is valid
	var m MemberExtra
	if err := c.Crud.GetPreloadModelByID(&m, uint(memberId), []string{"Member"}); err != nil {
		log.Errorf("cannot find member: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	// check plot is valid
	var p Plot
	if err := c.Crud.GetModelByID(&p, params.PlotId); err != nil {
		log.Errorf("cannot find plot: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	// if p.BlazerID != 0 {
	// 	log.Errorf("plot %v is occupied by %v", p.ID, p.BlazerID)
	// 	utils.SendFailureResponse(ctx, 500, "message.common.system-error")
	// 	return
	// }
	// transfer
	p.BlazerID = m.MemberID
	p.OccupiedAt = time.Now()
	p.DueTo = params.DueTo
	p.Health = 1.0
	if err := c.Crud.UpdateModel(&p, []string{"occupied_at", "due_to", "blazer_id", "health"}, nil); err != nil {
		log.Errorf("cannot transfer plot to %v: %v", p.BlazerID, err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	// send notification
	if params.Notify {
		c.SendMessage(m.MemberID, "info-airdrop-plot", m.Member.Language, &p)
	}
	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) airdropToken(ctx *gin.Context) {
	memberId, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || memberId == 0 {
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	var params struct {
		Token    string  `json:"token"`
		Amount   float64 `json:"amount"`
		Decimals int64   `json:"decimals"`
		Notify   bool    `json:"notify"`
	}
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot bind params: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	// check member is valid
	var m MemberExtra
	if err := c.Crud.GetPreloadModelByID(&m, uint(memberId), []string{"Member"}); err != nil {
		log.Errorf("cannot find member: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	// transfer token
	sysAccount := c.accountService.GetAccountByUserAndType(kSystemAccountID, params.Token)
	toAccount := c.accountService.GetAccountByUserAndType(m.MemberID, params.Token)
	if sysAccount == nil || toAccount == nil {
		log.Errorf("cannot find account")
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	if _, err := c.accountService.Transfer(sysAccount, toAccount, int64(params.Amount*math.Pow10(int(params.Decimals))), "airdrop by admin"); err != nil {
		log.Errorf("Transfer failed: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	// send notification
	if params.Notify {
		c.SendMessage(m.MemberID, "info-airdrop-token", m.Member.Language, &params)
	}
	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) airdropEquip(ctx *gin.Context) {
	memberId, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || memberId == 0 {
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	var params struct {
		GoodId int    `json:"goodId"`
		Chain  string `json:"chain"`
		Notify bool   `json:"notify"`
	}
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot bind params: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	// check member is valid
	var m MemberExtra
	if err := c.service.GetPreloadModelByID(&m, uint(memberId), []string{"Member", "Wallets"}); err != nil {
		log.Errorf("cannot find member: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	var good *mall.Good
	if good, err = c.mallService.GetFullGoodByID(uint(params.GoodId)); err != nil {
		log.Errorf("cannot get good by id: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	if err := c.service.SendEquip(&m, params.Chain, good); err != nil {
		log.Errorf("cannot send equip: %v", err)
		utils.SendFailureResponse(ctx, 500, err.Error())
		return
	}

	// send notification
	if params.Notify {
		c.SendMessage(m.MemberID, "info-airdrop-equip", m.Member.Language, good)
	}
	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) adminMemberInfo(ctx *gin.Context) {

	memberId, err := strconv.Atoi(ctx.Param("id"))

	if err != nil {
		log.Errorf("cannot get member id: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}

	var extra MemberExtra
	if err := c.Crud.FindPreloadModelWhere(&extra, []string{"CurrentEquip", "Wallets", "Member"}, "member_id = ?", memberId); err != nil {
		log.Errorf("cannot get member by token: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}

	var sns member.SnsSummary
	if err := c.Crud.FindModelWhere(&sns, "member_id = ?", extra.MemberID); err != nil {
		log.Errorf("cannot get member by token: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}

	var snsId member.SnsID
	if err := c.Crud.FindModelWhere(&snsId, "member_id = ?", extra.MemberID); err == nil {
		// 如果是三方平台用户，将显示的用户名改为xx平台用户
		extra.Member.UserName = fmt.Sprintf("%s USER", strings.ToUpper(snsId.SnsType))
	}

	tokenName := config.GetConfig().Rosen.Coin.TokenName
	energy := c.accountService.Account(extra.MemberID, "energy")
	gold := c.accountService.Account(extra.MemberID, "gold")
	rosen := c.accountService.Account(extra.MemberID, tokenName)

	vo := c.composeRosenMemberFullVO(&extra, &sns, energy, gold, rosen)
	utils.SendSuccessResponse(ctx, vo)
}

func (c *Controller) dashboard(ctx *gin.Context) {

	var userCount, plotCount, suitCount, nftCount, plotSolds, plotListingSolds int64
	var usdtAccountSummary, energyAccountSummary struct {
		Available float64
		Frozen    float64
		Locked    float64
	}
	var registerSummary, gameSummary []struct {
		ActionDate string
		Numbers    int64
	}
	var rechargeSummary []struct {
		ActionDate string
		Amount     float64
	}
	var mintSummary []struct {
		ActionDate string
		MintCount  int64
		Amount     float64
	}
	var m2eSummary []struct {
		ActionDate   string
		SessionCount int64
		Amount       float64
	}

	usdtSummarySql := "select sum(available)/1e6 as available,sum(frozen)/1e6 as frozen,sum(locked)/1e6 as locked from accounts where type = 'usdt' and user_name != 'system'"
	energySummarySql := "select sum(available)/1e2 as available,sum(frozen)/1e2 as frozen,sum(locked)/1e2 as locked from accounts where type = 'energy' and user_name != 'system'"
	registerSummarySql := "select date(created_at) as action_date,count(1) as numbers from member_users where DATE_SUB(CURDATE(), INTERVAL 30 DAY) <= date(created_at) group by action_date order by action_date"
	rechargeSummarySql := "select date(t0.created_at) as action_date,sum(value)/1e6 as amount from transactions t0 left join accounts t1 on t0.to_account_id = t1.id where DATE_SUB(CURDATE(), INTERVAL 30 DAY) <= date(t0.created_at) and t1.type='usdt' and from_account_id=0 and operation='IncreaseAvailable' group by action_date order by action_date"
	mintSummarySql := "select date(created_at) as action_date,count(1) as mint_count,sum(payed_amount) as amount from `rosen_mint_logs` where DATE_SUB(CURDATE(), INTERVAL 30 DAY) <= date(created_at) and success=1 group by action_date order by action_date"
	m2eSummarySql := "select date(created_at) as action_date,count(1) as session_count,sum(earned/1e5) as amount from rosen_mte_sessions where DATE_SUB(CURDATE(), INTERVAL 30 DAY) <= date(created_at) group by action_date order by action_date"
	gameSummarySql := "select DATE(created_at) as action_date, count(1) as numbers from rosen_game_sessions where DATE_SUB(CURDATE(), INTERVAL 30 DAY) <= date(created_at) group by action_date order by action_date"

	c.service.Db.Model(&MemberExtra{}).Count(&userCount)
	c.service.Db.Model(&Plot{}).Count(&plotCount)
	c.service.Db.Model(&Plot{}).Count(&plotCount)
	c.service.Db.Model(&Asset{}).Where("kind = ?", "suit").Count(&suitCount)
	c.service.Db.Model(&Asset{}).Where("kind = ?", "RPN").Count(&nftCount)
	c.service.Db.Model(&ListingPlot{}).Where("successor_id != ?", 0).Count(&plotListingSolds)
	c.service.Db.Model(&account.Transaction{}).Where("description like ?", "occupy plot%").Count(&plotSolds)

	c.service.Db.Raw(usdtSummarySql).Scan(&usdtAccountSummary)
	c.service.Db.Raw(energySummarySql).Scan(&energyAccountSummary)
	c.service.Db.Raw(registerSummarySql).Scan(&registerSummary)
	c.service.Db.Raw(rechargeSummarySql).Scan(&rechargeSummary)
	c.service.Db.Raw(mintSummarySql).Scan(&mintSummary)
	c.service.Db.Raw(m2eSummarySql).Scan(&m2eSummary)
	c.service.Db.Raw(gameSummarySql).Scan(&gameSummary)

	var registerDates []string = make([]string, len(registerSummary))
	var registerNums []int64 = make([]int64, len(registerSummary))

	for i := range registerSummary {
		registerDates[i] = registerSummary[i].ActionDate[0:10]
		registerNums[i] = registerSummary[i].Numbers
	}

	var rechargeDates []string = make([]string, len(rechargeSummary))
	var rechargeNums []float64 = make([]float64, len(rechargeSummary))

	for i := range rechargeSummary {
		rechargeDates[i] = rechargeSummary[i].ActionDate[0:10]
		rechargeNums[i] = rechargeSummary[i].Amount
	}

	var mintDates []string = make([]string, len(mintSummary))
	var mintNums []int64 = make([]int64, len(mintSummary))
	var mintPays []float64 = make([]float64, len(mintSummary))

	for i := range mintSummary {
		mintDates[i] = mintSummary[i].ActionDate[0:10]
		mintNums[i] = mintSummary[i].MintCount
		mintPays[i] = mintSummary[i].Amount
	}

	var m2eDates []string = make([]string, len(m2eSummary))
	var m2eNums []int64 = make([]int64, len(m2eSummary))
	var m2ePays []float64 = make([]float64, len(m2eSummary))

	for i := range m2eSummary {
		m2eDates[i] = m2eSummary[i].ActionDate[0:10]
		m2eNums[i] = m2eSummary[i].SessionCount
		m2ePays[i] = m2eSummary[i].Amount
	}

	var gameDates []string = make([]string, len(gameSummary))
	var gameNums []int64 = make([]int64, len(gameSummary))

	for i := range gameSummary {
		gameDates[i] = gameSummary[i].ActionDate[0:10]
		gameNums[i] = gameSummary[i].Numbers
	}

	utils.SendSuccessResponse(ctx, gin.H{
		"statistics": gin.H{
			"userCount":        userCount,
			"plotCount":        plotCount,
			"suitCount":        suitCount,
			"nftCount":         nftCount,
			"usdt":             usdtAccountSummary.Available + usdtAccountSummary.Frozen + usdtAccountSummary.Locked,
			"energy":           energyAccountSummary.Available + energyAccountSummary.Frozen + energyAccountSummary.Locked,
			"plotSolds":        plotSolds,
			"plotListingSolds": plotListingSolds,
		},
		"register": gin.H{
			"labels": registerDates,
			"datasets": []gin.H{{
				"label":           "30天新注册用户",
				"backgroundColor": "#4979f8",
				"data":            registerNums,
			}},
		},
		"recharge": gin.H{
			"labels": rechargeDates,
			"datasets": []gin.H{{
				"label":           "30天充值小计",
				"backgroundColor": "#4979f8",
				"data":            rechargeNums,
			}},
		},
		"mints": gin.H{
			"labels": mintDates,
			"datasets": []gin.H{{
				"label":           "30天Mint次数",
				"backgroundColor": "#4979f8",
				"data":            mintNums,
			}, {
				"label":           "30天Mint消费",
				"backgroundColor": "#f87949",
				"data":            mintPays,
			}},
		},
		"m2e": gin.H{
			"labels": m2eDates,
			"datasets": []gin.H{{
				"label":           "30天Move人次",
				"backgroundColor": "#4979f8",
				"data":            m2eNums,
			}, {
				"label":           "30天Move收入(kE)",
				"backgroundColor": "#f87949",
				"data":            m2ePays,
			}},
		},
		"games": gin.H{
			"labels": gameDates,
			"datasets": []gin.H{{
				"label":           "30天游戏场次",
				"backgroundColor": "#4979f8",
				"data":            gameNums,
			}},
		},
	})
}

func (c *Controller) pageCities(ctx *gin.Context) {

	c.PreloadPage(ctx, &[]CityRank{}, &[]CityRankVO{}, &CityRank{}, []string{"Plot", "Blazer"}, "id desc")
}

func (c *Controller) saveCity(ctx *gin.Context) {

	var params struct {
		ID        uint      `json:"id"`
		CreatedAt time.Time `json:"createdAt"`
		City      string    `json:"city"`
		BlazerID  uint      `json:"blazerId"`
		PlotID    uint      `json:"plotId"`
		ExpiredAt time.Time `json:"expiredAt"`
	}
	// var params CityRankVO
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot bind params: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	var mo CityRank

	mo.ID = params.ID
	mo.CreatedAt = params.CreatedAt
	mo.City = params.City
	mo.BlazerID = params.BlazerID
	mo.PlotID = params.PlotID
	mo.ExpiredAt = params.ExpiredAt

	if err := c.service.SaveModelOpt(&mo, []string{"ID", "CreatedAt", "City", "BlazerID", "PlotID", "ExpiredAt"}, nil); err != nil {
		log.Errorf("cannot save city rank: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	utils.SendSimpleSuccessResponse(ctx)
}
