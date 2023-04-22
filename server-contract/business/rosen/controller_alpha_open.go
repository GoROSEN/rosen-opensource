package rosen

import (
	"strconv"

	"github.com/GoROSEN/rosen-opensource/server-contract/core/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/martian/log"
	"gorm.io/gorm"
)

// setupOpenAlphaController 初始化控制器
func (c *Controller) setupOpenAlphaController(r *gin.RouterGroup) {

	r.GET("/alpha/plots/search", c.searchPlots)
	r.GET("/alpha/plots/psearch/:page", c.searchPlotsPaged)
	r.GET("/alpha/plot/:id", c.plotDetail)
	r.GET("/alpha/producers/search", c.searchProducers)
	r.GET("/alpha/producers/psearch/:page", c.searchProducersPaged)
	// r.GET("/alpha/producer/:id", c.getRosenMemberInfo)
	r.GET("/alpha/ranking/plots", c.getPlotsRankingBoard)
	r.GET("/alpha/ranking/blazers", c.getBlazerRankingBoard)
	r.GET("/alpha/ranking/producers", c.getProducerRankingBoard)
	r.GET("/alpha/ranking/m2e", c.getMove2EarnRankingBoard)
}

func (c *Controller) plotDetail(ctx *gin.Context) {
	var plot Plot
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || id < 1 {
		utils.SendFailureResponse(ctx, 500, "message.plot.invalid-plot-id")
		return
	}
	if err := c.Crud.GetPreloadModelByID(&plot, uint(id), []string{"Blazer", "Blazer.CurrentEquip", "Blazer.Member", "CoBlazer", "CoBlazer.Member", "Listing"}); err != nil {
		log.Errorf("cannot get plot: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.plot.plot-not-found")
		return
	}
	if err := c.Crud.Db.Model(&plot).Update("access_count", gorm.Expr("access_count + 1")).Error; err != nil {
		log.Errorf("cannot update access count: %v", err)
	}
	vo := c.plot2PlotVO(&plot)
	utils.SendSuccessResponse(ctx, vo)
}

func (c *Controller) searchPlots(ctx *gin.Context) {
	c.searchPlotsBase(ctx, false)
}

func (c *Controller) searchPlotsPaged(ctx *gin.Context) {
	c.searchPlotsBase(ctx, true)
}

