package rosen

import (
	"errors"
	"fmt"
	"math"
	"strconv"

	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/GoROSEN/rosen-apiserver/features/member"
	"github.com/dablelv/cyan/conv"
	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
	uuid "github.com/satori/go.uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	kGameProgressAbort    int = -1
	kGameProgressPrepare  int = 0
	kGameProgressPlay     int = 1
	kGameProgressFinished int = 2
)

const (
	GAME_AVAILAVBLE_PLAYER_LIST string = "ROSEN_Game_%v_PlayerStatus"
)

func (s *Service) InitGame() error {
	// 同步redis状态
	if s.client == nil {
		return errors.New("failed init game: redis is not available")
	}
	var games []Game
	if err := s.ListAll(&games); err != nil {
		return err
	}
	for _, game := range games {
		// 清除玩家状态
		redisKey := fmt.Sprintf(GAME_AVAILAVBLE_PLAYER_LIST, game.ID)
		s.client.Del(redisKey)
		// 建立可配对玩家集合
		var ps []PlayerGameStatus
		if err := s.ListAllWhere(&ps, "game_id = ?", game.ID); err != nil {
			log.Errorf("init game %v(%v) failed: %v", game.Name, game.ID, err)
		}
		for _, st := range ps {
			if st.Status == 1 && st.Enabled == 1 {
				// 添加符合条件的玩家
				s.client.SAdd(redisKey, st.PlayerID)
			}
		}
		log.Infof("InitGame: %v players are matchable for game %v(%v).", len(ps), game.Name, game.ID)
	}
	return nil
}

