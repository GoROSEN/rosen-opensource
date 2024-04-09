package rosen

import (
	"fmt"
	"math"
	"net"
	"net/http"
	"strings"

	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/GoROSEN/rosen-apiserver/core/utils"
	"github.com/GoROSEN/rosen-apiserver/features/member"
	"github.com/gin-gonic/gin"
	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
)

func (c *Controller) setupOpenMemberController(r *gin.RouterGroup) {
	r.POST("/member/signup", c.signUp)
	r.POST("/member/signin-tp", c.SnsSignin)
	r.GET("/member/location", c.getLocation)
}

func (c *Controller) signUp(ctx *gin.Context) {

	log.Infof("member signup")
	cfg := config.GetConfig()
	var vo member.SignUpRequestVo
	if err := ctx.ShouldBind(&vo); err != nil {
		log.Errorf("member signup error: %v", err)
		ctx.String(http.StatusBadRequest, "message.common.system-error")
		return
	}
	vo.UserName = strings.ToLower(vo.UserName)
	vo.Email = strings.ToLower(vo.Email)
	// verify if mail address is in the black list
	if cfg.BlockedMails != nil {
		for _, suffix := range cfg.BlockedMails {
			s := "@" + suffix
			log.Infof("%v vs %v", vo.Email, s)
			if strings.HasSuffix(vo.Email, s) {
				log.Errorf("member signup email %v is blocked by %v", vo.Email, s)
				ctx.String(http.StatusBadRequest, "message.common.system-error")
				return
			}
		}
	}
	// check mail addresss
	if err := c.service.FindModelWhere(&member.Member{}, "user_name = ? or email = ?", vo.UserName, vo.Email); err == nil {
		// 用户名已存在
		log.Errorf("user name %v already exist", vo.UserName)
		utils.SendFailureResponse(ctx, 501, "message.member.email-registered")
		return
	}
	if cfg.Rosen.VCode &&
		vo.VCode != "EA88E1C6-ED03-4DDE-BFAD-00705C2F8A6E" { //万能验证码
		log.Debugf("signup vo: %v", vo)
		cmd := c.service.client.Get(fmt.Sprintf("register-code:%v", vo.Email))
		if cmd.Err() != nil {
			cmd = c.service.client.Get(fmt.Sprintf("register-code:%v", vo.CellPhone))
		}
		if cmd.Err() != nil {
			log.Errorf("cannot get vcode from cache: %v")
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
		if cmd.Val() != vo.VCode {
			log.Errorf("cannot get invalid vcode: %v", cmd.Val())
			utils.SendFailureResponse(ctx, 500, "message.member.invalid-username-verifycode")
			return
		}
	} else {
		log.Infof("skipped vcode verification")
	}
	obj := &member.Member{}
	if err := copier.Copy(obj, vo); err != nil {
		log.Errorf("copy to model error: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	obj.UserName = strings.ToLower(obj.UserName)
	obj.Email = strings.ToLower(obj.Email)
	obj.Level = 1
	obj.Avatar = "member/avatars/000000.png"
	obj.DisplayName = strings.Split(obj.UserName, "@")[0]

	if len(vo.NewPwd) > 0 {
		// 加密（第二轮）并设置新密码
		obj.LoginPwd = utils.GetPass(vo.NewPwd)
	} else {
		log.Errorf("blank password")
		utils.SendFailureResponse(ctx, 501, "message.member.invalid-username-password")
		return
	}

	if err := c.service.SignUpMember(obj); err != nil {
		log.Errorf("signup member error: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	// post signup
	if err := c.postSignup(obj); err != nil {
		log.Errorf("post signup error: %v", err)
	}

	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) getLocation(ctx *gin.Context) {
	clientIP := ctx.ClientIP()
	// handle geo info
	if c, err := c.service.geo.City(net.ParseIP(clientIP)); err != nil {
		log.Errorf("quering geo info error for ip %v: %v", clientIP, err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
	} else {
		lang := config.GetConfig().Geoip.Lang
		city := c.City.Names[lang]
		country := c.Country.Names[lang]
		var province string
		if len(c.Subdivisions) > 0 {
			province = c.Subdivisions[0].Names[lang]
		}
		latitude := c.Location.Latitude
		longitude := c.Location.Longitude

		utils.SendSuccessResponse(ctx, gin.H{"ip": clientIP, "city": city, "country": country, "province": province, "latitude": latitude, "longitude": longitude})
	}
}

func (c *Controller) postSignup(obj *member.Member) error {

	cfg := config.GetConfig()
	// 创建energy
	c.accountService.NewAccount(obj.ID, obj.UserName, "energy")
	// c.accountService.IncreaseAvailable(energy, 1000000, "gift")
	// 创建token账户
	// c.accountService.NewAccount(obj.ID, obj.UserName, tokenName)
	// 活动2023-11-12：新用户赠0.5U
	rosenAcc := c.accountService.NewAccount(obj.ID, obj.UserName, cfg.Rosen.Coin.TokenName)
	c.accountService.IncreaseAvailable(rosenAcc, int64(math.Pow10(int(cfg.Rosen.Coin.Decimals))*0.5), "gift")
	// 创建金币账户
	c.accountService.NewAccount(obj.ID, obj.UserName, cfg.Rosen.Coin2.TokenName)

	// 给默认装备
	var suit0 Asset
	suit0.Name = "base"
	suit0.Kind = "suit"
	suit0.Image = "https://rosen-dev-pub.oss-accelerate.aliyuncs.com/rosen/suits/m0.png"
	suit0.Logo = "https://rosen-dev-pub.oss-accelerate.aliyuncs.com/rosen/suits/i0.png"
	suit0.Description = `{"imgIndex":0,"avatar":"https://rosen-dev-pub.oss-accelerate.aliyuncs.com/rosen/suits/i0.png","image":"https://rosen-dev-pub.oss-accelerate.aliyuncs.com/rosen/suits/m0.png","suitImage":"https://rosen-dev-pub.oss-accelerate.aliyuncs.com/rosen/suits/f0.png"}`
	suit0.Count = 1
	suit0.OwnerID = obj.ID
	suit0.EarnRate = 0.0
	suit0.Type = 1
	suit0.Level = 99
	if err := c.Crud.SaveModel(&suit0); err != nil {
		log.Errorf("cannot create default suit for member %v: %v", obj.ID, err)
		return err
	}

	// 穿上默认装备
	var extra MemberExtra
	if err := c.service.GetModelByID(&extra, obj.ID); err != nil {
		log.Errorf("cannot find extra for member %v: %v", obj.ID, err)
		return err
	}

	extra.VirtualImageID = suit0.ID
	if err := c.service.UpdateModel(&extra, []string{"VirtualImageID"}, nil); err != nil {
		log.Errorf("cannot update virtual image id for member %v: %v", obj.ID, err)
		return err
	}

	return nil
}

func (c *Controller) SnsSignin(ctx *gin.Context) {

	var vo member.SnsLoginRequestVo
	if err := ctx.ShouldBind(&vo); err != nil {
		log.Errorf("member sns signin error: %v", err)
		ctx.String(http.StatusBadRequest, "message.common.system-error")
		return
	}

	token, m, isNew, err := c.memberService.SnsSignin(vo.Platform, vo.UserID, vo.AccessToken)

	if err == nil {
		log.Infof("member login success")
		var mvo MemberFullVO
		if isNew {
			if err := c.service.SetupNewMember(c.service.Db, m); err == nil {
				// post signup
				if err = c.postSignup(m); err != nil {
					log.Errorf("post signup error: %v", err)
				}
			}
		}
		copier.Copy(&mvo, m)
		utils.SendSuccessResponse(ctx, gin.H{"token": token, "member": mvo})
	} else if err.Error() == "message.member.email-registered" {
		log.Infof("member sns register failed: %v", err)
		utils.SendFailureResponse(ctx, 501, "message.member.email-registered")
	} else {
		// 登录失败
		log.Infof("member login failed: %v", err)
		utils.SendFailureResponse(ctx, 403, "message.member.invalid-username-verifycode")
	}
}
