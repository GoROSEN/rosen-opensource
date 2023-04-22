package rosen

import (
	"strconv"
	"time"

	"github.com/GoROSEN/rosen-opensource/server-contract/core/utils"
	"github.com/GoROSEN/rosen-opensource/server-contract/features/member"
	"github.com/gin-gonic/gin"
	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
)

// setupMemberAlphaController 初始化控制器
func (c *Controller) setupMemberAlphaController(r *gin.RouterGroup) {

	r.POST("/plot/:id", c.editPlot)
	r.GET("/member/:id/info", c.getRosenMemberInfo)
	r.GET("/member/:id/plots", c.getRosenMemberPlots)
	r.GET("/member/:id/galleries", c.getRosenMemberGalleries)
	r.GET("/producer/listing-plots/:page", c.listingPlots)
	r.POST("/producer/start-mte", c.startMTE)
	r.POST("/producer/pause-mte", c.pauseMTE)
	r.POST("/producer/resume-mte", c.resumeMTE)
	r.POST("/producer/stop-mte", c.stopMTE)
	r.POST("/producer/keep-mte", c.keepMTE)
	r.POST("/producer/mint", c.mintNFT)
	r.POST("/producer/mint2", c.mintNFTJson)
	r.GET("/blazer/listing-plots/:page", c.myListingPlots)
	r.GET("/blazer/plots/:page", c.getBlaserPlots)
	r.POST("/blazer/maintain-plot", c.maintainPlot)
	r.POST("/blazer/occupy/:id", c.occupyPlot)
	r.POST("/blazer/buy/:listingId", c.buyListingPlot)
	r.POST("/blazer/listing/:plotId", c.listingPlot)
	r.POST("/blazer/unlisting/:listingId", c.unlistingPlot)
	r.POST("/blazer/set-coblazer", c.setCoBlazer)
}