func (s *Service) NewGameSession(game *Game, plot *Plot, players []*MemberFullVO, member *MemberExtra) (*GameSession, error) {

	log.Infof("NewGameSession: gameId = %v, plotId = %v, players = %v, creatorId = %v", game.ID, plot.ID, players, member.MemberID)

	// 检查用户是否有未结束的游戏
	if count := s.Count(&GameSession{}, "status in (0,1) and CONCAT(',',players,',') LIKE CONCAT('%,', ?, ',%')", strconv.Itoa(int(member.MemberID))); count > 0 {
		log.Errorf("member %v has %v game sessions at current!", member.MemberID, count)
		return nil, errors.New("session limit")
	}

	// 检查其他用户是否有未结束的游戏
	for _, p := range players {
		if count := s.Count(&GameSession{}, "status in (0,1) and CONCAT(',',players,',') LIKE CONCAT('%,', ?, ',%')", strconv.Itoa(int(p.ID))); count > 0 {
			log.Errorf("member %v has %v game sessions at current!", p.ID, count)
			return nil, errors.New("session limit")
		}
	}

	// 检查发起人状态
	var hostPgs PlayerGameStatus
	if err := s.Db.First(&hostPgs, "game_id = ? and player_id = ?", game.ID, member.MemberID).Error; err != nil {
		// 状态不存在，创建个新的
		hostPgs.AutoPlay = 0
		hostPgs.Enabled = 0
		hostPgs.Status = 1
		hostPgs.GameID = game.ID
		hostPgs.PlayerID = member.MemberID
		hostPgs.RemainPlayTimes = game.RemainPlayTimes
		s.Db.Create(&hostPgs)
	}
	if hostPgs.RemainPlayTimes <= 0 {
		log.Errorf("member %v cannot play game today!", member.MemberID)
		return nil, errors.New("out of play times")
	}
	// 可玩-1
	if err := s.Db.Model(&PlayerGameStatus{}).Where("game_id = ? and player_id = ?", game.ID, member.MemberID).Updates(map[string]interface{}{"status": 0, "remain_play_times": gorm.Expr("remain_play_times - ?", 1)}).Error; err != nil {
		return nil, err
	}

	playerIds := make([]uint, len(players)+1)
	playersStr := fmt.Sprintf("%d", member.MemberID)
	for i, p := range players {
		playersStr += fmt.Sprintf(",%d", p.ID)
		playerIds[i] = p.ID
	}
	playerIds[len(players)] = member.MemberID
	log.Debugf("players: %v", playerIds)
	var autoPlayersStr string
	var pgs []PlayerGameStatus
	if err := s.ListAllWhere(&pgs, "game_id = ? and player_id in ? and auto_play = 1", game.ID, playerIds); err != nil {
		log.Errorf("cannot find player game status for auto play: %v", err)
	}
	log.Debugf("found %v players allow auto play", len(pgs))
	for i := range pgs {
		for j := range players {
			if pgs[i].PlayerID == players[j].ID {
				// 免费皮肤不能自动玩
				equip := players[j].Equip
				if equip != nil && equip.Name != "Explorer Suit #2" && equip.Count > 0 {
					if len(autoPlayersStr) > 0 {
						autoPlayersStr += fmt.Sprintf(",%d", pgs[i].PlayerID)
					} else {
						autoPlayersStr = fmt.Sprintf("%d", pgs[i].PlayerID)
					}
				}
			}
		}
	}

	// 创建新游戏会话
	session := &GameSession{
		SessionID:     uuid.NewV4().String(),
		GameID:        game.ID,
		PlotID:        plot.ID,
		HostID:        member.MemberID,
		Status:        1,
		Players:       playersStr,
		AvatarPlayers: autoPlayersStr,
	}
	if err := s.CreateModel(session); err != nil {
		log.Errorf("cannot save game session: %v", err)
		return nil, errors.New("session creation failed")
	}
	// 通知游戏服务创建会话
	if err := s.SendNewGameRequest(game, session.SessionID, playersStr, autoPlayersStr); err != nil {
		log.Errorf("cannot create game session at remote service: %v", err)
		session.Status = -1
		s.UpdateModel(session, []string{"status"}, nil)
		return nil, errors.New("game creation failed")
	}

	// 变更用户状态
	if err := s.Db.Model(&PlayerGameStatus{}).Where("game_id = ? and player_id in ?", game.ID, playerIds).Updates(map[string]interface{}{"status": 0}).Error; err != nil {
		return nil, err
	}

	// 冻结用户资金
	accountType := config.GetConfig().Rosen.Coin.TokenName
	accountDecimal := math.Pow10(int(config.GetConfig().Rosen.Coin.Decimals))
	t := s.accountService.Begin()
	for i := range playerIds {
		acc := t.Account(playerIds[i], accountType)
		if _, err := t.Freeze(acc, int64(game.Bet*accountDecimal), fmt.Sprintf("freeze for game %v, session %v", game.ID, session.SessionID)); err != nil {
			log.Errorf("cannot freeze account for %v , %v : %v", playerIds[i], int64(game.Bet*accountDecimal), err)
			// 退钱
			t.Rollback()
			// 取消游戏
			session.Status = kGameProgressAbort
			s.UpdateModel(session, []string{"status"}, nil)
			// 还人
			if err := s.Db.Model(&PlayerGameStatus{}).Where("game_id = ? and player_id in ?", game.ID, playerIds).Updates(map[string]interface{}{"status": 1}).Error; err != nil {
				return nil, err
			}

			if playerIds[i] == member.MemberID {
				return nil, errors.New("message.token.insufficient-token")
			} else {
				return nil, err
			}
		}
	}
	t.Commit()
	// 完成
	log.Infof("NewGameSession: %v created", session.SessionID)

	return session, nil
}

