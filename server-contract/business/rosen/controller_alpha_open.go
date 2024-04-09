package rosen

import (
	"sort"
	"strconv"
	"time"

	"github.com/GoROSEN/rosen-apiserver/core/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
	"gorm.io/gorm"
)

// setupOpenAlphaController 初始化控制器
func (c *Controller) setupOpenAlphaController(r *gin.RouterGroup) {

	r.GET("/alpha/plots/recommend", c.recommendPlots)
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
	r.GET("/alpha/ranking/game-challenges", c.getGameChallengerRankingBoard)
	r.GET("/alpha/ranking/cities", c.getCitiesRankingBoard)
	r.GET("/alpha/custom-service/info", c.getCustomServiceInfo)
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

func (c *Controller) recommendPlots(ctx *gin.Context) {

	count := utils.GetQueryInt(ctx, "count", 5)
	style := ctx.Query("style")
	whereClause := "visible > 0"
	params := make([]interface{}, 0)
	if len(style) > 0 {
		whereClause += " and style = ?"
		s, _ := strconv.Atoi(style)
		params = append(params, s)
	}
	sort := "rand()"
	c.ListTop(ctx, count, &[]Plot{}, &[]PlotListItemVO{}, &Plot{}, []string{"Blazer", "Blazer.CurrentEquip", "Blazer.Member", "CoBlazer", "CoBlazer.Member", "Listing"}, nil, c.plotList2PlotVoList, sort, whereClause, params...)
}

func (c *Controller) searchPlots(ctx *gin.Context) {
	c.searchPlotsBase(ctx, false)
}

func (c *Controller) searchPlotsPaged(ctx *gin.Context) {
	c.searchPlotsBase(ctx, true)
}

func (c *Controller) searchPlotsBase(ctx *gin.Context, paged bool) {

	nogis := ctx.Query("nogis")
	var whereClause string
	var params []interface{}

	if len(nogis) == 0 {
		var err error
		whereClause, params, err = c.parseGisSearch(ctx)

		if err != nil {
			utils.SendFailureResponse(ctx, 400, "message.common.system-error")
			return
		}
	}

	keyword := ctx.Query("keyword")
	continent := ctx.Query("continent")
	vacant := ctx.Query("vacant")
	sort := ctx.Query("sort")
	style := ctx.Query("style")

	if len(whereClause) > 0 {
		whereClause += " and visible > 0"
	} else {
		whereClause += " visible > 0"
	}

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

	if len(style) > 0 {
		whereClause += " and style = ?"
		s, _ := strconv.Atoi(style)
		params = append(params, s)
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

	// 默认只显示共享位置的人
	showall := ctx.Query("all")
	if len(showall) == 0 || showall != "true" {
		whereClause += " and Extra.share_location = ?"
		params = append(params, true)
	}

	if paged {
		c.PageFull(ctx, &[]MemberPosition{}, &[]ProducerVO{}, &MemberPosition{}, []string{"Extra", "Extra.CurrentEquip"}, []string{"Extra", "Member"}, c.memberPositionList2ProducerList, "timestamp desc", whereClause, params...)
	} else {
		c.ListAll(ctx, &[]MemberPosition{}, &[]ProducerVO{}, &MemberPosition{}, []string{"Extra", "Extra.CurrentEquip"}, []string{"Extra", "Member"}, c.memberPositionList2ProducerList, "timestamp desc", whereClause, params...)
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
			log.Errorf("cannot get %v blazer ranking: %v", t, err)
			return
		}
	} else if t == "month" {
		if err := c.Crud.Db.Raw("select t0.blazer_id as id, t1.avatar, t1.display_name,count(*) cnt from rosen_mint_logs t0 left join member_users t1 on t0.blazer_id = t1.id where t0.blazer_id not in (6,3) and DATE_FORMAT( t0.created_at, '%Y%m' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m' ) group by blazer_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			log.Errorf("cannot get %v blazer ranking: %v", t, err)
			return
		}
	} else {
		if err := c.Crud.Db.Raw("select t0.blazer_id as id, t1.avatar, t1.display_name,count(*) cnt from rosen_mint_logs t0 left join member_users t1 on t0.blazer_id = t1.id where t0.blazer_id not in (6,3) group by blazer_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			log.Errorf("cannot get %v blazer ranking: %v", t, err)
			return
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
		if err := c.Crud.Db.Raw("select t0.producer_id as id,t1.avatar, t1.display_name,count(*) cnt from rosen_mint_logs t0 left join member_users t1 on t0.producer_id = t1.id where t0.success=1 and DATE_FORMAT( t0.created_at, '%Y%m%d' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m%d' ) group by producer_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			log.Errorf("cannot get %v producer ranking: %v", t, err)
			return
		}
	} else if t == "month" {
		if err := c.Crud.Db.Raw("select t0.producer_id as id,t1.avatar, t1.display_name,count(*) cnt from rosen_mint_logs t0 left join member_users t1 on t0.producer_id = t1.id where t0.success=1 and DATE_FORMAT( t0.created_at, '%Y%m' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m' ) group by producer_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			log.Errorf("cannot get %v producer ranking: %v", t, err)
			return
		}
	} else {
		if err := c.Crud.Db.Raw("select t0.producer_id as id,t1.avatar, t1.display_name,count(*) cnt from rosen_mint_logs t0 left join member_users t1 on t0.producer_id = t1.id where t0.success=1 group by producer_id order by cnt desc limit 30").Scan(&results).Error; err != nil {
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			log.Errorf("cannot get %v producer ranking: %v", t, err)
			return
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
			log.Errorf("cannot get %v m2e ranking: %v", t, err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
	} else if t == "month" {
		if err := c.Crud.Db.Raw("select t0.member_id as id,t1.avatar, t1.display_name,floor(sum(earned)/100) cnt from rosen_mte_sessions t0 left join member_users t1 on t0.member_id = t1.id where DATE_FORMAT( t0.created_at, '%Y%m' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m' ) group by member_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			log.Errorf("cannot get %v m2e ranking: %v", t, err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
	} else {
		if err := c.Crud.Db.Raw("select t0.member_id as id,t1.avatar, t1.display_name,floor(sum(earned)/100) cnt from rosen_mte_sessions t0 left join member_users t1 on t0.member_id = t1.id group by member_id  order by cnt desc limit 30").Scan(&results).Error; err != nil {
			log.Errorf("cannot get %v m2e ranking: %v", t, err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
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

func (c *Controller) getGameChallengerRankingBoard(ctx *gin.Context) {

	t := ctx.Query("type")
	var results []struct {
		ID             int    `json:"id"`
		Avatar         string `json:"avatar"` // 头像
		DisplayName    string `json:"displayName"`
		ChallengeTimes int    `json:"challengeTimes"`
	}

	if t == "day" {
		if err := c.Crud.Db.Raw("select t0.host_id as id,t1.avatar, t1.display_name,count(1) as challenge_times from rosen_game_sessions t0 left join member_users t1 on t0.host_id = t1.id where t0.status=2 and DATE_FORMAT( t0.created_at, '%Y%m%d' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m%d' ) group by host_id  order by challenge_times desc limit 30").Scan(&results).Error; err != nil {
			log.Errorf("cannot get %v game challenger ranking: %v", t, err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
	} else if t == "month" {
		if err := c.Crud.Db.Raw("select t0.host_id as id,t1.avatar, t1.display_name,count(1) as challenge_times from rosen_game_sessions t0 left join member_users t1 on t0.host_id = t1.id where t0.status=2 and DATE_FORMAT( t0.created_at, '%Y%m' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m' ) group by host_id  order by challenge_times desc limit 30").Scan(&results).Error; err != nil {
			log.Errorf("cannot get %v challenger ranking: %v", t, err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
	} else {
		if err := c.Crud.Db.Raw("select t0.host_id as id,t1.avatar, t1.display_name,count(1) as challenge_times from rosen_game_sessions t0 left join member_users t1 on t0.host_id = t1.id where t0.status=2 group by host_id order by challenge_times desc limit 30").Scan(&results).Error; err != nil {
			log.Errorf("cannot get %v challenger ranking: %v", t, err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
	}
	log.Infof("%v", results)
	for i := range results {
		if avatarURL, err := c.OssController.PresignedOssDownloadURLWithoutPrefix(results[i].Avatar); err != nil {
			log.Errorf("cannot get oss url: %v", err)
		} else {
			results[i].Avatar = avatarURL.String()
		}
	}
	utils.SendSuccessResponse(ctx, results)
}

func (c *Controller) getCitiesRankingBoard(ctx *gin.Context) {

	type _ResultItem struct {
		ID            int       `json:"id"`
		Avatar        string    `json:"avatar"` // 头像
		DisplayName   string    `json:"displayName"`
		City          string    `json:"city"`
		PlotName      string    `json:"plot"`
		PlotLogo      string    `json:"plotLogo"`
		MintCount     int64     `json:"mintCount"`
		Rank          int       `json:"rank"`
		CreatedAt     time.Time `json:"-"`
		ExpiredAt     time.Time `json:"-"`
		PlotID        uint      `json:"plotId"`
		BlazerID      uint      `json:"blazerId"`
		PlotLatitude  float64   `json:"plotLat"`
		PlotLongitude float64   `json:"plotLng"`
	}
	t := ctx.Query("type")
	var results []_ResultItem

	if err := c.Crud.Db.Raw(`select t0.created_at, t0.expired_at, t0.id, t3.avatar, t3.id as blazer_id, t1.id as plot_id, t1.longitude as plot_longitude, t1.latitude as plot_latitude, t3.display_name, t0.city,t1.name as plot_name, t1.logo as plot_logo
	from rosen_cities_ranks t0 
	left join rosen_plots t1 on t0.plot_id = t1.id
	left join rosen_member_extras t2 on t0.blazer_id = t2.member_id
	left join member_users t3 on t0.blazer_id = t3.id
	where t0.deleted_at is null
	order by mint_count desc`).Scan(&results).Error; err != nil {
		log.Errorf("cannot get %v m2e ranking: %v", t, err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	// 挨个获取自统计时间起的mint数量
	if t == "day" {
		for i := range results {
			r := &results[i]
			if err := c.Crud.Db.Model(&MintLog{}).Where("plot_id = ? and success = 1 and created_at >= ? and created_at <= ? and DATE_FORMAT(created_at, '%Y%m%d' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m%d' )", r.PlotID, r.CreatedAt, r.ExpiredAt).Count(&r.MintCount).Error; err != nil {
				log.Errorf("cannot get mint count for plot %v : %v", r.PlotID, err)
				r.MintCount = 0
			}
		}
	} else if t == "month" {
		for i := range results {
			r := &results[i]
			if err := c.Crud.Db.Model(&MintLog{}).Where("plot_id = ? and success = 1 and created_at >= ? and created_at <= ? and DATE_FORMAT(created_at, '%Y%m' ) = DATE_FORMAT( UTC_DATE( ) , '%Y%m' )", r.PlotID, r.CreatedAt, r.ExpiredAt).Count(&r.MintCount).Error; err != nil {
				log.Errorf("cannot get mint count for plot %v : %v", r.PlotID, err)
				r.MintCount = 0
			}
		}
	} else {
		for i := range results {
			r := &results[i]
			if err := c.Crud.Db.Model(&MintLog{}).Where("plot_id = ? and success = 1 and created_at >= ? and created_at <= ?", r.PlotID, r.CreatedAt, r.ExpiredAt).Count(&r.MintCount).Error; err != nil {
				log.Errorf("cannot get mint count for plot %v : %v", r.PlotID, err)
				r.MintCount = 0
			}
		}
	}

	// 排个序
	sort.Slice(results, func(i, j int) bool {
		return results[i].MintCount > results[j].MintCount
	})

	for i := range results {
		results[i].Rank = i + 1
		if avatarURL, err := c.OssController.PresignedOssDownloadURLWithoutPrefix(results[i].Avatar); err != nil {
			log.Errorf("cannot get oss url: %v", err)
		} else {
			results[i].Avatar = avatarURL.String()
		}
		if logoURL, err := c.OssController.PresignedOssDownloadURL(results[i].PlotLogo); err != nil {
			log.Errorf("cannot get oss url: %v", err)
		} else {
			results[i].PlotLogo = logoURL.String()
		}
	}
	utils.SendSuccessResponse(ctx, results)
}

func (c *Controller) getCustomServiceInfo(ctx *gin.Context) {
	var extra MemberExtra
	id := c.service.sysconfig.CustomServiceMemberId
	if id < 1 {
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	if err := c.Crud.FindPreloadModelWhere(&extra, []string{"CurrentEquip", "Member"}, "member_id = ?", id); err != nil {
		log.Errorf("cannot get member by token: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}

	var vo struct {
		MemberFullVO
	}
	tvo := c.composeRosenMemberFullVO(&extra, nil, nil, nil, nil)
	tvo.UserName = "***"
	if len(tvo.Email) > 5 {
		tvo.Email = tvo.Email[0:1] + "***" + tvo.Email[len(tvo.Email)-4:len(tvo.Email)]
	} else {
		tvo.Email = "***"
	}
	copier.Copy(&vo, tvo)

	utils.SendSuccessResponse(ctx, vo)
}
