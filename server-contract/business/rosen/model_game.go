package rosen

import "gorm.io/gorm"

// Game 游戏
type Game struct {
	gorm.Model

	Name            string  `gorm:"comment:名称;size:64"`
	ChannelID       string  `gorm:"comment:频道ID;size:64"`
	IconUrl         string  `gorm:"comment:图标URL;size:512"`
	MinPlayerCount  uint    `gorm:"size:32;comment:需要最小的玩家数量"`
	MaxPlayerCount  uint    `gorm:"size:32;comment:需要最大的玩家数量"`
	RemainPlayTimes int     `gorm:"index;size:32;comment:当日可玩（配对）次数"`
	Active          *bool   `gorm:"default:1;comment:是否可用"`
	EnergyCost      int64   `gorm:"comment:每次匹配需消耗的energyx100"`
	Prize           float64 `gorm:"comment:每局胜出奖励"`
	Bet             float64 `gorm:"comment:赌注"`
	ProducerFee     float64 `gorm:"default:0.1;comment:系统收费比例"`
	BlazerFee       float64 `gorm:"default:0.1;comment:系统收费比例"`
}

func (Game) TableName() string {
	return "rosen_games"
}

// GameSession 游戏会话
type GameSession struct {
	gorm.Model

	SessionID     string `gorm:"size:36;index;comment:游戏会话UUID"`
	GameID        uint   `gorm:"index;comment:所属游戏ID"`
	PlotID        uint   `gorm:"index;comment:游戏场地ID"`
	HostID        uint   `gorm:"index;comment:发起用户ID"`
	Status        int    `gorm:"size:8;default:0;index;comment:会话状态，0-未开始，1-进行中，2-已结束"` // 会话状态，0-未开始，1-进行中，2-已结束，-1-中止
	Players       string `gorm:"comment:玩家ID列表，逗号隔开;size:256"`
	AvatarPlayers string `gorm:"comment:自动玩家ID列表，逗号隔开;size:256"`
	Results       []PlayerGameResult
}

func (GameSession) TableName() string {
	return "rosen_game_sessions"
}

// PlayerGameResult 游戏结果
type PlayerGameResult struct {
	gorm.Model

	GameSessionID uint         `gorm:"index"`
	PlayerID      uint         `gorm:"index;comment:参与者ID"`
	WinnerID      *uint        `gorm:"index;comment:胜出者ID"`
	PlotID        uint         `gorm:"index;comment:游戏场地ID"`
	WonPrize      float64      `gorm:"comment:获得奖金，负数表示输"`
	GameSession   *GameSession `gorm:"foreignKey:GameSessionID"`
	Player        *MemberExtra `gorm:"foreignKey:PlayerID"`
	Winner        *MemberExtra `gorm:"foreignKey:WinnerID"`
}

func (PlayerGameResult) TableName() string {
	return "rosen_game_player_results"
}

// PlayerGameStatus 玩家游戏状态
type PlayerGameStatus struct {
	gorm.Model

	PlayerID        uint `gorm:"index:idx_unique_playerid_gameid,unique;comment:玩家ID"`
	GameID          uint `gorm:"index:idx_unique_playerid_gameid,unique;comment:所属游戏ID"`
	Enabled         int  `gorm:"size:1;default:0;index;comment:游戏功能是否开启，0-未开启，1-已开启"`       // 游戏功能是否开启，0-未开启，1-已开启
	Status          int  `gorm:"size:8;default:1;index;comment:玩家状态，0-游戏中，1-可配对"`           // 玩家状态，0-游戏中，1-可配对
	AutoPlay        int  `gorm:"size:1;default:0;index;comment:是否开启Avatar自动对战,0-未开启，1-已开启"` // 是否开启Avatar自动对战，0-未开启，1-已开启
	RemainPlayTimes int  `gorm:"index;size:32;comment:当日可玩（配对）次数"`
	Game            *Game
	Player          *MemberExtra `gorm:"foreignKey:PlayerID"`
}

func (PlayerGameStatus) TableName() string {
	return "rosen_game_player_status"
}
