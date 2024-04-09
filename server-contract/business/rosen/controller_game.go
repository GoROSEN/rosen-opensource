package rosen

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/GoROSEN/rosen-apiserver/core/utils"
	"github.com/GoROSEN/rosen-apiserver/features/account"
	"github.com/gin-gonic/gin"
	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
)

// setupOpenGameontroller 初始化控制器
func (c *Controller) setupOpenGameController(r *gin.RouterGroup) {

	r.GET("_endGame/:gameSessionId", func(ctx *gin.Context) {
		gameSessionUUID := ctx.Param("gameSessionId")
		winnerId, _ := strconv.Atoi(ctx.Query("winner"))
		log.Infof("[dev API]_endGame: game %v, winner %v", gameSessionUUID, winnerId)
		if err := c.service.CloseGameSession(gameSessionUUID, uint(winnerId)); err != nil {
			log.Errorf("[dev API]_endGame: game %v, cannot close session: %v", gameSessionUUID, err)
			utils.SendFailureResponse(ctx, 500, "")
			return
		}
		utils.SendSimpleSuccessResponse(ctx)
	})
}

// setupGameontroller 初始化控制器
func (c *Controller) setupGameController(r *gin.RouterGroup) {

	r.GET("list", func(ctx *gin.Context) {
		c.CrudController.ListAll(ctx, &[]Game{}, &[]GameVO{}, &Game{}, nil, nil, nil, "id asc", "")
	})
	r.GET("detail/:id", func(ctx *gin.Context) {
		c.CrudController.GetModel(ctx, &Game{}, &GameVO{}, []string{})
	})
	r.GET("records/:page", c.battleRecord)
	r.GET("current", c.currentGames)
	r.POST("new", c.newGameSession)
	r.POST("setup", c.setupPlayerGames)
	r.GET("setup", c.getPlayerGameSettings)
	r.GET("user-state/:gameId", c.getUserGameState)
}

func (c *Controller) cancelGameSession(hostId uint, playerIds []uint, hostEnergyAcc *account.Account, game *Game) {
	// 复原摇的人
	c.service.AddAvailablePlayer(game.ID, hostId)
	for _, playerId := range playerIds {
		c.service.AddAvailablePlayer(game.ID, playerId)
	}
	// 退费
	if _, err := c.accountService.Unfreeze(hostEnergyAcc, hostEnergyAcc, game.EnergyCost, fmt.Sprintf("game %d cancelled", game.ID)); err != nil {
		log.Errorf("cannot return player energy for game %v(%v): %v", game.Name, game.ID, err)
	}
}

