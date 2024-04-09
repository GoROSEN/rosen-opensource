package rosen

import (
	"time"

	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
)

// BlazerVO 会员全视图模型
type BlazerVO struct {
	ID          uint          `json:"id"`
	DisplayName string        `json:"name"`            // 昵称
	Gender      string        `json:"gender"`          // 性别
	Avator      string        `json:"avatar"`          // 头像
	Level       uint          `json:"level"`           // 级别
	Equip       *EquipAssetVO `json:"equip,omitempty"` // 当前装备
}

// ProducerVO 会员全视图模型
type ProducerVO struct {
	ID          uint          `json:"id"`
	DisplayName string        `json:"name"`            // 昵称
	Gender      string        `json:"gender"`          // 性别
	Avator      string        `json:"avatar"`          // 头像
	Equip       *EquipAssetVO `json:"equip,omitempty"` // 当前装备
	Latitude    float64       `json:"latitude"`
	Longitude   float64       `json:"longitude"`
}

// Plot 地块
type PlotListItemVO struct {
	ID                uint              `json:"id"`
	Latitude          float64           `json:"lat"`
	Longitude         float64           `json:"lng"`
	Continent         string            `json:"continent"`
	Name              string            `json:"name"`
	Banner            string            `json:"banner"`
	Logo              string            `json:"logo"`
	Description       string            `json:"description"`
	AccessCount       uint64            `json:"accessCount"`
	MintCount         uint64            `json:"mintCount"`
	MintPrice         uint64            `json:"mintPrice"`
	OriginalMintPrice uint64            `json:"originalMintPrice"`
	MaxMintPrice      uint64            `json:"maxMintPrice"`
	MinMintPrice      uint64            `json:"minMintPrice"`
	Level             uint32            `json:"level"`
	Rank              uint32            `json:"rank"`
	OccupyPrice       uint64            `json:"occupyPrice"`
	OriginOccupyPrice uint64            `json:"originalOccupyPrice"`
	CurrentMintLimit  uint32            `json:"mintLimitCur"`
	DailyMintLimit    uint32            `json:"mintLimitOD"`
	DailyMintCount    uint32            `json:"mintCountOD"`
	MonthlyMintCount  uint64            `json:"mintCountOM"`
	Health            float64           `json:"durability"`
	MaintainCost      uint64            `json:"maintainCost"`
	Visible           bool              `json:"visible"`
	Available         bool              `json:"availble"`
	Style             int               `json:"style"`
	Layer             int               `json:"layer"`
	Blazer            *BlazerVO         `json:"blazer,omitempty"`
	CoBlazer          *BlazerVO         `json:"coblazer,omitempty"`
	Listing           *ListingPlotVO    `json:"listing,omitempty"`
	BatchMintLimit    uint32            `json:"batchMintLimit"`
	MintLimitDuration uint              `json:"mintLimitDuration"`
	MintLimitCount    uint              `json:"mintLimitCount"`
	MintPriceByChains map[string]uint64 `json:"mintPrices"`
	ShowFrame         bool              `json:"showFrame"`
}