func (s *Service) CloseGameSession(sessionUuid string, winnerId uint) error {

	var session GameSession
	if err := s.Db.First(&session, "session_id = ?", sessionUuid).Error; err != nil {
		return err
	}
	if session.Status != kGameProgressPlay {
		return errors.New("invalid session status")
	}
	// 获取游戏
	var game Game
	if err := s.GetModelByID(&game, session.GameID); err != nil {
		return err
	}
	// 更新会话
	session.Status = kGameProgressFinished
	if err := s.Db.Save(&session).Error; err != nil {
		return err
	}
	// 更新玩家状态
	playerIds := conv.SplitStrToSlice[uint](session.Players, ",")
	var pgses []PlayerGameStatus
	if err := s.ListAllWhere(&pgses, "player_id in ? and game_id = ?", playerIds, session.GameID); err != nil {
		return err
	}
	if err := s.Db.Model(&PlayerGameStatus{}).Where("player_id in ? and game_id = ?", playerIds, session.GameID).Update("status", 1).Error; err != nil {
		return err
	}
	for _, pgs := range pgses {
		if pgs.Enabled == 1 {
			s.AddAvailablePlayer(session.GameID, pgs.PlayerID)
		}
	}
	// 算钱
	accountType := config.GetConfig().Rosen.Coin.TokenName
	accountDecimal := math.Pow10(int(config.GetConfig().Rosen.Coin.Decimals))
	gameResults := make([]PlayerGameResult, len(playerIds))
	if winnerId > 0 {
		// 判断赢家是不是blazer
		var plotCount int64
		s.Db.Model(&Plot{}).Where("blazer_id = ?", winnerId).Or("co_blazer_id = ?", winnerId).Count(&plotCount)
		// 抽服务费
		var fee, prize float64
		if plotCount > 0 {
			// blazer
			fee = game.Bet * game.BlazerFee
		} else {
			// producer
			fee = game.Bet * game.ProducerFee
		}
		prize = game.Bet - fee
		totalPrize := prize * float64(len(playerIds)-1)
		var winner MemberExtra
		s.GetPreloadModelByID(&winner, winnerId, []string{"Member"})
		winnerAcc := s.accountService.Account(winnerId, accountType)
		sysAcc := s.accountService.Account(1, accountType)
		t := s.accountService.Begin()
		for i := range playerIds {
			acc := t.Account(playerIds[i], accountType)
			if acc.ID == winnerAcc.ID {
				// 自己，全款退
				if _, err := t.Unfreeze(acc, winnerAcc, int64(game.Bet*accountDecimal), fmt.Sprintf("bet for game %v, session %v", game.ID, session.SessionID)); err != nil {
					log.Errorf("cannot unfreeze account for %v , %v : %v", playerIds[i], int64(game.Bet*accountDecimal), err)
					t.Rollback()
					return err
				}
			} else {
				// 别人的，扣税
				if _, err := t.Unfreeze(acc, winnerAcc, int64(prize*accountDecimal), fmt.Sprintf("bet for game %v, session %v", game.ID, session.SessionID)); err != nil {
					log.Errorf("cannot unfreeze account for %v , %v : %v", playerIds[i], int64(game.Bet*accountDecimal), err)
					t.Rollback()
					return err
				}
				// 交税
				if _, err := t.Unfreeze(acc, sysAcc, int64(fee*accountDecimal), fmt.Sprintf("bet for game %v, session %v", game.ID, session.SessionID)); err != nil {
					log.Errorf("cannot unfreeze account for %v , %v : %v", playerIds[i], int64(game.Bet*accountDecimal), err)
					t.Rollback()
					return err
				}
			}
			// 发推送
			go func(playerId uint, winner *MemberExtra) {
				var p member.Member
				if err := s.GetModelByID(&p, playerId); err == nil {
					if playerId == winner.MemberID {
						s.msgMod.SendMessageWithData(p.ID, "info-game-result-won", p.Language, map[string]interface{}{"Game": &game, "Winner": winner.Member, "Prize": totalPrize, "Bet": game.Bet}, map[string]string{"channel": "game", "gameId": fmt.Sprintf("%v", game.ID), "result": "won"})
					} else {
						s.msgMod.SendMessageWithData(p.ID, "info-game-result-lost", p.Language, map[string]interface{}{"Game": &game, "Winner": winner.Member, "Prize": totalPrize, "Bet": game.Bet}, map[string]string{"channel": "game", "gameId": fmt.Sprintf("%v", game.ID), "result": "lost"})
					}
				}
			}(playerIds[i], &winner)
			gameResults[i].GameSessionID = session.ID
			gameResults[i].PlayerID = playerIds[i]
			gameResults[i].PlotID = session.PlotID
			gameResults[i].WinnerID = &winnerId
			if winnerId == playerIds[i] {
				gameResults[i].WonPrize = prize * float64(len(playerIds)-1)
			} else {
				gameResults[i].WonPrize = -float64(game.Bet)
			}
		}
		t.Commit()
	} else {
		for i := range playerIds {
			acc := s.accountService.Account(playerIds[i], accountType)
			if _, err := s.accountService.Unfreeze(acc, acc, int64(game.Bet*accountDecimal), fmt.Sprintf("bet for game %v, session %v", game.ID, session.SessionID)); err != nil {
				log.Errorf("cannot unfreeze account for %v , %v : %v", playerIds[i], int64(game.Bet*accountDecimal), err)
			}
			// 发推送
			go func(playerId uint) {
				var p member.Member
				if err := s.GetModelByID(&p, playerId); err == nil {
					s.msgMod.SendMessageWithData(p.ID, "info-game-result-draw", p.Language, map[string]interface{}{"Game": &game}, map[string]string{"channel": "game", "gameId": fmt.Sprintf("%v", game.ID), "result": "draw"})
				}
			}(playerIds[i])
			gameResults[i].GameSessionID = session.ID
			gameResults[i].PlayerID = playerIds[i]
			gameResults[i].PlotID = session.PlotID
			gameResults[i].WonPrize = 0
		}
	}
	if len(gameResults) > 0 {
		if err := s.Db.Omit("Player", "Winner", "GameSession").Create(gameResults).Error; err != nil {
			log.Errorf("cannot save game results: %v", err)
		}
	}

	return nil
}

