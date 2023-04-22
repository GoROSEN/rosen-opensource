package rosen

import (
	"time"

	"gorm.io/gorm"
)

// Plot 地块
type Plot struct {
	gorm.Model

	Banner            string       `gorm:"size:1024;comment:自定义广告标语"`
	Latitude          float64      `gorm:"index;comment:纬度"`
	Longitude         float64      `gorm:"index;comment:经度"`
	Name              string       `gorm:"size:128;index;comment:名称"`
	Continent         string       `gorm:"size:32;comment:洲"`
	Cover             string       `gorm:"size:256;comment:封面图片URL"`
	Logo              string       `gorm:"size:256;comment:图标URL"`
	Health            float64      `gorm:"default:1.0;comment:健康度,取值0.0-1.0"`
	Description       string       `gorm:"size:256;comment:描述"`
	AccessCount       uint64       `gorm:"default:0;comment:浏览量"`
	DailyMintCount    uint32       `gorm:"default:0;comment:当日已mint数量"`
	MonthlyMintCount  uint64       `gorm:"default:0;comment:当月被mint次数"`
	MintCount         uint64       `gorm:"default:0;comment:被mint次数"`
	Rank              uint32       `gorm:"default:1;comment:评级"`
	Level             uint32       `gorm:"default:1;comment:等级"`
	MintPrice         uint64       `gorm:"comment:Mint一次价格"`
	DailyMintLimit    uint32       `gorm:"comment:当日mint总限制"`
	BatchMintLimit    uint32       `gorm:"default:0;comment:每次mint量限制"`
	OccupiedAt        time.Time    `gorm:"comment:占领时间"`
	OccupyDays        int          `gorm:"comment:占领周期"`
	DueTo             uint64       `gorm:"comment:占领截止日期（unix时间戳）"`
	OriginPrice       uint64       `gorm:"comment:占领费用（原价）"`
	Price             uint64       `gorm:"comment:占领费用"`
	Tags              string       `gorm:"comment:搜索标签"`
	MaintainCost      uint64       `gorm:"comment:维护价格"`
	BlazerID          uint         `gorm:"index;comment:维护者ID"`
	CoBlazerID        uint         `gorm:"index;comment:共同经营者ID"`
	TaxRate           float64      `gorm:"default:0.2;comment:税率"`
	CoBlazerShare     float64      `gorm:"default:0.5;comment:共同经营者税后分成"`
	Visible           bool         `gorm:"default:true;comment:地块是否可见"`
	Available         bool         `gorm:"default:true;comment:地块是否可用"`
	Style             int          `gorm:"default:0;size:8;comment:地块展示风格"`
	Layer             int          `gorm:"default:0;size:8;comment:地块展示层级"`
	MintEnergy        uint64       `gorm:"default:0;comment:mint后获得能量数(x100)"`
	Blazer            *MemberExtra `gorm:"foreignKey:BlazerID"`
	CoBlazer          *MemberExtra `gorm:"foreignKey:CoBlazerID"`
	Listing           *ListingPlot `gorm:"foreignKey:PlotID"`
	MintLimitDuration uint         `gorm:"default:0;comment:mint限制周期（天），0不限"`
	MintLimitCount    uint         `gorm:"default:0;comment:周期内mint次数限制，0不限"`
}

func (Plot) TableName() string {
	return "rosen_plots"
}

type MintLog struct {
	gorm.Model
	ProducerID  uint   `gorm:"index;comment:ProducerID"`
	PlotID      uint   `gorm:"index;comment:地块ID"`
	BlazerID    uint   `gorm:"index;comment:BlazerID"`
	CoBlazerID  uint   `gorm:"index;comment:CoBlazerID"`
	PayedAmount uint64 `gorm:"comment:支付总额"`
	Result      string `gorm:"comment:执行结果"`
	Success     bool   `gorm:"size:1;default:1;index;comment:是否成功"`
}

func (MintLog) TableName() string {
	return "rosen_mint_logs"
}

type MteSession struct {
	gorm.Model
	MemberID    uint         `gorm:"index;comment:会员ID"`
	EquipID     uint         `gorm:"index;comment:使用装备ID"`
	EarnRate    float64      `gorm:"comment:Earn速度缓存"`
	Earned      uint64       `gorm:"default:0;comment:合计earn数量"`
	Status      int          `gorm:"index;comment:MTE会话状态（0-停止，1-进行中，2-暂停）"`
	MteTraces   []*MteTrace  `gorm:"foreignKey:MteSessionID"`
	RosenMember *MemberExtra `gorm:"ForeignKey:MemberID"`
	Equip       *Asset       `gorm:"ForeignKey:EquipID"`
}

func (MteSession) TableName() string {
	return "rosen_mte_sessions"
}

// MteTrace 会员轨迹
type MteTrace struct {
	gorm.Model

	MemberID     uint         `gorm:"index;comment:会员ID"`
	MteSessionID uint         `gorm:"index;comment:MoveToEarn会话ID"`
	Latitude     float64      `gorm:"index;comment:纬度"`
	Longitude    float64      `gorm:"index;comment:经度"`
	RosenMember  *MemberExtra `gorm:"ForeignKey:MemberID"`
}

func (MteTrace) TableName() string {
	return "rosen_mte_traces"
}

// ListingPlot 挂牌记录
type ListingPlot struct {
	gorm.Model

	PlotID      uint   `gorm:"index;comment:地块ID"`
	BlazerID    uint   `gorm:"index;comment:持有人ID"`
	CoBlazerID  uint   `gorm:"index;comment:共同经营者ID"`
	SuccessorID uint   `gorm:"index;comment:购买人ID"`
	Price       uint64 `gorm:"comment:挂牌价"`
	StartSellAt int64  `gorm:"comment:开卖时间"`
	Plot        *Plot  `gorm:"ForeignKey:PlotID"`
}

func (ListingPlot) TableName() string {
	return "rosen_listing_plots"
}

type SysConfig struct {
	gorm.Model

	Name        string `gorm:"uniqueindex;size:64;comment:字段名"`
	Value       string `gorm:"size:256;comment:值"`
	DisplayName string `gorm:"size:256;comment:字段显示名称"`
}

func (SysConfig) TableName() string {
	return "rosen_sys_configs"
}