type PlotDetailVO struct {
	ID                uint              `json:"id"`
	Latitude          float64           `json:"lat"`
	Longitude         float64           `json:"lng"`
	Continent         string            `json:"continent"`
	Name              string            `json:"name"`
	Banner            string            `json:"banner"`
	Logo              string            `json:"logo"`
	Description       string            `json:"description"`
	AccessCount       uint64            `json:"accessCount"`
	MintCount         uint64            `json:"mintCount"`
	MintPrice         uint64            `json:"mintPrice"`
	OriginalMintPrice uint64            `json:"originalMintPrice"`
	MaxMintPrice      uint64            `json:"maxMintPrice"`
	MinMintPrice      uint64            `json:"minMintPrice"`
	Level             uint32            `json:"level"`
	Cover             string            `json:"cover"`
	Rank              uint32            `json:"rank"`
	Health            float64           `json:"durability"`
	MaintainCost      uint64            `json:"maintainCost"`
	CurrentMintLimit  uint32            `json:"mintLimitCur"`
	DailyMintLimit    uint32            `json:"mintLimitOD"`
	DailyMintCount    uint32            `json:"mintCountOD"`
	MonthlyMintCount  uint64            `json:"mintCountOM"`
	OccupyPrice       uint64            `json:"occupyPrice"`
	OriginOccupyPrice uint64            `json:"originalOccupyPrice"`
	DueTo             uint64            `json:"dueTo"`
	Visible           bool              `json:"visible"`
	Available         bool              `json:"availble"`
	Style             int               `json:"style"`
	Layer             int               `json:"layer"`
	OccupyDays        int               `json:"occupyDays"`
	MintEnergy        uint64            `json:"mintEnergy"`
	Blazer            *BlazerVO         `json:"blazer,omitempty"`
	CoBlazer          *BlazerVO         `json:"coblazer,omitempty"`
	Listing           *ListingPlotVO    `json:"listing,omitempty"`
	BatchMintLimit    uint32            `json:"batchMintLimit"`
	MintLimitDuration uint              `json:"mintLimitDuration"`
	MintLimitCount    uint              `json:"mintLimitCount"`
	MintPriceByChains map[string]uint64 `json:"mintPrices"`
	Games             []GameVO          `json:"games"`
	ShowFrame         bool              `json:"showFrame"`
}

// PlotVO admin专用
type PlotVO struct {
	ID                uint              `json:"id"`
	Banner            string            `json:"banner"`
	Latitude          float64           `json:"lat"`
	Longitude         float64           `json:"lng"`
	Name              string            `json:"name"`
	Continent         string            `json:"continent"`
	Cover             string            `json:"cover"`
	Logo              string            `json:"logo"`
	Health            float64           `json:"health"`
	Description       string            `json:"description"`
	AccessCount       uint64            `json:"accessCount"`
	DailyMintCount    uint32            `json:"dailyMintCount"`
	MonthlyMintCount  uint64            `json:"monthlyMintCount"`
	MintCount         uint64            `json:"mintCount"`
	Rank              uint32            `json:"rank"`
	Level             uint32            `json:"level"`
	MintPrice         uint64            `json:"mintPrice"`
	OriginalMintPrice uint64            `json:"originalMintPrice"`
	MaxMintPrice      uint64            `json:"maxMintPrice"`
	MinMintPrice      uint64            `json:"minMintPrice"`
	DailyMintLimit    uint32            `json:"dailyMintLimit"`
	BatchMintLimit    uint32            `json:"batchMintLimit"`
	OccupiedAt        time.Time         `json:"occupiedAt"`
	OccupyDays        int               `json:"occupyDays"`
	DueTo             uint64            `json:"dueTo"`
	OriginPrice       uint64            `json:"originPrice"`
	Price             uint64            `json:"price"`
	Tags              string            `json:"tags"`
	MaintainCost      uint64            `json:"maintainCost"`
	TaxRate           float64           `json:"taxRate"`
	Visible           bool              `json:"visible"`
	Available         bool              `json:"available"`
	Style             int               `json:"style"`
	Layer             int               `json:"layer"`
	BlazerID          uint              `json:"blazerId"`
	BlazerName        string            `json:"blazerName"`
	CoBlazerID        uint              `json:"coblazerId"`
	CoBlazerName      string            `json:"coblazerName"`
	CoBlazerShare     float64           `json:"coBlzerShare"`
	MintLimitDuration uint              `json:"mintLimitDuration"`
	MintLimitCount    uint              `json:"mintLimitCount"`
	MintPriceByChains map[string]uint64 `json:"mintPrices"`
	Games             []GameVO          `json:"games"`
	ShowFrame         bool              `json:"showFrame"`
}

type MteSessionVO struct {
	ID            uint      `json:"id"`
	CreatedAt     time.Time `json:"createdAt"`
	MemberExtraID uint      `json:"memberId"`
	EquipID       uint      `json:"equipId"`
	EquipLife     int       `json:"equipLife"`
	EquipDueTo    time.Time `json:"equipDueTo"`
	EarnRate      float64   `json:"earnRate"`
	Status        int       `json:"status"`
	Energy        float64   `json:"energy"`
}

