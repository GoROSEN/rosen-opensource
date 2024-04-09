package rosen

import (
	"github.com/GoROSEN/rosen-apiserver/business/mall"
	"github.com/GoROSEN/rosen-apiserver/core/common"
	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/GoROSEN/rosen-apiserver/features/account"
	"github.com/GoROSEN/rosen-apiserver/features/member"
	"github.com/GoROSEN/rosen-apiserver/features/message"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v7"
	"github.com/google/martian/log"
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
	c.setupOpenGameController(open)

	// 会员接口
	mb := r.Group("/api/rosen/member")
	mb.Use(member.MemberFilter)
	c.setupMemberController(mb)
	c.setupAssetController(mb)

	alpha := r.Group("/api/rosen/alpha")
	alpha.Use(member.MemberFilter)
	c.setupMemberAlphaController(alpha)

	chat := r.Group("/api/rosen/chat")
	chat.Use(member.MemberFilter)
	c.setupChatAlphaController(chat)

	// 游戏接口
	game := r.Group("/api/rosen/game")
	game.Use(member.MemberFilter)
	c.setupGameController(game)

	// 管理接口
	admin := r.Group("/api/rosen/admin")
	admin.Use(common.AdminFilter)
	c.setupAdminController(admin)

	// 定时任务
	SetupCronJobs(c.service)

	config := config.GetConfig()
	if config.Rpc.Enable {
		log.Infof("initializing rpc server...")
		c.service.StartRpcServer()
		c.service.StartRpcClient()
	}

	return c
}
