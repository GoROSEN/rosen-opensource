package rosen

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"math"
	"path/filepath"
	"strconv"

	"github.com/GoROSEN/rosen-opensource/server-contract/core/config"
	"github.com/GoROSEN/rosen-opensource/server-contract/core/utils"
	"github.com/gin-gonic/gin"
	"github.com/gofrs/uuid"
	"github.com/google/martian/log"
)

func (c *Controller) startMTE(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	item := &MteTraceItemVO{}

	if err := ctx.ShouldBind(item); err != nil {
		log.Errorf("cannot get request body: %v", err)
		utils.SendFailureResponse(ctx, 400, "bad_requst")
		return
	}

	svo, err := c.service.StartMTE(uint(memberId), item.Latitude, item.Longitude)
	if err != nil {
		log.Errorf("cannot start MTE: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.m2e.save-mte-session-error")
		return
	}
	k := math.Pow10(int(config.GetConfig().Rosen.Energy.Decimals))
	utils.SendSuccessMsgResponse(ctx, "message.m2e.mte-started", gin.H{"mteId": svo.ID, "energy": svo.Energy / k, "suitLife": svo.EquipLife})
}

func (c *Controller) pauseMTE(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	item := &MteTraceItemVO{}

	if err := ctx.ShouldBind(item); err != nil {
		log.Errorf("cannot get request body: %v", err)
		utils.SendFailureResponse(ctx, 400, "bad_requst")
		return
	}

	if svo, err := c.service.PauseMTE(uint(memberId), item.MteSessionID, item.Latitude, item.Longitude); err != nil {
		log.Errorf("cannot pause MTE: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.m2e.save-mte-session-error")
		return
	} else {
		k := math.Pow10(int(config.GetConfig().Rosen.Energy.Decimals))
		utils.SendSuccessMsgResponse(ctx, "message.m2e.mte-paused", gin.H{"mteId": svo.ID, "energy": svo.Energy / k, "suitLife": svo.EquipLife})
	}
}

func (c *Controller) resumeMTE(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	item := &MteTraceItemVO{}

	if err := ctx.ShouldBind(item); err != nil {
		log.Errorf("cannot get request body: %v", err)
		utils.SendFailureResponse(ctx, 400, "bad_requst")
		return
	}

	if svo, err := c.service.ResumeMTE(uint(memberId), item.MteSessionID, item.Latitude, item.Longitude); err != nil {
		log.Errorf("message.common.system-error: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.m2e.save-mte-session-error")
		return
	} else {
		k := math.Pow10(int(config.GetConfig().Rosen.Energy.Decimals))
		utils.SendSuccessMsgResponse(ctx, "message.m2e.mte-resumed", gin.H{"mteId": svo.ID, "energy": svo.Energy / k, "suitLife": svo.EquipLife})
	}
}

func (c *Controller) stopMTE(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	item := &MteTraceItemVO{}

	if err := ctx.ShouldBind(item); err != nil {
		log.Errorf("cannot get request body: %v", err)
		utils.SendFailureResponse(ctx, 400, "bad_requst")
		return
	}

	// 停止
	if svo, err := c.service.StopMTE(uint(memberId), item.MteSessionID, item.Latitude, item.Longitude); err != nil {
		log.Errorf("message.common.system-error: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.m2e.save-mte-session-error")
		return
	} else {
		k := math.Pow10(int(config.GetConfig().Rosen.Energy.Decimals))
		utils.SendSuccessMsgResponse(ctx, "message.m2e.mte-stopped", gin.H{"mteId": svo.ID, "energy": svo.Energy / k, "suitLife": svo.EquipLife})
	}
}

func (c *Controller) keepMTE(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	item := &MteTraceItemVO{}

	if err := ctx.ShouldBind(item); err != nil {
		log.Errorf("cannot get request body: %v", err)
		utils.SendFailureResponse(ctx, 400, "bad_requst")
		return
	}

	if svo, err := c.service.KeepMTE(uint(memberId), item.MteSessionID, item.Latitude, item.Longitude); err != nil {
		log.Errorf("message.common.system-error: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.m2e.save-mte-session-error")
		return
	} else {
		k := math.Pow10(int(config.GetConfig().Rosen.Energy.Decimals))
		utils.SendSuccessResponse(ctx, gin.H{"mteId": svo.ID, "energy": svo.Energy / k, "suitLife": svo.EquipLife})
	}
}