type MteTraceItemVO struct {
	MemberExtraID uint    `form:"memberId" json:"memberId"`
	MteSessionID  uint    `form:"mteId" json:"mteId"`
	Latitude      float64 `form:"lat" json:"lat"`
	Longitude     float64 `form:"lng" json:"lng"`
	Timestamp     uint64  `form:"timestamp" json:"timestamp"`
}

// ListingPlot 挂牌记录
type ListingPlotVO struct {
	ID          uint            `json:"id"`
	Price       uint64          `json:"price"`
	StartSellAt int64           `json:"sellAt"`
	Plot        *PlotListItemVO `json:"plot,omitempty"`
}

func plot2PlotVO(d interface{}) interface{} {
	plot := d.(*Plot)
	ret := &PlotDetailVO{
		ID:                plot.ID,
		Latitude:          plot.Latitude,
		Longitude:         plot.Longitude,
		Continent:         plot.Continent,
		Name:              plot.Name,
		Banner:            plot.Banner,
		Logo:              plot.Logo,
		Description:       plot.Description,
		AccessCount:       plot.AccessCount,
		MintCount:         plot.MintCount,
		MintPrice:         plot.MintPrice,
		OriginalMintPrice: plot.OriginalMintPrice,
		MaxMintPrice:      plot.MaxMintPrice,
		MinMintPrice:      plot.MinMintPrice,
		Level:             plot.Level,
		Cover:             plot.Cover,
		Rank:              plot.Rank,
		Health:            plot.Health,
		CurrentMintLimit:  mintLimit(plot.DailyMintLimit, plot.Health),
		DailyMintLimit:    plot.DailyMintLimit,
		DailyMintCount:    plot.DailyMintCount,
		MonthlyMintCount:  plot.MonthlyMintCount,
		MaintainCost:      plot.MaintainCost,
		OccupyPrice:       plot.Price,
		OriginOccupyPrice: plot.OriginPrice,
		DueTo:             plot.DueTo,
		Style:             plot.Style,
		Layer:             plot.Layer,
		OccupyDays:        plot.OccupyDays,
		Visible:           plot.Visible,
		Available:         plot.Available,
		BatchMintLimit:    plot.BatchMintLimit,
		MintLimitDuration: plot.MintLimitDuration,
		MintLimitCount:    plot.MintLimitCount,
		MintPriceByChains: plot.MintPriceByChains,
		Games:             make([]GameVO, len(plot.Games)),
		ShowFrame:         plot.ShowFrame,
	}

	// json.Unmarshal([]byte(plot.MintPriceByChains), ret.MintPriceByChains)

	if plot.Blazer != nil {
		ret.Blazer = &BlazerVO{
			ID:          plot.Blazer.MemberID,
			DisplayName: plot.Blazer.Member.DisplayName,
			Gender:      plot.Blazer.Member.Gender,
			Avator:      plot.Blazer.Member.Avatar,
			Level:       plot.Blazer.Level,
		}
		if plot.Blazer.CurrentEquip != nil {
			ret.Blazer.Equip = asset2EquipAssetVo(plot.Blazer.CurrentEquip).(*EquipAssetVO)
		}
	}

	if plot.CoBlazer != nil {
		ret.CoBlazer = &BlazerVO{
			ID:          plot.CoBlazer.MemberID,
			DisplayName: plot.CoBlazer.Member.DisplayName,
			Gender:      plot.CoBlazer.Member.Gender,
			Avator:      plot.CoBlazer.Member.Avatar,
			Level:       plot.CoBlazer.Level,
		}
		if plot.CoBlazer.CurrentEquip != nil {
			ret.CoBlazer.Equip = asset2EquipAssetVo(plot.CoBlazer.CurrentEquip).(*EquipAssetVO)
		}
	}

	if plot.Listing != nil && plot.Listing.SuccessorID == 0 {
		ret.Listing = &ListingPlotVO{
			ID:          plot.Listing.ID,
			Price:       plot.Listing.Price,
			StartSellAt: plot.Listing.StartSellAt,
		}
	}

	for i := range plot.Games {
		copier.Copy(&ret.Games[i], &plot.Games[i])
	}

	return ret
}

