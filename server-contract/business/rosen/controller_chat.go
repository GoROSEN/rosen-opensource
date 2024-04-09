package rosen

import (
	"math"

	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/GoROSEN/rosen-apiserver/core/utils"
	"github.com/GoROSEN/rosen-apiserver/features/member"
	"github.com/gin-gonic/gin"
	"github.com/google/martian/log"
	uuid "github.com/satori/go.uuid"
)

// setupMemberAlphaController 初始化控制器
func (c *Controller) setupChatAlphaController(r *gin.RouterGroup) {

	r.GET("/fee", c.chatFee)
	r.GET("/transfer-rules", c.chatTransferRules)
	r.POST("/transfer/:currency", c.chatTransfer)
	r.POST("/receive/:uuid", c.chatRecvTransfer)
	r.GET("/translator", c.getTranslator)
	r.POST("/translator", c.setTranslator)

}

func (c *Controller) chatTransferRules(ctx *gin.Context) {

	utils.SendSuccessResponse(ctx, gin.H{
		"min":        c.service.sysconfig.TransferCoinFloor,
		"max":        c.service.sysconfig.TransferCoinMax,
		"dailyLimit": c.service.sysconfig.TransferCoinDailyLimit,
	})
}

func (c *Controller) chatTransfer(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	currency := ctx.Param("currency")
	var params struct {
		Type        uint    `json:"type"`
		Amount      float64 `json:"amount"`
		PayPassword string  `json:"password"`
		ReceiversId []uint  `json:"receivers"`
	}
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot parse params: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	if params.Amount <= 0 {
		log.Errorf("invalid params")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	// 查找发送用户
	var extra MemberExtra
	if err := c.service.FindPreloadModelWhere(&extra, []string{"Member"}, "member_id = ?", memberId); err != nil {
		log.Errorf("cannot find member extra: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	// 验证支付密码
	if extra.PayPassword != utils.GetPass(params.PayPassword) {
		log.Errorf("invalid pay password")
		utils.SendFailureResponse(ctx, 500, "message.transfer.invalid-pay-password")
		return
	}
	// 检查限额
	if params.Amount < c.service.sysconfig.TransferCoinFloor {
		log.Errorf("transfer amount (%v) did not match transfer floor: %v", params.Amount, c.service.sysconfig.TransferCoinFloor)
		utils.SendFailureResponse(ctx, 400, "message.transfer.min-limit-exceeded")
		return
	}
	if params.Amount > c.service.sysconfig.TransferCoinMax {
		log.Errorf("transfer amount (%v) did not match transfer max: %v", params.Amount, c.service.sysconfig.TransferCoinMax)
		utils.SendFailureResponse(ctx, 400, "message.transfer.max-limit-exceeded")
		return
	}
	// 设置货币类型
	var coin *config.RosenCoinConfig
	if currency == "gem" {
		coin = &config.GetConfig().Rosen.Coin2
	} else {
		coin = &config.GetConfig().Rosen.Coin
	}
	decimals := int64(coin.Decimals)

	// 检查当日限额
	var daily struct {
		Amount float64
	}
	if err := c.service.Db.Model(&ChatTransferCoin{}).Select("sum(amount) as amount").Where("from_member_id = ? and DATE_FORMAT(created_at, '%Y%m%d' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m%d' )", memberId).First(&daily).Error; err != nil {
		log.Errorf("cannot retrieve daily amount: %v", err)
	} else {
		daily.Amount /= math.Pow10(int(decimals))
	}
	if params.Amount+daily.Amount > c.service.sysconfig.TransferCoinDailyLimit {
		log.Errorf("daily transfer amount (%v) is exceeded daily limit: %v", params.Amount+daily.Amount, c.service.sysconfig.TransferCoinDailyLimit)
		utils.SendFailureResponse(ctx, 400, "message.transfer.daily-limit-exceeded")
		return
	}

	// 检查并冻结发送方余额
	amount := int64(params.Amount * math.Pow10(int(decimals)))
	count := int64(len(params.ReceiversId))
	accTx := c.accountService.Begin()
	acc := accTx.GetAccountByUserAndType(uint(memberId), coin.TokenName)
	if acc == nil {
		log.Errorf("cannot find sender account")
		accTx.Rollback()
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	if _, err := accTx.Freeze(acc, amount*count, "chat transfer"); err != nil {
		log.Errorf("cannot freeze amount: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.token.insufficient-token")
		accTx.Rollback()
		return
	}
	// 生成转账记录
	transferRecord := &ChatTransferCoin{
		UUID:          uuid.NewV4().String(),
		FromMemberID:  uint(memberId),
		FromAccountID: acc.ID,
		Type:          params.Type,
		Amount:        amount,
		Currency:      coin.TokenName,
		Status:        ChatTransferCoinStatusAvailable,
	}
	if err := accTx.Database().Create(transferRecord).Error; err != nil {
		log.Errorf("cannot create transfer record: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		accTx.Rollback()
		return
	}
	// 生成待收款记录
	if params.Type == ChatTransferCoinTypeTransfer {
		// 转账，暂时只能1对1
		if len(params.ReceiversId) != 1 {
			log.Errorf("invalid receiver id")
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			accTx.Rollback()
			return
		}
		// 生成待收记录
		receipt := &ChatTransferCoinReceipt{
			ChatTransferCoinID: transferRecord.ID,
			ReceiverMemberID:   params.ReceiversId[0],
			Amount:             amount,
			Status:             ChatTransferCoinReceiptStatusAvailable,
		}
		if err := accTx.Database().Create(receipt).Error; err != nil {
			log.Errorf("cannot create receipt record: %v", err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			accTx.Rollback()
			return
		}
		// 发推送给接收人
		var receiverMember member.Member
		c.service.GetModelByID(&receiverMember, params.ReceiversId[0])
		msgParams := map[string]interface{}{
			"UsdtAmount": params.Amount,
			"From":       extra.Member.DisplayName,
		}
		c.SendMessage(uint(params.ReceiversId[0]), "info-transfer-sent", receiverMember.Language, msgParams)
	} else {
		// 红包。
	}

	accTx.Commit()
	// 通知收款方：也许让客户端自己发消息更合适。
	utils.SendSuccessResponse(ctx, gin.H{"transferId": transferRecord.UUID})
}

func (c *Controller) chatRecvTransfer(ctx *gin.Context) {
	memberId := ctx.GetInt("member-id")
	tuuid := ctx.Param("uuid")
	// 检查转账记录
	var transferRecord ChatTransferCoin
	if err := c.service.FindModelWhere(&transferRecord, "uuid = ?", tuuid); err != nil {
		log.Errorf("cannot find transfer record: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	var receipt ChatTransferCoinReceipt
	if err := c.service.FindModelWhere(&receipt, "chat_transfer_coin_id = ? and receiver_member_id = ? and status = ?", transferRecord.ID, memberId, ChatTransferCoinReceiptStatusAvailable); err != nil {
		log.Errorf("cannot find transfer receipt: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	// 准备账户
	accFrom := c.accountService.GetAccountByID(transferRecord.FromAccountID)
	if accFrom == nil {
		log.Errorf("cannot find transfer sender account id %v", transferRecord.FromAccountID)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	accTo := c.accountService.Account(receipt.ReceiverMemberID, transferRecord.Currency)
	if accTo == nil {
		log.Errorf("cannot find transfer receiver account id by member id %v", receipt.ReceiverMemberID)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	// 更新状态，过滤并发
	if result := c.service.Db.Model(&ChatTransferCoinReceipt{}).Where("id = ? and status = ?", receipt.ID, ChatTransferCoinReceiptStatusAvailable).Update("status", ChatTransferCoinReceiptStatusFinished); result.RowsAffected != 1 || result.Error != nil {
		log.Errorf("receipt out of date or update error: %v", result.Error)
		// utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		utils.SendSimpleSuccessResponse(ctx)
		return
	}
	// 解冻资金
	if _, err := c.accountService.Unfreeze(accFrom, accTo, receipt.Amount, "chat transfer"); err != nil {
		// 撤销状态变更
		c.service.Db.Model(&ChatTransferCoinReceipt{}).Where("id = ? and status = ?", receipt.ID, ChatTransferCoinReceiptStatusFinished).Update("status", ChatTransferCoinReceiptStatusAvailable)
		log.Errorf("cannot transfer from %v to %v, err = %v", accFrom.ID, accTo.ID, err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	// 通知发放人
	var senderMember, receiverMember member.Member
	c.service.GetModelByID(&senderMember, transferRecord.FromMemberID)
	c.service.GetModelByID(&receiverMember, uint(memberId))
	msgParams := map[string]interface{}{
		"To": receiverMember.DisplayName,
	}
	c.SendMessage(transferRecord.FromMemberID, "info-transfer-received", senderMember.Language, msgParams)

	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) getTranslator(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")

	var extra MemberExtra
	if err := c.Crud.FindPreloadModelWhere(&extra, []string{}, "member_id = ?", memberId); err != nil {
		log.Errorf("cannot get member by token: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}

	utils.SendSuccessResponse(ctx, gin.H{
		"enable":   extra.EnableChatTranslation,
		"language": extra.ChatTranslationLang,
	})
}

func (c *Controller) setTranslator(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	var params struct {
		Enable   bool   `json:"enable"`
		Language string `json:"language"`
	}
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("rosen/controller/setTranslator: cannot bind parameters: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	var extra MemberExtra
	if err := c.Crud.GetPreloadModelByID(&extra, uint(memberId), []string{}); err != nil {
		log.Errorf("rosen/controller/updateMemberInfo: cannot get member: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}

	extra.EnableChatTranslation = params.Enable
	extra.ChatTranslationLang = params.Language
	if err := c.Crud.UpdateModel(&extra, []string{"EnableChatTranslation", "ChatTranslationLang"}, nil); err != nil {
		log.Errorf("rosen/controller/setTranslator: cannot update member extra: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	if err := c.service.SendTranslatorUpdate(uint(memberId), params.Enable, params.Language); err != nil {
		log.Errorf("rosen/controller/setTranslator: cannot update translator status to wsserver: %v", err)
	}

	utils.SendSimpleSuccessResponse(ctx)
}
