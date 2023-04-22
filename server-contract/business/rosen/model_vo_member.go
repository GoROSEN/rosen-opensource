package rosen

import (
	"math"
	"strings"

	"github.com/GoROSEN/rosen-opensource/server-contract/core/config"
	"github.com/GoROSEN/rosen-opensource/server-contract/features/account"
	"github.com/GoROSEN/rosen-opensource/server-contract/features/member"
	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
)

// RosenMemberVO 会员基础视图模型
type RosenMemberVO struct {
	ID            uint   `json:"id"`
	UserName      string `json:"userName"`    // 用户名
	DisplayName   string `json:"displayName"` // 昵称
	Avator        string `json:"avatar"`      // 头像
	Gender        string `json:"gender"`      // 性别
	CellPhone     string `json:"phone"`
	Bio           string `json:"bio"`
	WalletAddress string `json:"walletAddress"`
	ShareLocation bool   `json:"shareLocation"` //是否地图可见
}

// MemberFullVO 会员全视图模型
type MemberFullVO struct {
	ID                 uint          `json:"id"`
	UserName           string        `json:"userName"`    // 用户名
	DisplayName        string        `json:"displayName"` // 昵称
	Bio                string        `json:"bio"`
	Email              string        `json:"email"`              // 电邮，脱敏输出
	Gender             string        `json:"gender"`             // 性别
	Avator             string        `json:"avatar"`             // 头像
	FollowersCount     uint          `json:"followers"`          // 粉丝数量
	FolllowingCount    uint          `json:"followings"`         // 关注数量
	Role               string        `json:"role"`               // 角色
	Energy             int64         `json:"energy"`             // 能量
	TokenCoin          float64       `json:"token"`              // 罗森币
	LockedTokenCoin    float64       `json:"tokenLocked"`        // 罗森币
	Level              uint          `json:"level"`              // 级别
	ShareLocation      bool          `json:"shareLocation"`      //是否地图可见
	SysWalletAddresses []string      `json:"sysWalletAddresses"` // 系统钱包地址
	WalletAddresses    []string      `json:"walletAddresses"`    // 用户钱包地址
	SysWallets         []WalletVO    `json:"sysWallets"`
	UserWallets        []WalletVO    `json:"userWallets"`
	Assets             []AssetVO     `json:"assets"`
	Equip              *EquipAssetVO `json:"equip,omitempty"` // 当前装备
}

type MemberWithEquipVO struct {
	ID          uint          `json:"id"`
	DisplayName string        `json:"displayName"` // 昵称
	Avatar      string        `json:"avatar"`      // 头像
	Gender      string        `json:"gender"`      // 性别
	Bio         string        `json:"bio"`
	Level       uint          `json:"level"`
	Equip       *EquipAssetVO `json:"equip,omitempty"` // 当前装备
}

func (c *Controller) composeRosenMemberFullVO(ext *MemberExtra, sns *member.SnsSummary, energy *account.Account, rosenCoin *account.Account) *MemberFullVO {

	m := &ext.Member
	var avatar string
	if strings.Index(m.Avatar, "http") >= 0 {
		avatar = m.Avatar
	} else {
		if avatarURL, err := c.OssController.PresignedOssDownloadURLWithoutPrefix(m.Avatar); err != nil {
			log.Errorf("cannot get oss url: %v", err)
		} else {
			avatar = avatarURL.String()
		}
	}
	vo := &MemberFullVO{
		ID:          m.ID,
		UserName:    m.UserName,
		DisplayName: m.DisplayName,
		Bio:         m.Bio,
		Email:       m.Email,
		Gender:      m.Gender,
		Avator:      avatar,
	}
	if sns != nil {
		vo.FollowersCount = sns.FollowersCount
		vo.FolllowingCount = sns.FollowingsCount
	}
	if ext != nil {
		vo.Role = ext.Role
		vo.Level = ext.Level
		vo.ShareLocation = ext.ShareLocation
		if ext.CurrentEquip != nil {
			vo.Equip = asset2EquipAssetVo(ext.CurrentEquip).(*EquipAssetVO)
		}
		if len(ext.Wallets) > 0 {
			vo.SysWalletAddresses = make([]string, 0, len(ext.Wallets))
			vo.WalletAddresses = make([]string, 0, len(ext.Wallets))
			vo.SysWallets = make([]WalletVO, 0, len(ext.Wallets))
			vo.UserWallets = make([]WalletVO, 0, len(ext.Wallets))
			for i, _ := range ext.Wallets {
				var wvo WalletVO
				copier.Copy(&wvo, ext.Wallets[i])
				if len(ext.Wallets[i].PriKey) > 0 {
					if len(ext.Wallets[i].Token) == 0 {
						vo.SysWalletAddresses = append(vo.SysWalletAddresses, ext.Wallets[i].Address)
						vo.SysWallets = append(vo.SysWallets, wvo)
					}
				} else {
					vo.WalletAddresses = append(vo.WalletAddresses, ext.Wallets[i].Address)
					vo.UserWallets = append(vo.UserWallets, wvo)
				}
			}
		}
	}
	if energy != nil {
		vo.Energy = energy.Available / int64(math.Pow10(int(config.GetConfig().Rosen.Energy.Decimals)))
	}
	if rosenCoin != nil {
		decimals := int64(config.GetConfig().Rosen.Coin.Decimals)
		vo.TokenCoin = float64(rosenCoin.Available+rosenCoin.Locked) / math.Pow10(int(decimals))
		vo.LockedTokenCoin = float64(rosenCoin.Locked) / math.Pow10(int(decimals))
	}
	return vo
}
