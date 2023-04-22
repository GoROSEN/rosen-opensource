package rosen

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/GoROSEN/rosen-opensource/server-contract/core/config"
	"github.com/GoROSEN/rosen-opensource/server-contract/core/utils"
	"github.com/GoROSEN/rosen-opensource/server-contract/features/member"
	"github.com/gin-gonic/gin"
	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
)

// setupMemberController 初始化控制器
func (c *Controller) setupMemberController(r *gin.RouterGroup) {

	r.GET("/basic", c.memberInfo) // 获取会员信息
	r.POST("/basic", c.updateMemberInfo)
	r.POST("/wallet/new", c.newUserWallet)
	r.POST("/virtual-image", c.updateVImage)
	r.GET("/virtual-image", func(ctx *gin.Context) {
		memberId := ctx.GetInt("member-id")
		var memberExtra MemberExtra
		if err := c.Crud.GetModelByID(&memberExtra, uint(memberId)); err != nil {
			log.Errorf("cannot get member virtual image: %v", err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
		var vimg Asset
		if memberExtra.VirtualImageID > 0 {
			if err := c.Crud.GetModelByID(&vimg, memberExtra.VirtualImageID); err != nil {
				log.Errorf("cannot get member virtual image: %v", err)
				utils.SendFailureResponse(ctx, 500, "message.common.system-error")
				return
			}
		}
		vo := &AssetVO{}
		copier.Copy(vo, &vimg)
		utils.SendSuccessResponse(ctx, vo)
	})
	r.GET("/virtual-images/:page", func(ctx *gin.Context) {
		memberId := ctx.GetInt("member-id")
		keyword := ctx.Query("keyword")
		if len(keyword) == 0 {
			c.PageWhere(ctx, &[]Asset{}, &[]AssetVO{}, &Asset{}, "id desc", "type = 1 and owner_id = ?", memberId)
		} else {
			c.PageWhere(ctx, &[]Asset{}, &[]AssetVO{}, &Asset{}, "id desc", "type = 1 and owner_id = ? and name like ?", memberId, "%"+keyword+"%")
		}
	})
	r.POST("/exchange", c.exchangeCoin)
	r.GET("/exchangeRate", c.exchangeRate)
	r.POST("/account/withdraw/:token", c.accountWidthDraw)
	r.GET("/followers/:page", c.getFollowers)
	r.GET("/following/:page", c.getFollowing)
	r.GET("/search/:page", c.searchMember)
}

func (c *Controller) memberInfo(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")

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
	rosen := c.accountService.Account(extra.MemberID, tokenName)

	vo := c.composeRosenMemberFullVO(&extra, &sns, energy, rosen)
	utils.SendSuccessResponse(ctx, vo)
}

func (c *Controller) updateVImage(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	vimgID := ctx.Request.FormValue("vimgId")
	var member MemberExtra
	if err := c.Crud.FindModelWhere(&member, "member_id = ?", memberId); err != nil {
		log.Errorf("cannot get member with member id (%v): %v", memberId, err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}
	val, err := strconv.Atoi(vimgID)
	if err != nil {
		log.Errorf("cannot convert virtual image id (%v) to int: %v", vimgID, err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	var vimg Asset
	if err := c.Crud.GetModelByID(&vimg, uint(val)); err != nil {
		log.Errorf("cannot find virtual image id (%v) for: %v", vimgID, err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	if vimg.OwnerID != uint(memberId) {
		log.Errorf("member is not the owner of the asset")
		utils.SendFailureResponse(ctx, 500, "message.common.privilege-error")
		return
	}
	member.VirtualImageID = uint(val)
	if err := c.Crud.SaveModel(&member); err != nil {
		log.Errorf("cannot save member extra info: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) exchangeRate(ctx *gin.Context) {

	from := ctx.Query("from")
	to := ctx.Query("to")

	exchangeRates := map[string]map[string]float64{
		"energy": {"rosen": 0.015625, "usdt": 0.015625},
		"rosen":  {"energy": 64.0},
		"usdt":   {"energy": 64.0},
	}

	t0, exists := exchangeRates[from]
	if !exists {
		utils.SendFailureResponse(ctx, 500, "message.member.invalid-from-token")
		return
	}
	t1, exists := t0[to]
	if !exists {
		utils.SendFailureResponse(ctx, 500, "message.member.invalid-to-token")
		return
	}

	utils.SendSuccessResponse(ctx, t1)
}

func (c *Controller) exchangeCoin(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	var params struct {
		FromType string `json:"from"`
		ToType   string `json:"to"`
		Value    uint   `json:"value"`
	}
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("rosen/controller/exchangeCoin: cannot bind parameters: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	member := &MemberExtra{}
	if err := c.service.GetModelByID(&member, uint(memberId)); err != nil {
		log.Errorf("rosen/controller/exchangeCoin: cannot get member: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}
	if value, err := c.service.ExchangeCoin(params.FromType, params.ToType, params.Value, uint(memberId)); err != nil {
		utils.SendFailureResponse(ctx, 500, err.Error())
		return
	} else {
		utils.SendSuccessResponse(ctx, gin.H{"cost": value})
	}
}

func (c *Controller) updateMemberInfo(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	var params RosenMemberVO
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("rosen/controller/updateMemberInfo: cannot bind parameters: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	var extra MemberExtra
	if err := c.Crud.GetPreloadModelByID(&extra, uint(memberId), []string{"Member", "Wallets"}); err != nil {
		log.Errorf("rosen/controller/updateMemberInfo: cannot get member: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}

	extra.Member.ID = uint(memberId)
	if len(params.DisplayName) > 0 {
		extra.Member.DisplayName = params.DisplayName
	}
	if len(params.Avator) > 0 {
		extra.Member.Avatar = params.Avator
	}
	if len(params.Gender) > 0 {
		extra.Member.Gender = params.Gender
	}
	if len(params.CellPhone) > 0 {
		extra.Member.CellPhone = params.CellPhone
	}
	if len(params.Bio) > 0 {
		extra.Member.Bio = params.Bio
	}
	if len(params.WalletAddress) > 0 {
		var w Wallet
		if err := c.Crud.FindModelWhere(&w, "owner_id = ? and chain=? and (pri_key in ('') or pri_key is null)", memberId, "solana"); err != nil {
			// insert a new one
			w.PubKey = params.WalletAddress
			w.Address = params.WalletAddress
			w.OwnerID = extra.MemberID
			w.Chain = "solana"
		} else {
			// do not update it
			// w.Address = params.WalletAddress
		}
		if err := c.Crud.SaveModel(&w); err != nil {
			log.Errorf("rosen/controller/updateMemberInfo: cannot save wallet info: %v", err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
	}

	if err := c.Crud.SaveModel(&extra.Member); err != nil {
		log.Errorf("rosen/controller/updateMemberInfo: cannot save member: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	extra.ShareLocation = params.ShareLocation
	if err := c.Crud.UpdateModel(&extra, []string{"ShareLocation"}, nil); err != nil {
		log.Errorf("rosen/controller/updateMemberInfo: cannot update member extra: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) accountWidthDraw(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	token := ctx.Param("token")
	var params struct {
		Amount float64 `json:"amount"`
		Chain  string  `json:"chain"`
	}
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("rosen/controller/accountWidthDraw: cannot bind parameters: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	if len(params.Chain) == 0 {
		params.Chain = "solana"
	}
	if params.Amount < c.service.sysconfig.WithdrawAmountFloor {
		log.Errorf("amount to low: %v < %v", params.Amount, c.service.sysconfig.WithdrawAmountFloor)
		utils.SendFailureResponse(ctx, 500, "message.member.withdraw-amount-low")
		return
	}
	if err := c.service.WithdrawToken(uint(memberId), params.Amount, token, params.Chain); err != nil {
		utils.SendFailureResponse(ctx, 500, err.Error())
		return
	}
	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) newUserWallet(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	var params WalletVO
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("rosen/controller/newUserWallet: cannot bind parameters: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	wallet := Wallet{
		OwnerID: uint(memberId),
		Chain:   params.Chain,
		Address: params.Address,
		PubKey:  params.Address,
	}
	if err := c.service.CreateModel(&wallet); err != nil {
		log.Errorf("rosen/controller/newUserWallet: cannot save user wallet: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) getFollowers(ctx *gin.Context) {
	memberId := ctx.GetInt("member-id")
	page, err := strconv.Atoi(ctx.Param("page"))
	if err != nil || page < 1 {
		page = 1
	}
	pageSize, err := strconv.Atoi(ctx.Query("pageSize"))
	if err != nil || pageSize <= 0 {
		pageSize = 10
	}

	var m member.Member
	m.ID = uint(memberId)
	followers := []member.Member{}
	var count int64
	keyword := ctx.Query("keyword")
	if len(keyword) == 0 {
		c.Crud.Db.Offset((page - 1) * pageSize).Limit(pageSize).Model(&m).Association("Followers").Find(&followers)
		count = c.Crud.Db.Model(&m).Association("Followers").Count()
	} else {
		count = c.Crud.Db.Model(&m).Where("display_name like ?", "%"+keyword+"%").Association("Followers").Count()
		c.Crud.Db.Offset((page-1)*pageSize).Limit(pageSize).Model(&m).Where("display_name like ?", "%"+keyword+"%").Association("Followers").Find(&followers)
	}
	vo := []MemberWithEquipVO{}
	copier.Copy(&vo, &followers)
	fids := make([]uint, len(followers))
	for i := range followers {
		fids[i] = followers[i].ID
	}
	mes := []MemberExtra{}
	if err := c.Crud.Db.Model(&MemberExtra{}).Preload("CurrentEquip").Find(&mes, "member_id in ?", fids).Error; err != nil {
		log.Errorf("cannot get member extras where id in %v: %v", fids, err)
		utils.SendFailureResponse(ctx, 500, "error")
	}
	for i := range vo {
		if len(vo[i].Avatar) > 0 {
			imgUrl, _ := c.PresignedOssDownloadURLWithoutPrefix(vo[i].Avatar)
			vo[i].Avatar = imgUrl.String()
			if mes[i].CurrentEquip != nil {
				vo[i].Equip = asset2EquipAssetVo(mes[i].CurrentEquip).(*EquipAssetVO)
			}
		}
	}
	utils.SendPagedSuccessResponse(ctx, page, pageSize, count, vo)
}

func (c *Controller) getFollowing(ctx *gin.Context) {
	memberId := ctx.GetInt("member-id")
	page, err := strconv.Atoi(ctx.Param("page"))
	if err != nil || page < 1 {
		page = 1
	}
	pageSize, err := strconv.Atoi(ctx.Query("pageSize"))
	if err != nil || pageSize <= 0 {
		pageSize = 10
	}
	var m member.Member
	m.ID = uint(memberId)
	followings := []member.Member{}
	keyword := strings.ToLower(ctx.Query("keyword"))
	var count int64
	if len(keyword) == 0 {
		count = c.Crud.Db.Model(&m).Association("Followings").Count()
		log.Debugf("count = %v", count)
		c.Crud.Db.Offset((page - 1) * pageSize).Limit(pageSize).Model(&m).Association("Followings").Find(&followings)
	} else {
		count = c.Crud.Db.Model(&m).Where("lower(display_name) like CONCAT('%',?,'%')", keyword).Association("Followings").Count()
		log.Debugf("count = %v", count)
		c.Crud.Db.Offset((page-1)*pageSize).Limit(pageSize).Model(&m).Where("display_name like ?", "%"+keyword+"%").Association("Followings").Find(&followings)
	}
	log.Debugf("len(followings) = %v", len(followings))
	vo := []MemberWithEquipVO{}
	copier.Copy(&vo, &followings)
	fids := make([]uint, len(followings))
	for i := range followings {
		fids[i] = followings[i].ID
	}
	mes := []MemberExtra{}
	if err := c.Crud.Db.Model(&MemberExtra{}).Preload("CurrentEquip").Find(&mes, "member_id in ?", fids).Error; err != nil {
		log.Errorf("cannot get member extras where id in %v: %v", fids, err)
		utils.SendFailureResponse(ctx, 500, "error")
	}
	for i := range vo {
		if len(vo[i].Avatar) > 0 {
			imgUrl, _ := c.PresignedOssDownloadURLWithoutPrefix(vo[i].Avatar)
			vo[i].Avatar = imgUrl.String()
			if mes[i].CurrentEquip != nil {
				vo[i].Equip = asset2EquipAssetVo(mes[i].CurrentEquip).(*EquipAssetVO)
			}
		}
	}
	utils.SendPagedSuccessResponse(ctx, page, pageSize, count, vo)
}

func (c *Controller) searchMember(ctx *gin.Context) {

	keyword := strings.ToLower(ctx.Query("key"))
	paged := true
	whereClause := ""
	params := []interface{}{}

	if len(keyword) > 0 {

		whereClause += "lower(Member.display_name) like CONCAT('%',?,'%')"
		params = append(params, keyword)

		if paged {
			c.PageFull(ctx, &[]MemberExtra{}, &[]MemberWithEquipVO{}, &MemberExtra{}, []string{"CurrentEquip"}, []string{"Member"}, c.memberExtraList2MemberWithEquipVOList, "Member.display_name", whereClause, params...)
		} else {
			c.ListAll(ctx, &[]MemberExtra{}, &[]MemberWithEquipVO{}, &MemberExtra{}, []string{"CurrentEquip"}, []string{"Member"}, c.memberExtraList2MemberWithEquipVOList, "Member.display_name", whereClause, params...)
		}
	} else {
		// 没关键字输出空结果
		if paged {
			utils.SendPagedSuccessResponse(ctx, 1, 1, 0, []MemberWithEquipVO{})
		} else {
			utils.SendSuccessResponse(ctx, []MemberWithEquipVO{})
		}
	}
}