func (s *Service) UpdatePlayerGameSettings(playerId uint, settings []*PlayerGameStatusVO) error {

	var pgs []PlayerGameStatus
	if err := copier.CopyWithOption(&pgs, &settings, copier.Option{
		Converters: []copier.TypeConverter{
			{
				SrcType: copier.Bool,
				DstType: copier.Int,
				Fn: func(src interface{}) (dst interface{}, err error) {
					i := src.(bool)
					if i {
						return 1, nil
					} else {
						return 0, nil
					}
				},
			},
		},
	}); err != nil {
		log.Errorf("Update player game settings failed: copy error %v", err)
		return err
	}
	if err := s.Db.Clauses(clause.OnConflict{
		DoNothing: true,
	}).Omit("Game", "Player").Create(&pgs).Error; err != nil {
		log.Errorf("create player game settings failed: %v", err)
		return err
	}
	// 刷新玩家状态
	s.Db.Find(&pgs, "player_id = ?", playerId)
	for i := range pgs {
		for j := range settings {
			// 更新需要更新的状态
			if pgs[i].GameID == settings[j].GameID && pgs[i].PlayerID == settings[j].PlayerID {
				if (pgs[i].Enabled == 1) != settings[j].Enabled ||
					(pgs[i].AutoPlay == 1) != settings[j].AutoPlay {
					if settings[j].Enabled {
						pgs[i].Enabled = 1
					} else {
						pgs[i].Enabled = 0
					}
					if settings[j].AutoPlay {
						pgs[i].AutoPlay = 1
					} else {
						pgs[i].AutoPlay = 0
					}
					if err := s.Db.Model(&pgs[i]).Select("enabled", "auto_play").Updates(pgs[i]).Error; err != nil {
						log.Errorf("cannot save player %v game %v settings: %v", pgs[i].PlayerID, pgs[i].GameID, err)
					}
				}
				break
			}
		}
	}
	for _, st := range pgs {
		redisKey := fmt.Sprintf(GAME_AVAILAVBLE_PLAYER_LIST, st.GameID)
		if st.Status == 1 && st.Enabled == 1 && st.RemainPlayTimes > 0 {
			s.client.SAdd(redisKey, st.PlayerID)
		} else {
			s.client.SRem(redisKey, st.PlayerID)
		}
	}

	return nil
}

