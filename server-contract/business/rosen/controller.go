package rosen

import (
	"github.com/GoROSEN/rosen-opensource/server-contract/business/mall"
	"github.com/GoROSEN/rosen-opensource/server-contract/core/common"
	"github.com/GoROSEN/rosen-opensource/server-contract/features/account"
	"github.com/GoROSEN/rosen-opensource/server-contract/features/member"
	"github.com/GoROSEN/rosen-opensource/server-contract/features/message"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v7"
	"github.com/oschwald/geoip2-golang"
	"gorm.io/gorm"
)

// Controller 控制器
type Controller struct {
	common.CrudController
	common.OssController
	message.MsgMod

	service        *Service
	memberService  *member.Service
	accountService *account.AccountService
	mallService    *mall.Service
}

// NewController 初始化控制器
func NewController(r *gin.Engine, db *gorm.DB, rds *redis.Client, geoip *geoip2.Reader) *Controller {

	c := &Controller{}
	c.SetupCrud(db)
	c.SetupOSS("rosen/")
	c.SetupMsgMod(db, rds)
	c.accountService = account.NewAccountService(db)
	c.service = NewService(db, rds, c.accountService, geoip, &c.MsgMod)
	c.memberService = member.NewService(db, rds)
	c.mallService = mall.NewService(db)

	open := r.Group("/api/open/rosen")
	c.setupOpenMemberController(open)
	c.setupOpenAlphaController(open)
	c.setupCallbackController(open)

	// 会员接口
	mb := r.Group("/api/rosen/member")
	mb.Use(member.MemberFilter)
	c.setupMemberController(mb)
	c.setupAssetController(mb)

	alpha := r.Group("/api/rosen/alpha")
	alpha.Use(member.MemberFilter)
	c.setupMemberAlphaController(alpha)

	// 定时任务
	SetupCronJobs(c.service)

	return c
}
