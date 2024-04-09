package rosen

import (
	"context"
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"

	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/GoROSEN/rosen-apiserver/core/utils"
	"github.com/GoROSEN/rosen-apiserver/features/member"
	"github.com/awa/go-iap/appstore/api"
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
	r.POST("/follow", c.follow)     // 关注好友
	r.POST("/unfollow", c.unfollow) // 取消关注
	r.POST("/wallet/update", func(ctx *gin.Context) {
		memberId := ctx.GetInt("member-id")
		c.service.SendCheckUserWallet(uint(memberId))
		utils.SendSimpleSuccessResponse(ctx)
	})
	r.POST("/delete/:vcode", c.deleteMember)
	r.POST("/account/iap/apple/:transactionId", c.accountInAppPurchase)
	r.POST("/pay-password/set", c.setPayPassword)
	r.POST("/pay-password/reset", c.resetPayPassword)
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
	gem := c.accountService.Account(extra.MemberID, "gem")
	rosen := c.accountService.Account(extra.MemberID, tokenName)

	vo := c.composeRosenMemberFullVO(&extra, &sns, energy, gem, rosen)
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
	if err := c.Crud.SaveModelOpt(&member, []string{}, []string{"CurrentEquip", "Member", "Assets", "Wallets"}); err != nil {
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
		"usdt":   {"energy": 64.0, "gold": 100.0},
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

	if err := c.Crud.SaveModelOpt(&extra.Member, []string{}, []string{"SnsIDs", "Followers", "Followings", "SnsSummary"}); err != nil {
		log.Errorf("rosen/controller/updateMemberInfo: cannot save member: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	extra.ShareLocation = params.ShareLocation
	extra.EnableChatTranslation = params.EnableChatTranslation
	extra.ChatTranslationLang = params.ChatTranslationLang
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

	memberId := ctx.GetInt("member-id")
	keyword := strings.ToLower(ctx.Query("key"))
	paged := true
	whereClause := "member_id != ?"
	params := []interface{}{memberId}

	if len(keyword) > 0 {

		whereClause += " and lower(Member.display_name) like CONCAT('%',?,'%')"
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

func (c *Controller) follow(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	params := struct {
		FollowingId uint `json:"followingId"`
	}{}

	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("invalid following id: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	if err := c.memberService.MemberFollow(uint(memberId), params.FollowingId); err != nil {
		log.Errorf("cannot following user: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	c.service.SendFollowingChange(uint(memberId), params.FollowingId, true)

	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) unfollow(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	params := struct {
		FollowingId uint `json:"followingId"`
	}{}

	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("invalid following id: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	if err := c.memberService.MemberUnfollow(uint(memberId), params.FollowingId); err != nil {
		log.Errorf("cannot unfollowing user: %v", err)
		utils.SendFailureResponse(ctx, 500, "sytem_error")
		return
	}

	c.service.SendFollowingChange(uint(memberId), params.FollowingId, false)

	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) deleteMember(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	vcode := ctx.Param("vcode")
	cfg := config.GetConfig()

	var m member.Member

	if err := c.service.GetModelByID(&m, uint(memberId)); err != nil {
		log.Errorf("cannot get member by id %v: %v", memberId, err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	if cfg.Rosen.VCode &&
		vcode != "EA88E1C6-ED03-4DDE-BFAD-00705C2F8A6E" { //万能验证码
		cmd := c.service.client.Get(fmt.Sprintf("unregister-code:%v", m.Email))
		if cmd.Err() != nil {
			cmd = c.service.client.Get(fmt.Sprintf("unregister-code:%v", m.CellPhone))
		}
		if cmd.Err() != nil {
			log.Errorf("cannot get vcode from cache: %v")
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
		if cmd.Val() != vcode {
			log.Errorf("cannot get invalid vcode: %v", cmd.Val())
			utils.SendFailureResponse(ctx, 500, "message.member.invalid-username-verifycode")
			return
		}
	} else {
		log.Infof("skipped vcode verification")
	}

	tx := c.service.Db.Begin()
	// 退地
	tx.Model(&Plot{}).Where("blazer_id = ?", memberId).Update("blazer_id", nil)
	tx.Model(&Plot{}).Where("co_blazer_id = ?", memberId).Update("co_blazer_id", nil)

	// 删人
	// me := &MemberExtra{MemberID: uint(memberId)}
	// if err := tx.Delete(me).Error; err != nil {
	// 	tx.Rollback()
	// 	log.Errorf("cannot delete member extra by id %v: %v", memberId, err)
	// 	utils.SendFailureResponse(ctx, 500, "message.common.system-error")
	// 	return
	// }

	if err := tx.Delete(&m).Error; err != nil {
		tx.Rollback()
		log.Errorf("cannot delete member by id %v: %v", memberId, err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	if err := tx.Commit().Error; err != nil {
		log.Errorf("cannot commit member deletion by id %v: %v", memberId, err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	token := ctx.GetHeader("X-Token")
	c.service.client.Del(token)

	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) accountInAppPurchase(ctx *gin.Context) {

	transactionId := ctx.Param("transactionId")
	memberId := ctx.GetInt("member-id")

	if len(transactionId) == 0 {
		log.Errorf("invalid transaction id")
		utils.SendFailureResponse(ctx, 400, "sytem_error")
		return
	}

	iapCfg := config.GetConfig().InAppPurchase
	ACCOUNTPRIVATEKEY, err := os.ReadFile(iapCfg.Apple.KeyFile)

	if err != nil {
		log.Errorf("cannot open key file: %v", err)
		utils.SendFailureResponse(ctx, 500, "sytem_error")
		return
	}

	scfg := &api.StoreConfig{
		KeyContent: ACCOUNTPRIVATEKEY,     // Loads a .p8 certificate
		KeyID:      iapCfg.Apple.KeyID,    // Your private key ID from App Store Connect (Ex: 2X9R4HXF34)
		BundleID:   iapCfg.Apple.BundleID, // Your app’s bundle ID
		Issuer:     iapCfg.Apple.Issuer,   // Your issuer ID from the Keys page in App Store Connect (Ex: "57246542-96fe-1a63-e053-0824d011072a")
		Sandbox:    iapCfg.Apple.Sandbox,  // default is Production
	}

	a := api.NewStoreClient(scfg)
	bctx := context.Background()
	resp, err := a.GetTransactionInfo(bctx, transactionId)
	if err != nil {
		log.Errorf("cannot get transaction info: %v", err)
		utils.SendFailureResponse(ctx, 500, "sytem_error")
		return
	}

	transaction, err := a.ParseSignedTransaction(resp.SignedTransactionInfo)
	if err != nil {
		log.Errorf("cannot parse transaction: %v", err)
		utils.SendFailureResponse(ctx, 500, "sytem_error")
		return
	}

	if transaction.TransactionID != transactionId {
		log.Errorf("invalid transaction id: should %v, got %v", transactionId, transaction.TransactionID)
		utils.SendFailureResponse(ctx, 500, "sytem_error")
		return
	}

	coinCfg := config.GetConfig().Rosen.Coin2
	var goldAmount int64 = 0
	decimals := int64(coinCfg.Decimals)
	t := int64(math.Pow10(int(decimals))) * int64(transaction.Quantity)
	switch transaction.ProductID {
	// new
	case "gems_100":
		goldAmount = 1 * t
	case "gems_500":
		goldAmount = 5 * t
	case "gems_1000":
		goldAmount = 10 * t
	case "gems_2000":
		goldAmount = 20 * t
	case "gems_5000":
		goldAmount = 50 * t
	case "gems_10000":
		goldAmount = 100 * t
	}

	if goldAmount > 0 {
		// 确认收据
		if err := c.accountService.SaveReceiption("apple", transactionId, uint(memberId), transaction); err != nil {
			log.Errorf("cannot confirm transaction(%v): %v", transactionId, err)
			utils.SendFailureResponse(ctx, 500, "sytem_error")
			return
		}
		// 加钱
		acc := c.accountService.Account(uint(memberId), coinCfg.TokenName)
		if acc == nil {
			log.Errorf("cannot find account for %v@%v", memberId, coinCfg.TokenName)
			utils.SendFailureResponse(ctx, 500, "sytem_error")
			return
		}
		c.accountService.IncreaseAvailable(acc, goldAmount, fmt.Sprintf("charge from apple IAP, txid = %v, currenct = %v, quantant = %v, price = %v", transactionId, transaction.Currency, transaction.Quantity, transaction.Price))
	} else {
		log.Errorf("invalid product id: %v", transaction.ProductID)
		utils.SendFailureResponse(ctx, 500, "sytem_error")
		return
	}

	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) setPayPassword(ctx *gin.Context) {
	memberId := ctx.GetInt("member-id")
	var params struct {
		OldPassword string `json:"old,omitempty"`
		NewPassword string `json:"new"`
	}

	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot bind parameters: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	// 新密码不能为空
	if len(params.NewPassword) == 0 {
		log.Errorf("invalid new password")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	var extra MemberExtra
	if err := c.service.FindModelWhere(&extra, "member_id = ?", memberId); err != nil {
		log.Errorf("cannot find member extra: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	if len(extra.PayPassword) > 0 && utils.GetPass(params.OldPassword) != extra.PayPassword {
		// 校验旧密码失败
		log.Errorf("invalid old password")
		utils.SendFailureResponse(ctx, 500, "message.member.invalid-username-password")
		return
	}

	extra.PayPassword = utils.GetPass(params.NewPassword)
	if err := c.service.UpdateModel(&extra, []string{"PayPassword"}, nil); err != nil {
		log.Errorf("cannot update member pay password: %v", err)
		utils.SendFailureResponse(ctx, 500, "sytem_error")
		return
	}

	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) resetPayPassword(ctx *gin.Context) {
	memberId := ctx.GetInt("member-id")
	var params struct {
		VCode       string `json:"vcode"`
		NewPassword string `json:"new"`
	}

	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot bind parameters: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	var extra MemberExtra
	if err := c.service.FindPreloadModelWhere(&extra, []string{"Member"}, "member_id = ?", memberId); err != nil {
		log.Errorf("cannot find member extra: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	email := strings.ToLower(extra.Member.Email)
	if result, err := c.memberService.CheckVCode("forgotppw", email, params.VCode); err != nil {
		if result, err = c.memberService.CheckVCode("forgotppw", extra.Member.CellPhone, params.VCode); err != nil || !result {
			log.Errorf("verify code error: %v", err)
			utils.SendFailureResponse(ctx, 501, "message.member.invalid-username-verifycode")
			return
		}
	} else if !result {
		utils.SendFailureResponse(ctx, 501, "message.member.invalid-username-verifycode")
		return
	}

	// 新密码不能为空
	if len(params.NewPassword) == 0 {
		log.Errorf("invalid new password")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	extra.PayPassword = utils.GetPass(params.NewPassword)
	if err := c.service.UpdateModel(&extra, []string{"PayPassword"}, nil); err != nil {
		log.Errorf("cannot update member pay password: %v", err)
		utils.SendFailureResponse(ctx, 500, "sytem_error")
		return
	}

	utils.SendSimpleSuccessResponse(ctx)
}
