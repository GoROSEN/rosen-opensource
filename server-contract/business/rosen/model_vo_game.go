package rosen

import (
	"time"

	"github.com/jinzhu/copier"
)

// Game 游戏
type GameVO struct {
	ID              uint    `json:"id"`
	Name            string  `json:"name"`
	IconUrl         string  `json:"icon"`
	MinPlayerCount  uint    `json:"minPlayerCount"`
	MaxPlayerCount  uint    `json:"maxPlayerCount"`
	ChannelID       string  `json:"channelId"`
	Active          bool    `json:"active"`
	RemainPlayTimes int     `json:"dailyTimes"`
	EnergyCost      int64   `json:"energyCost"`
	Prize           float64 `json:"prize"`
	Bet             float64 `json:"bet"`
	BlazerFee       float64 `json:"blazerFee"`
	ProducerFee     float64 `json:"producerFee"`
}

// GameSession 游戏会话
type GameSessionVO struct {
	ID            uint                 `json:"id"`
	CreatedAt     time.Time            `json:"createdAt"`
	SessionID     string               `json:"uuid"`
	GameID        uint                 `json:"gameId"`
	PlotID        uint                 `json:"plotId"`
	HostID        uint                 `json:"hostId"`
	Status        int                  `json:"status"`
	Host          *MemberWithEquipVO   `json:"host"`
	Players       []uint               `json:"players,omitempty"`
	AvatarPlayers []uint               `json:"avatars,omitempty"`
	Results       []PlayerGameResultVO `json:"results,omitempty"`
}

type PlayerGameResultVO struct {
	ID           uint                 `json:"id"`
	CreatedAt    time.Time            `json:"createdAt"`
	PlotID       uint                 `json:"plotId"`
	WonPrize     float64              `json:"prize"`
	GameSession  *GameSessionVO       `json:"session,omitempty"`
	Player       *MemberWithEquipVO   `json:"player,omitempty"`
	Winner       *MemberWithEquipVO   `json:"winner"`
	OtherPlayers []*MemberWithEquipVO `json:"players"`
}

type PlayerGameStatusVO struct {
	ID              uint      `json:"id"`
	UpdatedAt       time.Time `json:"updatedAt"`
	PlayerID        uint      `json:"playerId"`
	GameID          uint      `json:"gameId"`
	Enabled         bool      `json:"enabled"`
	AutoPlay        bool      `json:"autoPlay"`
	Status          int       `json:"status"` //玩家状态，0-游戏中，1-可配对
	RemainPlayTimes int       `json:"remainTimes"`
	Game            *GameVO   `json:"game"`
}

func playerGameStatusList2playerGameStatusVoList(d interface{}) interface{} {
	dos := *d.(*[]PlayerGameStatus)
	vo := make([]*PlayerGameStatusVO, len(dos))
	for i, obj := range dos {
		vo[i] = &PlayerGameStatusVO{
			ID:              obj.ID,
			UpdatedAt:       obj.UpdatedAt,
			PlayerID:        obj.PlayerID,
			GameID:          obj.GameID,
			Enabled:         obj.Enabled == 1,
			AutoPlay:        obj.AutoPlay == 1,
			Status:          obj.Status,
			RemainPlayTimes: obj.RemainPlayTimes,
		}
		copier.Copy(vo[i].Game, obj.Game)
	}

	return vo
}