// func plotVo2Plot(v interface{}) interface{} {
// 	vo := v.(*PlotVO)
// 	ret := &Plot{}
// 	copier.Copy(ret, vo)
// 	bytes, _ := json.Marshal(vo)
// 	ret.MintPriceByChains = string(bytes)
// 	return ret
// }

func plot2PlotListItemVO(d interface{}) interface{} {
	plot := d.(*Plot)
	ret := &PlotListItemVO{
		ID:                plot.ID,
		Latitude:          plot.Latitude,
		Longitude:         plot.Longitude,
		Continent:         plot.Continent,
		Name:              plot.Name,
		Banner:            plot.Banner,
		Logo:              plot.Logo,
		Description:       plot.Description,
		AccessCount:       plot.AccessCount,
		MintCount:         plot.MintCount,
		MintPrice:         plot.MintPrice,
		OriginalMintPrice: plot.OriginalMintPrice,
		MaxMintPrice:      plot.MaxMintPrice,
		MinMintPrice:      plot.MinMintPrice,
		Level:             plot.Level,
		Rank:              plot.Rank,
		Health:            plot.Health,
		OccupyPrice:       plot.Price,
		OriginOccupyPrice: plot.OriginPrice,
		CurrentMintLimit:  mintLimit(plot.DailyMintLimit, plot.Health-0.30),
		DailyMintLimit:    plot.DailyMintLimit,
		DailyMintCount:    plot.DailyMintCount,
		BatchMintLimit:    plot.BatchMintLimit,
		MaintainCost:      plot.MaintainCost,
		MonthlyMintCount:  plot.MonthlyMintCount,
		Style:             plot.Style,
		Layer:             plot.Layer,
		Visible:           plot.Visible,
		Available:         plot.Available,
		MintLimitDuration: plot.MintLimitDuration,
		MintLimitCount:    plot.MintLimitCount,
		MintPriceByChains: plot.MintPriceByChains,
		ShowFrame:         plot.ShowFrame,
	}

	// json.Unmarshal([]byte(plot.MintPriceByChains), ret.MintPriceByChains)

	if plot.Blazer != nil {
		ret.Blazer = &BlazerVO{
			ID:          plot.Blazer.MemberID,
			DisplayName: plot.Blazer.Member.DisplayName,
			Gender:      plot.Blazer.Member.Gender,
			Avator:      plot.Blazer.Member.Avatar,
			Level:       plot.Blazer.Level,
		}
		if plot.Blazer.CurrentEquip != nil {
			ret.Blazer.Equip = asset2EquipAssetVo(plot.Blazer.CurrentEquip).(*EquipAssetVO)
		}
	}

	if plot.CoBlazer != nil {
		ret.CoBlazer = &BlazerVO{
			ID:          plot.CoBlazer.MemberID,
			DisplayName: plot.CoBlazer.Member.DisplayName,
			Gender:      plot.CoBlazer.Member.Gender,
			Avator:      plot.CoBlazer.Member.Avatar,
			Level:       plot.CoBlazer.Level,
		}
		if plot.CoBlazer.CurrentEquip != nil {
			ret.CoBlazer.Equip = asset2EquipAssetVo(plot.CoBlazer.CurrentEquip).(*EquipAssetVO)
		}
	}

	if plot.Listing != nil && plot.Listing.SuccessorID == 0 {
		ret.Listing = &ListingPlotVO{
			ID:          plot.Listing.ID,
			Price:       plot.Listing.Price,
			StartSellAt: plot.Listing.StartSellAt,
		}
	}

	return ret
}