func (c *Controller) newGameSession(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	// 校验用户是否存在
	extra := &MemberExtra{}
	if err := c.service.GetPreloadModelByID(extra, uint(memberId), []string{"Member"}); err != nil {
		log.Errorf("cannot get member: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	params := struct {
		PlotId uint `json:"plotId" form:"plotId"`
		GameId uint `json:"gameId" form:"gameId"`
	}{}
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot get params: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	// 检查游戏
	var game Game
	if err := c.service.GetModelByID(&game, params.GameId); err != nil {
		log.Errorf("game does not exist: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	if !*game.Active {
		log.Errorf("matchPlayers: game %v(%v) is inactive", game.Name, game.ID)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	playerAcc := c.accountService.Account(uint(memberId), "energy")
	if playerAcc == nil {
		log.Errorf("matchPlayers: player account is invalid")
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	if game.EnergyCost > 0 {
		// 扣除费用（冻结）
		if _, err := c.accountService.Freeze(playerAcc, game.EnergyCost, fmt.Sprintf("playing game %d", game.ID)); err != nil {
			log.Errorf("matchPlayers: insufficent player energy")
			utils.SendFailureResponse(ctx, 500, "message.token.insufficient-energy")
			return
		}
	}

	// 准备开始
	var playersFullVO []*MemberFullVO
	var playersVO []*MemberWithEquipVO
	var playerIds []uint
	// 先踢掉自己
	c.service.RemoveAvailablePlayer(game.ID, uint(memberId))
	// 摇人
	if players, err := c.service.MatchPlayers(&game); err != nil {
		// 摇失败
		log.Errorf("cannot match players for game %v(%v): %v", game.Name, game.ID, err)
		utils.SendFailureResponse(ctx, 500, "message.game.match-failed")
		c.cancelGameSession(uint(memberId), nil, playerAcc, &game)
		return
	} else {
		playersFullVO = make([]*MemberFullVO, len(players))
		playersVO = make([]*MemberWithEquipVO, len(players))
		playerIds = make([]uint, len(players))
		for i := range players {
			playersFullVO[i] = c.composeRosenMemberFullVO(&players[i], nil, nil, nil, nil)
			playersVO[i] = c.memberExtra2MemberWithEquipVO(&players[i]).(*MemberWithEquipVO)
			// masked privacy data
			playerIds[i] = playersVO[i].ID
		}
	}
	plots := []Plot{}
	var plot *Plot
	if err := c.service.Db.Limit(1).Order("rand()").Find(&plots, "blazer_id in ?", playerIds).Error; err != nil || len(plots) == 0 {
		// 随便找个plot
		c.service.Db.Limit(1).Order("rand()").Find(&plots)
	}
	if len(plots) > 0 {
		plot = &plots[0]
	}
	if plot.ID == 0 {
		log.Errorf("plot does not exist")
		utils.SendFailureResponse(ctx, 500, "message.game.match-failed")
		c.cancelGameSession(uint(memberId), playerIds, playerAcc, &game)
		return
	}
	if session, err := c.service.NewGameSession(&game, plot, playersFullVO, extra); err != nil {
		c.cancelGameSession(uint(memberId), playerIds, playerAcc, &game)
		log.Errorf("cannot create game session: %v", err)
		if err.Error() == "message.token.insufficient-token" {
			utils.SendFailureResponse(ctx, 500, "message.token.insufficient-token")
		} else {
			utils.SendFailureResponse(ctx, 500, "message.game.start-failed")
		}
		return
	} else {
		// 发起人扣费（解冻）
		if game.EnergyCost > 0 {
			sysAcc := c.accountService.Account(kSystemAccountID, "energy")
			if _, err := c.accountService.Unfreeze(playerAcc, sysAcc, game.EnergyCost, fmt.Sprintf("playing game %d", game.ID)); err != nil {
				log.Errorf("matchPlayers: cannot unfreeze player energy")
			}
		}
		// 组装vo
		vo := c.composeGameSessionVO(session)
		// 更新游戏状态、发送推送通知。自动玩家不需要发
		go func() {
			for _, p := range playersFullVO {
				if !contains(vo.AvatarPlayers, p.ID) {
					c.SendMessageWithData(p.ID, "info-new-game-invite", p.Language, extra.Member, map[string]string{"channel": "game", "gameId": fmt.Sprintf("%v", game.ID)})
				}
			}
		}()
		// 完成
		utils.SendSuccessResponse(ctx, gin.H{"session": vo, "players": playersVO})
	}
}

func (c *Controller) battleRecord(ctx *gin.Context) {
	memberId := ctx.GetInt("member-id")
	gameId, _ := strconv.Atoi(ctx.Query("gameId"))
	var results []PlayerGameResult

	page, err := strconv.Atoi(ctx.Param("page"))
	if err != nil || page < 1 {
		if page, err = strconv.Atoi(ctx.Query("page")); err != nil || page < 1 {
			page = 1
		}
	}
	pageSize, err := strconv.Atoi(ctx.Query("pageSize"))
	if err != nil || pageSize <= 0 {
		pageSize = 10
	}

	count, err := c.Crud.PagedV2(&results, &PlayerGameResult{}, []string{"Winner", "Winner.Member"}, []string{"GameSession"}, "id desc", page-1, pageSize, "player_id = ? and GameSession.game_id = ?", memberId, gameId)
	if err != nil {
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	volist := c.playerGameResultList2PlayerGameResultVOList(&results).([]*PlayerGameResultVO)
	for i := range results {
		r := &results[i]
		vo := volist[i]
		var players []MemberExtra
		if err := c.service.FindPreloadModelWhere(&players, []string{"Member", "CurrentEquip"}, "member_id != ? and member_id in ?", memberId, utils.StringToArray[uint](r.GameSession.Players)); err != nil {
			log.Errorf("cannot find players: %v", err)
			continue
		}
		vo.OtherPlayers = c.memberExtraList2MemberWithEquipVOList(&players).([]*MemberWithEquipVO)
	}
	utils.SendPagedSuccessResponse(ctx, page, pageSize, count, volist)
}

func (c *Controller) currentGames(ctx *gin.Context) {
	memberId := ctx.GetInt("member-id")
	var sessions []GameSession
	if err := c.service.ListAllWhere(&sessions, "status in (0,1) and CONCAT(',',players,',') LIKE CONCAT('%,', ?, ',%')", memberId); err != nil {
		log.Errorf("cannot get sessions: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	vo := make([]*GameSessionVO, len(sessions))
	for i := range vo {
		vo[i] = c.composeGameSessionVO(&sessions[i])
	}
	utils.SendSuccessResponse(ctx, vo)
}

func (c *Controller) setupPlayerGames(ctx *gin.Context) {
	memberId := ctx.GetInt("member-id")
	settings := []struct {
		AutoPlay bool `json:"autoPlay"`
		GameID   uint `json:"gameId"`
		Enabled  bool `json:"enabled"`
	}{}
	if err := ctx.ShouldBind(&settings); err != nil {
		log.Errorf("cannot get settings: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	var vo []*PlayerGameStatusVO = make([]*PlayerGameStatusVO, len(settings))
	for i := range settings {
		var game Game
		c.service.GetModelByID(&game, settings[i].GameID)
		vo[i] = &PlayerGameStatusVO{
			PlayerID:        uint(memberId),
			GameID:          settings[i].GameID,
			Enabled:         settings[i].Enabled,
			AutoPlay:        settings[i].AutoPlay,
			RemainPlayTimes: game.RemainPlayTimes,
		}
	}
	if err := c.service.UpdatePlayerGameSettings(uint(memberId), vo); err != nil {
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	utils.SendSimpleSuccessResponse(ctx)
}

func (c *Controller) getPlayerGameSettings(ctx *gin.Context) {
	memberId := ctx.GetInt("member-id")
	c.ListAll(ctx, &[]PlayerGameStatus{}, &[]PlayerGameStatusVO{}, &PlayerGameStatus{}, []string{"Game"}, nil, playerGameStatusList2playerGameStatusVoList, "game_id", "player_id = ?", memberId)
}

func (c *Controller) getUserGameState(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	gameId, _ := strconv.Atoi(ctx.Param("gameId"))

	var game Game
	if err := c.service.GetModelByID(&game, uint(gameId)); err != nil {
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	rosenCfg := config.GetConfig().Rosen
	tokenName := rosenCfg.Coin.TokenName
	energyAccount := c.accountService.Account(uint(memberId), "energy")
	tokenAccount := c.accountService.Account(uint(memberId), tokenName)

	var pgs PlayerGameStatus
	if err := c.service.FindModelWhere(&pgs, "game_id = ? and player_id = ?", gameId, memberId); err != nil {
		pgs.RemainPlayTimes = game.RemainPlayTimes
	}

	utils.SendSuccessResponse(ctx, gin.H{
		"energy":      energyAccount.Available / int64(math.Pow10(int(rosenCfg.Energy.Decimals))),
		tokenName:     tokenAccount.Available / int64(math.Pow10(int(rosenCfg.Coin.Decimals))),
		"playedTimes": game.RemainPlayTimes - pgs.RemainPlayTimes,
		"remainTimes": pgs.RemainPlayTimes,
	})
}

func (c *Controller) playerGameResultList2PlayerGameResultVOList(d interface{}) interface{} {
	dos := *d.(*[]PlayerGameResult)
	vo := make([]*PlayerGameResultVO, len(dos))
	for i, obj := range dos {
		vo[i] = &PlayerGameResultVO{
			ID:        obj.ID,
			CreatedAt: obj.CreatedAt,
			PlotID:    obj.PlotID,
			WonPrize:  obj.WonPrize,
		}

		if obj.Winner != nil {
			vo[i].Winner = c.memberExtra2MemberWithEquipVO(obj.Winner).(*MemberWithEquipVO)
		}
	}
	return vo
}

func (c *Controller) composeGameSessionVO(session *GameSession) *GameSessionVO {

	vo := &GameSessionVO{}
	copier.Copy(vo, &session)
	// 组装players
	pstr := strings.Split(session.Players, ",")
	vo.Players = make([]uint, len(pstr))
	for j := range pstr {
		t, _ := strconv.Atoi(pstr[j])
		vo.Players[j] = uint(t)
	}
	// 组装avatar_players
	pstr = strings.Split(session.AvatarPlayers, ",")
	vo.AvatarPlayers = make([]uint, len(pstr))
	for j := range pstr {
		t, _ := strconv.Atoi(pstr[j])
		vo.AvatarPlayers[j] = uint(t)
	}
	var m MemberExtra
	c.service.GetPreloadModelByID(&m, vo.HostID, []string{"Member", "CurrentEquip"})
	vo.Host = c.memberExtra2MemberWithEquipVO(&m).(*MemberWithEquipVO)

	return vo
}