func (c *Controller) searchPlotsBase(ctx *gin.Context, paged bool) {

	whereClause, params, err := c.parseGisSearch(ctx)

	if err != nil {
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	keyword := ctx.Query("keyword")
	continent := ctx.Query("continent")
	vacant := ctx.Query("vacant")
	sort := ctx.Query("sort")

	if len(vacant) > 0 {
		if vacant == "1" {
			whereClause += " and rosen_plots.blazer_id is null"
		} else if vacant == "0" {
			whereClause += " and rosen_plots.blazer_id is not null"
		}
	}

	if len(keyword) > 0 {
		whereClause += " and tags like ?"
		s := "%" + keyword + "%"
		params = append(params, s)
	}

	if len(continent) > 0 {
		whereClause += " and continent = ?"
		params = append(params, continent)
	}

	if len(whereClause) > 0 {
		whereClause += " and visible > 0"
	} else {
		whereClause += " visible > 0"
	}

	if len(sort) > 1 {
		if sort[0] == '-' {
			sort = "rosen_plots." + sort[1:] + " desc"
		} else {
			sort = "rosen_plots." + sort + " asc"
		}
	} else {
		sort = "rosen_plots.id desc"
	}

	if paged {
		c.PageFull(ctx, &[]Plot{}, &[]PlotListItemVO{}, &Plot{}, []string{"Blazer", "Blazer.CurrentEquip", "Blazer.Member", "CoBlazer", "CoBlazer.Member", "Listing"}, nil, c.plotList2PlotVoList, sort, whereClause, params...)
	} else {
		c.ListAll(ctx, &[]Plot{}, &[]PlotListItemVO{}, &Plot{}, []string{"Blazer", "Blazer.CurrentEquip", "Blazer.Member", "CoBlazer", "CoBlazer.Member", "Listing"}, nil, c.plotList2PlotVoList, sort, whereClause, params...)
	}
}

func (c *Controller) searchProducers(ctx *gin.Context) {
	c.searchProducersBase(ctx, false)
}

func (c *Controller) searchProducersPaged(ctx *gin.Context) {
	c.searchProducersBase(ctx, true)
}

func (c *Controller) searchProducersBase(ctx *gin.Context, paged bool) {

	whereClause, params, err := c.parseGisSearch(ctx)
	if err != nil {
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	// 查找关键字
	keyword := ctx.Query("keyword")
	if len(keyword) > 0 {
		whereClause += " and Member.display_name like concat('%',?,'%')"
		params = append(params, keyword)
	}

	if paged {
		c.PageFull(ctx, &[]MemberPosition{}, &[]ProducerVO{}, &MemberPosition{}, []string{"Extra", "Extra.CurrentEquip"}, []string{"Member"}, c.memberPositionList2ProducerList, "timestamp desc", whereClause, params...)
	} else {
		c.ListAll(ctx, &[]MemberPosition{}, &[]ProducerVO{}, &MemberPosition{}, []string{"Extra", "Extra.CurrentEquip"}, []string{"Member"}, c.memberPositionList2ProducerList, "timestamp desc", whereClause, params...)
	}
}

func (c *Controller) getPlotsRankingBoard(ctx *gin.Context) {

	t := ctx.Query("type")
	sort := ""
	switch t {
	case "day":
		sort = "daily_mint_count desc,mint_count desc,monthly_mint_count,access_count desc"
	case "month":
		sort = "monthly_mint_count desc,mint_count desc,daily_mint_count,access_count desc"
	default:
		sort = "mint_count desc,monthly_mint_count desc,daily_mint_count,access_count desc"
	}
	plots := &[]Plot{}
	if _, err := c.Crud.PagedV2(plots, &Plot{}, []string{"Blazer", "Blazer.Member", "CoBlazer", "CoBlazer.Member"}, nil, sort, 0, 30, ""); err != nil {
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
	} else {
		items := c.plotList2PlotVoList(plots)
		array := items.([]*PlotListItemVO)
		for i := range array {
			array[i].Rank = uint32(i) + 1
		}
		utils.SendSuccessResponse(ctx, items)
	}
}

func (c *Controller) getBlazerRankingBoard(ctx *gin.Context) {

	t := ctx.Query("type")
	var results []struct {
		ID          int    `json:"id"`
		Avatar      string `json:"avatar"` // 头像
		DisplayName string `json:"displayName"`
		Cnt         int    `json:"mintCount"`
	}

	if t == "day" {
		if err := c.Crud.Db.Raw("select t0.blazer_id as id, t1.avatar, t1.display_name,count(*) cnt from rosen_mint_logs t0 left join member_users t1 on t0.blazer_id = t1.id where t0.blazer_id not in (6,3) and DATE_FORMAT( t0.created_at, '%Y%m%d' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m%d' ) group by blazer_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		}
	} else if t == "month" {
		if err := c.Crud.Db.Raw("select t0.blazer_id as id, t1.avatar, t1.display_name,count(*) cnt from rosen_mint_logs t0 left join member_users t1 on t0.blazer_id = t1.id where t0.blazer_id not in (6,3) and DATE_FORMAT( t0.created_at, '%Y%m' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m' ) group by blazer_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		}
	} else {
		if err := c.Crud.Db.Raw("select t0.blazer_id as id, t1.avatar, t1.display_name,count(*) cnt from rosen_mint_logs t0 left join member_users t1 on t0.blazer_id = t1.id where t0.blazer_id not in (6,3) group by blazer_id  order by cnt desc limit 30", 1).Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		}
	}
	for i := range results {
		if avatarURL, err := c.OssController.PresignedOssDownloadURLWithoutPrefix(results[i].Avatar); err != nil {
			log.Errorf("cannot get oss url: %v", err)
		} else {
			results[i].Avatar = avatarURL.String()
		}
	}

	utils.SendSuccessResponse(ctx, results)
}

func (c *Controller) getProducerRankingBoard(ctx *gin.Context) {

	t := ctx.Query("type")
	var results []struct {
		ID          int    `json:"id"`
		Avatar      string `json:"avatar"` // 头像
		DisplayName string `json:"displayName"`
		Cnt         int    `json:"mintCount"`
	}

	if t == "day" {
		if err := c.Crud.Db.Raw("select t0.producer_id as id,t1.avatar, t1.display_name,count(*) cnt from rosen_mint_logs t0 left join member_users t1 on t0.producer_id = t1.id where DATE_FORMAT( t0.created_at, '%Y%m%d' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m%d' ) group by producer_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		}
	} else if t == "month" {
		if err := c.Crud.Db.Raw("select t0.producer_id as id,t1.avatar, t1.display_name,count(*) cnt from rosen_mint_logs t0 left join member_users t1 on t0.producer_id = t1.id where DATE_FORMAT( t0.created_at, '%Y%m' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m' ) group by producer_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		}
	} else {
		if err := c.Crud.Db.Raw("select t0.producer_id as id,t1.avatar, t1.display_name,count(*) cnt from rosen_mint_logs t0 left join member_users t1 on t0.producer_id = t1.id group by producer_id  order by cnt desc limit 30", 1).Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		}
	}
	for i := range results {
		if avatarURL, err := c.OssController.PresignedOssDownloadURLWithoutPrefix(results[i].Avatar); err != nil {
			log.Errorf("cannot get oss url: %v", err)
		} else {
			results[i].Avatar = avatarURL.String()
		}
	}
	utils.SendSuccessResponse(ctx, results)
}

func (c *Controller) getMove2EarnRankingBoard(ctx *gin.Context) {
	t := ctx.Query("type")
	var results []struct {
		ID          int    `json:"id"`
		Avatar      string `json:"avatar"` // 头像
		DisplayName string `json:"displayName"`
		Cnt         int    `json:"earned"`
	}

	if t == "day" {
		if err := c.Crud.Db.Raw("select t0.member_id as id,t1.avatar, t1.display_name,floor(sum(earned)/100) cnt from rosen_mte_sessions t0 left join member_users t1 on t0.member_id = t1.id where DATE_FORMAT( t0.created_at, '%Y%m%d' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m%d' ) group by member_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		}
	} else if t == "month" {
		if err := c.Crud.Db.Raw("select t0.member_id as id,t1.avatar, t1.display_name,floor(sum(earned)/100) cnt from rosen_mte_sessions t0 left join member_users t1 on t0.member_id = t1.id where DATE_FORMAT( t0.created_at, '%Y%m' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m' ) group by member_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		}
	} else {
		if err := c.Crud.Db.Raw("select t0.member_id as id,t1.avatar, t1.display_name,floor(sum(earned)/100) cnt from rosen_mte_sessions t0 left join member_users t1 on t0.member_id = t1.id group by member_id  order by cnt desc limit 30", 1).Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		}
	}
	for i := range results {
		if avatarURL, err := c.OssController.PresignedOssDownloadURLWithoutPrefix(results[i].Avatar); err != nil {
			log.Errorf("cannot get oss url: %v", err)
		} else {
			results[i].Avatar = avatarURL.String()
		}
	}
	utils.SendSuccessResponse(ctx, results)
}