func (c *Controller) mintNFT(ctx *gin.Context) {

	// preparing parameters
	memberId := ctx.GetInt("member-id")
	plotId, _ := strconv.Atoi(ctx.Request.PostFormValue("plotId"))
	if plotId <= 0 {
		log.Errorf("invalid plot id")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	count, _ := strconv.Atoi(ctx.Request.PostFormValue("count"))
	if count <= 0 {
		log.Errorf("invalid count")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	chain := ctx.Request.PostFormValue("chain")
	if len(chain) == 0 {
		chain = "solana"
	}
	// capability checks
	var extra MemberExtra
	if err := c.Crud.GetPreloadModelByID(&extra, uint(memberId), []string{"Member", "Wallets"}); err != nil {
		log.Errorf("invalid member id")
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}
	if len(extra.Wallets) == 0 {
		log.Errorf("no wallet for member")
		utils.SendFailureResponse(ctx, 500, "message.member.wallet-not-found")
		return
	}
	var plot Plot
	if err := c.Crud.GetPreloadModelByID(&plot, uint(plotId), []string{"Blazer", "Blazer.Member"}); err != nil {
		log.Errorf("cannot get plot: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.plot.plot-not-found")
		return
	}
	if plot.BlazerID == 0 {
		log.Errorf("plot has no blazer yet")
		utils.SendFailureResponse(ctx, 500, "message.member.blazer-not-found")
		return
	}
	// check avaibility
	if !plot.Available {
		log.Errorf("plot %v is unavailable", plotId)
		utils.SendFailureResponse(ctx, 500, "message.plot.plot-unavailable")
		return
	}

	if plot.BatchMintLimit > 0 && plot.BatchMintLimit < uint32(count) {
		log.Errorf("batch mint limit exceeded")
		utils.SendFailureResponse(ctx, 501, "message.plot.plot-mint-daily-limit-exceeded")
		return
	}

	if plot.DailyMintCount+uint32(count) > mintLimit(plot.DailyMintLimit, plot.Health) {
		log.Errorf("daily mint limit exceeded")
		utils.SendFailureResponse(ctx, 501, "message.plot.plot-mint-daily-limit-exceeded")
		return
	}

	if plot.MintLimitDuration > 0 && plot.MintLimitCount > 0 {
		// 每用户周期内mint限制检查
		mintedCount := c.service.ProducerMintCountInPeroid(uint(memberId), &plot)
		log.Infof("plot %v, mint limit %v / %v, minted %v. batch count = %v", plot.ID, plot.MintLimitCount, plot.MintLimitDuration, mintedCount, count)
		if int64(count)+mintedCount > int64(plot.MintLimitCount) {
			log.Errorf("user mint limit exceeded")
			utils.SendFailureResponse(ctx, 501, "message.plot.plot-mint-daily-limit-exceeded")
			return
		}
	}

	// mint
	tokenName := config.GetConfig().Rosen.Coin.TokenName
	decimals := int64(config.GetConfig().Rosen.Coin.Decimals)
	producerAcc := c.accountService.GetAccountByUserAndType(uint(memberId), tokenName)
	if producerAcc.Available/int64(math.Pow10(int(decimals))) < int64(plot.MintPrice*uint64(count)) {
		log.Errorf("insufficient rosen to mint a NFT")
		utils.SendFailureResponse(ctx, 501, "message.token.insufficient-token")
		return
	}

	// save file to ipfs
	fs, _, err := ctx.Request.FormFile("img")
	if err != nil {
		log.Errorf("cannot get form file: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.ipfs-save-error")
		return
	}
	var ipfsFileUrl string
	if s, err := c.service.SaveFileToIpfs(fs); err != nil {
		log.Errorf("cannot get add image file to ipfs: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.ipfs-save-error")
		return
	} else {
		ipfsFileUrl = s
		log.Infof("ipfs image url: %v", ipfsFileUrl)
	}
	// save file to oss
	uuid4, _ := uuid.NewGen().NewV4()
	filename := fmt.Sprintf("%v_%v", memberId, uuid4.String())
	ossFileName, err := c.OssController.SaveFormFileToOSS(ctx, "img", "nft/"+filename)
	if err != nil {
		log.Errorf("cannot save file: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.oss-save-error")
		return
	}
	log.Infof("oss file: %v", ossFileName)

	var income float64
	if income, err = c.service.MintNFT(chain, &extra, &plot, count, ossFileName, ipfsFileUrl, producerAcc); err != nil {
		log.Errorf("cannot mint nft: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.mint.mint-nft-error")
		return
	}
	if plot.CoBlazerID > 0 {
		c.SendMessage(plot.CoBlazerID, "info-incoming-mint", "en_US", extra.Member.DisplayName, count, plot.Name, income*plot.CoBlazerShare)
		c.SendMessage(plot.BlazerID, "info-incoming-mint", "en_US", extra.Member.DisplayName, count, plot.Name, income*(1.0-plot.CoBlazerShare))
	} else {
		c.SendMessage(plot.BlazerID, "info-incoming-mint", "en_US", extra.Member.DisplayName, count, plot.Name, income)
	}
	c.SendSysMessage(uint(memberId), "info-mint-success", "en_US", count, plot.MintPrice*uint64(count))

	utils.SendSuccessMsgResponse(ctx, "message.mint.mint-nft-success", nil)
}

func (c *Controller) mintNFTJson(ctx *gin.Context) {

	// preparing parameters
	memberId := ctx.GetInt("member-id")
	params := struct {
		PlotId     int    `json:"plotId"`
		ChainName  string `json:"chain"`
		Count      int    `json:"count"`
		ImgName    string `json:"img"`
		ImgDataB64 string `json:"data"`
	}{}
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot parse parameters: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	if len(params.ChainName) == 0 {
		params.ChainName = "solana"
	}
	plotId := params.PlotId
	if plotId <= 0 {
		log.Errorf("invalid plot id")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	count := params.Count
	if count <= 0 {
		log.Errorf("invalid count")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	// capability checks
	var extra MemberExtra
	if err := c.Crud.GetPreloadModelByID(&extra, uint(memberId), []string{"Member", "Wallets"}); err != nil {
		log.Errorf("invalid member id")
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}
	if len(extra.Wallets) == 0 {
		log.Errorf("no wallet for member")
		utils.SendFailureResponse(ctx, 500, "message.member.wallet-not-found")
		return
	}
	var plot Plot
	if err := c.Crud.GetPreloadModelByID(&plot, uint(plotId), []string{"Blazer", "Blazer.Member"}); err != nil {
		log.Errorf("cannot get plot: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.plot.plot-not-found")
		return
	}
	if plot.BlazerID == 0 {
		log.Errorf("plot has no blazer yet")
		utils.SendFailureResponse(ctx, 500, "message.member.blazer-not-found")
		return
	}
	// check avaibility
	if !plot.Available {
		log.Errorf("plot %v is unavailable", plotId)
		utils.SendFailureResponse(ctx, 500, "message.plot.plot-unavailable")
		return
	}

	if plot.BatchMintLimit > 0 && plot.BatchMintLimit < uint32(count) {
		log.Errorf("batch mint limit exceeded")
		utils.SendFailureResponse(ctx, 501, "message.plot.plot-mint-daily-limit-exceeded")
		return
	}

	if plot.DailyMintCount+uint32(count) > mintLimit(plot.DailyMintLimit, plot.Health) {
		log.Errorf("daily mint limit exceeded")
		utils.SendFailureResponse(ctx, 501, "message.plot.plot-mint-daily-limit-exceeded")
		return
	}

	if plot.MintLimitDuration > 0 && plot.MintLimitCount > 0 {
		// 每用户周期内mint限制检查
		mintedCount := c.service.ProducerMintCountInPeroid(uint(memberId), &plot)
		log.Infof("plot %v, mint limit %v / %v, minted %v. batch count = %v", plot.ID, plot.MintLimitCount, plot.MintLimitDuration, mintedCount, count)
		if int64(count)+mintedCount > int64(plot.MintLimitCount) {
			log.Errorf("user mint limit exceeded")
			utils.SendFailureResponse(ctx, 501, "message.plot.plot-mint-daily-limit-exceeded")
			return
		}
	}

	tokenName := config.GetConfig().Rosen.Coin.TokenName
	decimals := int64(config.GetConfig().Rosen.Coin.Decimals)
	producerAcc := c.accountService.GetAccountByUserAndType(uint(memberId), tokenName)
	if producerAcc.Available/int64(math.Pow10(int(decimals))) < int64(plot.MintPrice*uint64(count)) {
		log.Errorf("insufficient rosen to mint a NFT")
		utils.SendFailureResponse(ctx, 501, "message.token.insufficient-token")
		return
	}

	// save file to ipfs
	data, err := base64.StdEncoding.DecodeString(params.ImgDataB64)
	if err != nil {
		log.Errorf("cannot decode base64 data: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.ipfs-save-error")
		return
	}
	var ipfsFileUrl string
	if s, err := c.service.SaveFileToIpfs(bytes.NewReader(data)); err != nil {
		log.Errorf("cannot get add image file to ipfs: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.ipfs-save-error")
		return
	} else {
		ipfsFileUrl = s
		log.Infof("ipfs image url: %v", ipfsFileUrl)
	}
	// save file to oss
	uuid4, _ := uuid.NewGen().NewV4()
	filename := fmt.Sprintf("%v_%v", memberId, uuid4.String())
	ossFileName, err := c.OssController.SaveFileToOSS(data, params.ImgName, "image/"+filepath.Ext(params.ImgName), "nft/"+filename)
	if err != nil {
		log.Errorf("cannot save file: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.oss-save-error")
		return
	}
	log.Infof("oss file: %v", ossFileName)

	if income, err := c.service.MintNFT(params.ChainName, &extra, &plot, count, ossFileName, ipfsFileUrl, producerAcc); err != nil {
		log.Errorf("cannot mint nft: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.mint.mint-nft-error")
		return
	} else {
		if plot.CoBlazerID > 0 {
			c.SendMessage(plot.CoBlazerID, "info-incoming-mint", "en_US", extra.Member.DisplayName, count, plot.Name, income*plot.CoBlazerShare)
			c.SendMessage(plot.BlazerID, "info-incoming-mint", "en_US", extra.Member.DisplayName, count, plot.Name, income*(1.0-plot.CoBlazerShare))
		} else {
			c.SendMessage(plot.BlazerID, "info-incoming-mint", "en_US", extra.Member.DisplayName, count, plot.Name, income)
		}
		c.SendSysMessage(uint(memberId), "info-mint-success", "en_US", count, plot.MintPrice*uint64(count))
	}

	utils.SendSuccessMsgResponse(ctx, "message.mint.mint-nft-success", nil)
}