func plotList2PlotVoList(d interface{}) interface{} {
	plots := d.([]Plot)
	vo := make([]*PlotListItemVO, len(plots))
	for i, obj := range plots {
		vo[i] = plot2PlotListItemVO(&obj).(*PlotListItemVO)
	}

	return vo
}

func plotList2PlotVoList2(d interface{}) interface{} {
	plots := d.([]Plot)
	vo := make([]*PlotDetailVO, len(plots))
	for i, obj := range plots {
		vo[i] = plot2PlotVO(&obj).(*PlotDetailVO)
	}

	return vo
}

func (c *Controller) memberPosition2Producer(d interface{}) interface{} {
	mp := d.(*MemberPosition)
	if mp == nil {
		log.Errorf("mp is nil")
		return nil
	}
	if mp.Member == nil {
		log.Errorf("mp.Member{%v} is nil", mp.MemberRefer)
		return nil
	}
	var avatar string
	if avatarURL, err := c.OssController.PresignedOssDownloadURLWithoutPrefix(mp.Member.Avatar); err != nil {
		log.Errorf("cannot get oss url: %v", err)
	} else {
		avatar = avatarURL.String()
	}

	if (mp.Visible != nil && !*mp.Visible) || (mp.Extra != nil && !mp.Extra.ShareLocation) {
		mp.Latitude = 0
		mp.Latitude = 0
	}

	if mp.Extra.CurrentEquip != nil {
		return &ProducerVO{
			ID:          mp.Member.ID,
			DisplayName: mp.Member.DisplayName,
			Gender:      mp.Member.Gender,
			Avator:      avatar,
			Equip:       asset2EquipAssetVo(mp.Extra.CurrentEquip).(*EquipAssetVO),
			Latitude:    mp.Latitude,
			Longitude:   mp.Longitude,
		}
	} else {
		return &ProducerVO{
			ID:          mp.Member.ID,
			DisplayName: mp.Member.DisplayName,
			Gender:      mp.Member.Gender,
			Avator:      avatar,
			Latitude:    mp.Latitude,
			Longitude:   mp.Longitude,
		}
	}
}

func (c *Controller) memberPositionList2ProducerList(d interface{}) interface{} {
	postions := *d.(*[]MemberPosition)
	vo := make([]*ProducerVO, len(postions))
	for i, obj := range postions {
		tmp := c.memberPosition2Producer(&obj)
		if tmp != nil {
			vo[i] = tmp.(*ProducerVO)
		} else {
			vo[i] = nil
		}
	}
	tvo := []*ProducerVO{}
	for _, obj := range vo {
		if obj != nil {
			tvo = append(tvo, obj)
		}
	}

	return tvo
}

func (c *Controller) memberExtra2MemberWithEquipVO(d interface{}) interface{} {
	mp := d.(*MemberExtra)
	var avatar string
	if avatarURL, err := c.OssController.PresignedOssDownloadURLWithoutPrefix(mp.Member.Avatar); err != nil {
		log.Errorf("cannot get oss url: %v", err)
	} else {
		avatar = avatarURL.String()
	}

	var vo MemberWithEquipVO
	if mp.CurrentEquip != nil {
		copier.Copy(&vo, mp.Member)
		vo.Avatar = avatar
		vo.Equip = asset2EquipAssetVo(mp.CurrentEquip).(*EquipAssetVO)
	} else {
		copier.Copy(&vo, mp.Member)
		vo.Avatar = avatar
	}
	return &vo
}

func (c *Controller) memberExtraList2MemberWithEquipVOList(d interface{}) interface{} {
	postions := *d.(*[]MemberExtra)
	vo := make([]*MemberWithEquipVO, len(postions))
	for i, obj := range postions {
		vo[i] = c.memberExtra2MemberWithEquipVO(&obj).(*MemberWithEquipVO)
	}

	return vo
}

type CityRankVO struct {
	ID        uint           `json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	City      string         `json:"city"`
	ExpiredAt time.Time      `json:"expiredAt"`
	Blazer    *RosenMemberVO `json:"blazer"`
	Plot      *PlotVO        `json:"plot"`
}
