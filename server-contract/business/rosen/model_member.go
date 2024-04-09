package rosen

import (
	"github.com/GoROSEN/rosen-apiserver/features/member"
)

// MemberExtra Rosen会员扩展信息
type MemberExtra struct {
	MemberID              uint          `gorm:"primaryKey;comment:会员ID"`
	Role                  string        `gorm:"comment:用户角色;size:16"`
	Level                 uint          `gorm:"comment:用户级别"`
	VirtualImageID        uint          `gorm:"comment:虚拟形象ID"`
	OccupyLimit           uint          `gorm:"comment:占地上限"`
	ShareLocation         bool          `gorm:"default:0;comment:是否共享位置信息"`
	CurrentEquip          *Asset        `gorm:"foreignKey:ID;references:VirtualImageID"`
	EnableChatTranslation bool          `gorm:"size:1;default:0;comment:是否开启翻译"`
	ChatTranslationLang   string        `gorm:"size:32;comment:翻译语言"`
	PayPassword           string        `gorm:"size:64;comment:支付密码"`
	Member                member.Member `gorm:"foreignKey:ID;references:MemberID"`
	Assets                []*Asset      `gorm:"foreignKey:OwnerID"`
	Wallets               []*Wallet     `gorm:"foreignKey:OwnerID;references:MemberID"`
}

func (MemberExtra) TableName() string {
	return "rosen_member_extras"
}

// MemberPosition 会员位置快照
type MemberPosition struct {
	MemberRefer uint           `gorm:"primaryKey;comment:会员ID"`
	Latitude    float64        `gorm:"index;comment:当前位置-纬度"`
	Longitude   float64        `gorm:"index;comment:当前位置-经度"`
	Timestamp   uint64         `gorm:"index;comment:快照时间"`
	Visible     *bool          `gorm:"default:0;comment:是否可见"`
	Extra       *MemberExtra   `gorm:"ForeignKey:MemberRefer"`
	Member      *member.Member `gorm:"ForeignKey:MemberRefer"`
}

func (MemberPosition) TableName() string {
	return "rosen_member_positions"
}