func (s *Service) MatchPlayers(game *Game) ([]MemberExtra, error) {
	players := []MemberExtra{}
	redisKey := fmt.Sprintf(GAME_AVAILAVBLE_PLAYER_LIST, game.ID)
	recyclePlayerIds := []interface{}{}
	acceptedPlayerIds := []interface{}{}
	accountType := config.GetConfig().Rosen.Coin.TokenName
	accountDecimal := math.Pow10(int(config.GetConfig().Rosen.Coin.Decimals))

	availablePlayerCount := s.client.SCard(redisKey).Val()
	requiredCount := int64(math.Min(
		math.Max(float64(availablePlayerCount), float64(game.MinPlayerCount-1)),
		float64(game.MaxPlayerCount-1))) - int64(len(acceptedPlayerIds))
	// 开始摇人
	for requiredCount > 0 && availablePlayerCount >= requiredCount {
		playerIds := conv.ToUintSlice(s.client.SPopN(redisKey, requiredCount).Val())
		for i := range playerIds {
			// 检查可玩是否还开着
			var pgs PlayerGameStatus
			s.Db.Where("player_id = ? and game_id = ?", playerIds[i], game.ID).First(&pgs)
			if pgs.Enabled == 1 {
				// 检查余额
				acc := s.accountService.Account(playerIds[i], accountType)
				accepted := acc != nil && float64(acc.Available)/accountDecimal > float64(game.Bet)
				log.Debugf("check account available for player[%v], accepted = %v", playerIds[i], accepted)
				// 检查是否有地
				var plotCount int64
				if accepted {
					s.Db.Model(&Plot{}).Where("blazer_id = ?", playerIds[i]).Count(&plotCount)
					accepted = plotCount > 0
					log.Debugf("check plots = %v for player[%v], accepted = %v", plotCount, playerIds[i], accepted)
				}
				if accepted {
					// 合格
					acceptedPlayerIds = append(acceptedPlayerIds, playerIds[i])
				} else {
					// 不合格
					recyclePlayerIds = append(recyclePlayerIds, playerIds[i])
				}
			}
		}
		// 更新count
		requiredCount = int64(math.Min(
			math.Max(float64(availablePlayerCount), float64(game.MinPlayerCount-1)),
			float64(game.MaxPlayerCount-1))) - int64(len(acceptedPlayerIds))
		availablePlayerCount = s.client.SCard(redisKey).Val()
	}
	// 退回收人
	s.client.SAdd(redisKey, recyclePlayerIds...)
	if requiredCount == 0 {
		// 人数够了，可以开始
		// 获取人员数据
		if err := s.Db.Preload("Member").Preload("CurrentEquip").Find(&players, acceptedPlayerIds).Error; err != nil {
			log.Errorf("MatchPlayers cannot find players with id in (%v)", acceptedPlayerIds)
		}
	} else {
		// 人数不够玩
		// 回滚摇出来的人
		s.client.SAdd(redisKey, acceptedPlayerIds...)
		return players, fmt.Errorf("game %v(%v) requires at least %v players, only have %v available", game.Name, game.ID, game.MinPlayerCount, availablePlayerCount)
	}
	return players, nil
}

// RemoveAvailablePlayer 移除可用玩家缓存中的玩家
func (s *Service) RemoveAvailablePlayer(gameId, playerId uint) {
	redisKey := fmt.Sprintf(GAME_AVAILAVBLE_PLAYER_LIST, gameId)
	s.client.SRem(redisKey, playerId)
}

// AddAvailablePlayer 增加可用玩家缓存中的玩家
func (s *Service) AddAvailablePlayer(gameId, playerId uint) {
	redisKey := fmt.Sprintf(GAME_AVAILAVBLE_PLAYER_LIST, gameId)
	s.client.SAdd(redisKey, playerId)
}