func (c *Controller) editPlot(ctx *gin.Context) {

	plotId, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		log.Errorf("cannot get plot id: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	memberId := ctx.GetInt("member-id")
	var vo struct {
		Banner string `json:"banner"`
	}
	if err := ctx.ShouldBind(&vo); err != nil {
		log.Errorf("cannot parse data: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	if !c.service.checkPlotOwner(uint(plotId), uint(memberId)) {
		utils.SendFailureResponse(ctx, 500, "message.common.privilege-error")
		return
	}
	var plot Plot
	plot.ID = uint(plotId)
	if err := c.service.Db.Model(&plot).Update("banner", vo.Banner).Error; err != nil {
		log.Errorf("update banner failed: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.plot.plot-save-error")
		return
	}
	utils.SendSuccessMsgResponse(ctx, "message.plot.plot-updated", nil)
}

func (c *Controller) maintainPlot(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	data := &struct {
		PlotID     uint    `form:"id" json:"id"`
		EnergyCost float64 `form:"energy" json:"energy"`
	}{}
	if err := ctx.ShouldBind(data); err != nil {
		log.Errorf("cannot get data: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	if data.PlotID == 0 || data.EnergyCost <= 0 {
		log.Errorf("invalid parameters")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	var realCost float64
	if t, err := c.service.MaintainPlot(data.PlotID, uint(memberId), data.EnergyCost); err != nil {
		utils.SendFailureResponse(ctx, 500, err.Error())
		return
	} else {
		realCost = t
	}
	var plot Plot
	if err := c.Crud.GetModelByID(&plot, data.PlotID); err != nil {
		log.Errorf("invalid parameters")
	}

	utils.SendSuccessMsgResponse(ctx, "message.plot.maintain.plot-maintain-successfully", gin.H{"durability": plot.Health, "cost": realCost})
}

func (c *Controller) listingPlotList2ListingPlotVoList(d interface{}) interface{} {

	plots := *d.(*[]ListingPlot)
	vo := make([]*ListingPlotVO, len(plots))
	for i, _ := range plots {
		vo[i] = c.listingPlot2ListingPlotVo(&plots[i]).(*ListingPlotVO)
	}
	return &vo
}

func (c *Controller) getBlaserPlots(ctx *gin.Context) {
	memberId := ctx.GetInt("member-id")
	c.PageFull(ctx, &[]Plot{}, &[]PlotListItemVO{}, &Plot{}, []string{"Listing"}, nil, c.plotList2PlotVoList, "rosen_plots.id desc", "(rosen_plots.blazer_id = ? or rosen_plots.co_blazer_id = ?) and visible > 0", memberId, memberId)
}

func (c *Controller) listingPlot2ListingPlotVo(d interface{}) interface{} {
	var vo ListingPlotVO
	plot := d.(*ListingPlot)
	vo.ID = plot.ID
	vo.Price = plot.Price
	vo.StartSellAt = plot.StartSellAt
	u, _ := c.OssController.PresignedOssDownloadURL(plot.Plot.Logo)
	plot.Plot.Logo = u.String()
	u, _ = c.OssController.PresignedOssDownloadURL(plot.Plot.Cover)
	plot.Plot.Cover = u.String()
	if plot.Plot.Blazer != nil && len(plot.Plot.Blazer.Member.Avatar) > 0 {
		u, _ = c.OssController.PresignedOssDownloadURLWithoutPrefix(plot.Plot.Blazer.Member.Avatar)
		if u != nil {
			plot.Plot.Blazer.Member.Avatar = u.String()
		}
	}
	if plot.Plot.CoBlazer != nil && len(plot.Plot.CoBlazer.Member.Avatar) > 0 {
		u, _ = c.OssController.PresignedOssDownloadURLWithoutPrefix(plot.Plot.CoBlazer.Member.Avatar)
		if u != nil {
			plot.Plot.CoBlazer.Member.Avatar = u.String()
		}
	}
	vo.Plot = plot2PlotListItemVO(plot.Plot).(*PlotListItemVO)
	return &vo
}

func (c *Controller) plotList2PlotVoList(d interface{}) interface{} {
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

	return plotList2PlotVoList(plots)
}

func (c *Controller) plot2PlotVO(d interface{}) interface{} {
	plot := d.(*Plot)
	u, _ := c.OssController.PresignedOssDownloadURL(plot.Logo)
	plot.Logo = u.String()
	u, _ = c.OssController.PresignedOssDownloadURL(plot.Cover)
	plot.Cover = u.String()
	if plot.Blazer != nil {
		u, _ = c.OssController.PresignedOssDownloadURLWithoutPrefix(plot.Blazer.Member.Avatar)
		plot.Blazer.Member.Avatar = u.String()
	}
	if plot.CoBlazer != nil {
		u, _ = c.OssController.PresignedOssDownloadURLWithoutPrefix(plot.CoBlazer.Member.Avatar)
		plot.CoBlazer.Member.Avatar = u.String()
	}
	return plot2PlotVO(plot)
}

func (c *Controller) occupyPlot(ctx *gin.Context) {
	// 全新空地只需要给rosen就能占领
	// 二手空地需要有在此地块mint记录才能花rosen占领
	memberId := ctx.GetInt("member-id")
	plotId, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		log.Errorf("cannot convert plot id: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	if err := c.service.OccupyPlot(uint(plotId), uint(memberId)); err != nil {

		log.Errorf("cannot cccupy plot: %v", err)
		utils.SendFailureResponse(ctx, 501, err.Error())
		return
	}

	utils.SendSuccessMsgResponse(ctx, "message.plot.occupy.plot-occupy-successfully", nil)
}

func (c *Controller) getRosenMemberInfo(ctx *gin.Context) {
	memberId := ctx.GetInt("member-id")
	var extra MemberExtra
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || id < 1 {
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	if err := c.Crud.FindPreloadModelWhere(&extra, []string{"CurrentEquip", "Member"}, "member_id = ?", id); err != nil {
		log.Errorf("cannot get member by token: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}

	var sns member.SnsSummary
	if err := c.Crud.FindModelWhere(&sns, "member_id = ?", extra.MemberID); err != nil {
		log.Errorf("cannot get member by token: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-info-not-found")
		return
	}

	var vo struct {
		MemberFullVO
		Follower  bool `json:"follower"`
		Following bool `json:"following"`
	}
	tvo := c.composeRosenMemberFullVO(&extra, &sns, nil, nil)
	tvo.UserName = "***"
	tvo.Email = "***"
	copier.Copy(&vo, tvo)

	me := &member.Member{}
	me.ID = uint(memberId)
	if c.Crud.Db.Model(me).Where("following_id = ?", id).Association("Followings").Count() > 0 {
		vo.Following = true
	} else {
		vo.Following = false
	}

	me = &member.Member{}
	me.ID = uint(memberId)
	if c.Crud.Db.Model(me).Where("follower_id = ?", id).Association("Followers").Count() > 0 {
		vo.Follower = true
	} else {
		vo.Follower = false
	}

	utils.SendSuccessResponse(ctx, vo)
}

func (c *Controller) getRosenMemberPlots(ctx *gin.Context) {
	memberId, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || memberId < 1 {
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	c.ListAll(ctx, &[]Plot{}, &[]PlotListItemVO{}, &Plot{}, []string{"Blazer", "Blazer.Member", "CoBlazer", "CoBlazer.Member"}, nil, c.plotList2PlotVoList, "id desc", "(blazer_id = ? or co_blazer_id = ?) and visible > 0", memberId, memberId)
}

func (c *Controller) getRosenMemberGalleries(ctx *gin.Context) {
	memberId, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || memberId < 1 {
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	c.ListAll(ctx, &[]Asset{}, &[]AssetVO{}, &Asset{}, nil, nil, c.assetList2AssetVoList, "id desc", "type = 0 and owner_id = ?", memberId)
}

func (c *Controller) parseGisSearch(ctx *gin.Context) (string, []interface{}, error) {

	var lat, lng, radius float64
	var err error
	if lat, err = strconv.ParseFloat(ctx.Query("lat"), 64); err != nil {
		log.Errorf("invalid param lat: %v", err)
		return "", nil, err
	}
	if lng, err = strconv.ParseFloat(ctx.Query("lng"), 64); err != nil {
		log.Errorf("invalid param lng: %v", err)
		return "", nil, err
	}
	if radius, err = strconv.ParseFloat(ctx.Query("radius"), 64); err != nil {
		log.Errorf("invalid param radius: %v", err)
		return "", nil, err
	}

	var latFrom, latTo, lngFrom, lngTo float64
	latFrom = lat - radius/11.132*0.01
	latTo = lat + radius/11.132*0.01
	lngFrom = lng - radius/10.0*0.01
	lngTo = lng + radius/10.0*0.01
	whereClause := "latitude >= ? and latitude <= ?"
	params := []interface{}{latFrom, latTo}

	if lngFrom < -180.0 {
		t0 := -180.0
		t2 := 180.0
		t1 := lngFrom
		for t1 < -180.0 {
			t1 += 360.0
		}

		if lngTo > 180.0 {
			// 查找全部精度范围
		} else {
			whereClause += " and ((longitude >= ? and longitude <= ?) or (longitude >= ? and longitude <= ?))"
			params = append(params, t0, lngTo, t1, t2)
		}
	} else {

		if lngTo > 180.0 {
			t0 := -180.0
			t2 := 180.0
			t1 := lngTo
			for t1 > 180.0 {
				t1 -= 360.0
			}
			whereClause += " and ((longitude >= ? and longitude <= ?) or (longitude >= ? and longitude <= ?))"
			params = append(params, t0, lngTo, t1, t2)

		} else {
			whereClause += " and longitude >= ? and longitude <= ?"
			params = append(params, lngFrom, lngTo)
		}
	}
	return whereClause, params, nil
}

func (c *Controller) listingPlot(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	plotId, _ := strconv.Atoi(ctx.Param("plotId"))
	if plotId <= 0 {
		log.Errorf("invalid plot id")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	var param struct {
		Price    int64  `json:"price"`
		Currency string `json:"currency"`
	}
	if err := ctx.ShouldBind(&param); err != nil {
		log.Errorf("cannot bind parameters: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	if err := c.service.ListingPlot(uint(plotId), uint(memberId), param.Price); err != nil {
		log.Errorf("cannot listing plot: %v", err)
		utils.SendFailureResponse(ctx, 501, err.Error())
		return
	}

	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) unlistingPlot(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	listingId, _ := strconv.Atoi(ctx.Param("listingId"))
	if listingId <= 0 {
		log.Errorf("invalid listing id")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	var listing ListingPlot
	if err := c.Crud.GetPreloadModelByID(&listing, uint(listingId), []string{"Plot"}); err != nil {
		utils.SendFailureResponse(ctx, 500, "message.market.listing-not-found")
		return
	}
	if uint(memberId) != listing.BlazerID || memberId != int(listing.Plot.BlazerID) {
		utils.SendFailureResponse(ctx, 500, "message.common.privilege-error")
		return
	}
	if listing.SuccessorID != 0 {
		utils.SendFailureResponse(ctx, 501, "message.market.listing-already-taken")
		return
	}
	if err := c.Crud.DeleteModel(&listing); err != nil {
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) listingPlots(ctx *gin.Context) {

	c.PageFull(ctx, &[]ListingPlot{}, &[]ListingPlotVO{}, &ListingPlot{}, []string{"Plot", "Plot.Blazer", "Plot.Blazer.Member", "Plot.CoBlazer", "Plot.CoBlazer.Member"}, nil, c.listingPlotList2ListingPlotVoList, "start_sell_at asc", "(successor_id is NULL or successor_id = 0)")
}

func (c *Controller) myListingPlots(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	c.PageFull(ctx, &[]ListingPlot{}, &[]ListingPlotVO{}, &ListingPlot{}, []string{"Plot", "Plot.Blazer", "Plot.Blazer.Member", "Plot.CoBlazer", "Plot.CoBlazer.Member"}, nil, c.listingPlotList2ListingPlotVoList, "start_sell_at asc", "(successor_id is NULL or successor_id = 0) and blazer_id = ?", memberId)
}

func (c *Controller) buyListingPlot(ctx *gin.Context) {

	/*
	 1、经营权交易，平台收取15%-20%的费用，其余归原Blazer；
	 2、想要通过用户间交易，获得经营权的用户，需要有对应plot的mint记录，1次即可；
	*/
	memberId := ctx.GetInt("member-id")
	listingId, _ := strconv.Atoi(ctx.Param("listingId"))
	if listingId <= 0 {
		log.Errorf("invalid listing id")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	var listing ListingPlot
	if err := c.Crud.GetPreloadModelByID(&listing, uint(listingId), []string{"Plot"}); err != nil {
		log.Errorf("cannot get listing: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.market.listing-not-found")
		return
	}
	if time.Now().Unix() < listing.StartSellAt {
		log.Errorf("selling not started")
		utils.SendFailureResponse(ctx, 501, "message.common.not-start")
		return
	}
	if listing.SuccessorID > 0 {
		log.Errorf("listing is sold")
		utils.SendFailureResponse(ctx, 501, "message.market.listing-already-taken")
		return
	}
	if uint(memberId) == listing.BlazerID || memberId == int(listing.Plot.BlazerID) {
		log.Errorf("member is not the owner of the plot")
		utils.SendFailureResponse(ctx, 501, "message.market.listing-not-found")
		return
	}
	if income, err := c.service.TransferPlot(&listing, uint(memberId)); err != nil {
		log.Errorf("cannot transfer: %v", err)
		utils.SendFailureResponse(ctx, 501, err.Error())
		return
	} else {
		c.SendMessage(listing.BlazerID, "info-plot-sold", "en_US", listing.Plot.Name, income)
	}

	utils.SendSuccessMsgResponse(ctx, "message.market.listing-bought", nil)
}

func (c *Controller) setCoBlazer(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	params := struct {
		PlotId     uint `json:"plotId"`
		CoBlazerId uint `json:"coblazerId"`
	}{}

	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot parse params: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	if err := c.service.SetCoblazer(uint(memberId), params.PlotId, params.CoBlazerId); err != nil {
		log.Errorf("cannot set co-blazer: %v", err)
		utils.SendFailureResponse(ctx, 500, err.Error())
		return
	}

	utils.SendSimpleSuccessResponse(ctx)
}
