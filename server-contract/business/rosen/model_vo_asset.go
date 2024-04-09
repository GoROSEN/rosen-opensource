package rosen

import (
	"encoding/json"
	"strconv"

	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
)

// AssetVO 资产
type AssetVO struct {
	ID              uint   `json:"id"`
	Name            string `json:"name"`
	Kind            string `json:"kind"`
	Logo            string `json:"logo"`
	Description     string `json:"description"`
	Count           uint   `json:"count"`
	ChainName       string `json:"chainName"`
	ContractAddress string `json:"contractAddress"`
	NFTAddress      string `json:"nftAddress"`
	TokenId         uint64 `json:"tokenId"`
	Transferrable   bool   `json:"transferrable"`
	Level           int    `json:"level"`
}

// EquipAssetVO 装备资产
type EquipAssetVO struct {
	ID              uint    `json:"id"`
	Name            string  `json:"name"`
	Kind            string  `json:"kind"`
	ImageIndex      uint    `json:"imgindex"`
	Image           string  `json:"img"`
	Logo            string  `json:"logo"`
	SuitImage       string  `json:"suitImg"`
	Count           uint    `json:"life"`
	DueTo           int64   `json:"dueTo"`
	EarnRate        float64 `json:"earnRate"`
	Level           int     `json:"level"`
	ChainName       string  `json:"chainName"`
	ContractAddress string  `json:"contractAddress"`
	NFTAddress      string  `json:"nftAddress"`
	TokenId         uint64  `json:"tokenId"`
	Transferrable   bool    `json:"transferrable"`
}

// WalletVO 钱包
type WalletVO struct {
	ID      uint   `json:"id,omitempty"`
	Chain   string `json:"chain"`
	Address string `json:"address"`
}

/*
	{
		"imgIpfsUrl": "",
		"life": 2592000,
		"duration": "30d",
		"earnRate": 1.0
	}
*/
type SuitGoodVO struct {
	ImgIpfsUrl  string  `json:"imgIpfsUrl"`
	Life        int64   `json:"life"`
	Duration    string  `json:"duration"`
	EarnRate    float64 `json:"earnRate"`
	Level       int     `json:"level"`
	DisableMint bool    `json:"disableMint"`
}

type SuitParamsVO struct {
	ImageIndex  uint   `json:"imgIndex"`
	AvatarFrame string `json:"avatar"`
	Image       string `json:"image"`
	SuitImage   string `json:"suitImage"`
}

type CollectionVO struct {
	MintAccount          string `json:"mint"`
	TokenAccount         string `json:"tokenAccount"`
	MetadataAccount      string `json:"metadataAccount"`
	MasterEditionAccount string `json:"masterEditionAccount"`
}

func asset2EquipAssetVo(d interface{}) interface{} {
	asset := d.(*Asset)
	var vo EquipAssetVO
	copier.Copy(&vo, asset)

	var sp SuitParamsVO
	if err := json.Unmarshal([]byte(asset.Description), &sp); err != nil {
		log.Errorf("cannot unmarshal suit params vo: %v", err)
		imgindex, _ := strconv.Atoi(asset.Description)
		vo.ImageIndex = uint(imgindex)
	} else {
		vo.ImageIndex = sp.ImageIndex
		vo.Logo = sp.AvatarFrame
		vo.Image = sp.Image
		vo.SuitImage = sp.SuitImage
	}
	return &vo
}

func (c *Controller) asset2AssetVo(d interface{}) interface{} {
	asset := d.(*Asset)
	var logo string
	if u, err := c.PresignedOssDownloadURLWithoutPrefix(asset.Logo); err != nil {
		log.Errorf("cannot get oss url: %v", err)
	} else {
		logo = u.String()
	}

	var vo AssetVO
	copier.Copy(&vo, asset)
	vo.Logo = logo
	return &vo
}

func assetList2EquipAssetVoList(d interface{}) interface{} {
	assets := *d.(*[]Asset)
	vo := make([]*EquipAssetVO, len(assets))
	for i, obj := range assets {
		vo[i] = asset2EquipAssetVo(&obj).(*EquipAssetVO)
	}

	return vo
}

func (c *Controller) assetList2AssetVoList(d interface{}) interface{} {
	assets := *d.(*[]Asset)
	vo := make([]*AssetVO, len(assets))
	for i, obj := range assets {
		vo[i] = c.asset2AssetVo(&obj).(*AssetVO)
	}

	return vo
}
