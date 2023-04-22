package rosen

import (
	"strconv"
	"time"

	"github.com/GoROSEN/rosen-opensource/server-contract/business/mall"
	"github.com/GoROSEN/rosen-opensource/server-contract/core/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/martian/log"
)

// NewController 初始化控制器
func (c *Controller) setupAssetController(r *gin.RouterGroup) {

	r.GET("/assets/list/:page", func(ctx *gin.Context) {
		memberId := ctx.GetInt("member-id")
		keyword := ctx.Query("keyword")
		if len(keyword) == 0 {
			c.PageFull(ctx, &[]Asset{}, &[]AssetVO{}, &Asset{}, nil, nil, c.assetList2AssetVoList, "id desc", "type = 2 and owner_id = ?", memberId)
		} else {
			c.PageFull(ctx, &[]Asset{}, &[]AssetVO{}, &Asset{}, nil, nil, c.assetList2AssetVoList, "id desc", "type = 2 and owner_id = ? and name like ?", memberId, "%"+keyword+"%")
		}
	})
	r.GET("/assets/detail/:id", func(ctx *gin.Context) {
		// memberId := ctx.GetInt("member-id")
		c.GetModel(ctx, &Asset{}, &AssetVO{}, []string{})
	})
	r.GET("/gallery/list/:page", func(ctx *gin.Context) {
		memberId := ctx.GetInt("member-id")
		keyword := ctx.Query("keyword")
		if len(keyword) == 0 {
			c.PageFull(ctx, &[]Asset{}, &[]AssetVO{}, &Asset{}, nil, nil, c.assetList2AssetVoList, "id desc", "type = 0 and owner_id = ?", memberId)
		} else {
			c.PageFull(ctx, &[]Asset{}, &[]AssetVO{}, &Asset{}, nil, nil, c.assetList2AssetVoList, "id desc", "type = 0 and owner_id = ? and name like ?", memberId, "%"+keyword+"%")
		}
	})
	r.GET("/gallery/detail/:id", func(ctx *gin.Context) {
		// memberId := ctx.GetInt("member-id")
		c.GetModelCvt(ctx, &Asset{}, &AssetVO{}, []string{}, c.asset2AssetVo)
	})
	r.GET("/assets/producer-equips/:page", func(ctx *gin.Context) {
		memberId := ctx.GetInt("member-id")
		availableOnly, _ := strconv.ParseBool(ctx.Query("available_only"))

		if availableOnly {
			c.PageFull(ctx, &[]Asset{}, &[]EquipAssetVO{}, &Asset{}, nil, nil, assetList2EquipAssetVoList, "image asc", "type = 1 and owner_id = ? and count > 0 and (due_to = 0 or due_to > ?)", memberId, time.Now().Unix())
		} else {
			c.PageFull(ctx, &[]Asset{}, &[]EquipAssetVO{}, &Asset{}, nil, nil, assetList2EquipAssetVoList, "image asc", "type = 1 and owner_id = ?", memberId)
		}
	})
	r.GET("/assets/producer-current-equip", func(ctx *gin.Context) {
		memberId := ctx.GetInt("member-id")
		var extra MemberExtra
		if err := c.Crud.GetModelByID(&extra, uint(memberId)); err != nil {
			log.Errorf("cannot get member with member id (%v): %v", memberId, err)
			utils.SendFailureResponse(ctx, 500, "message.common.system-error")
			return
		}
		var asset Asset
		if err := c.Crud.GetModelByID(&asset, extra.VirtualImageID); err != nil {
			log.Errorf("cannot get asset with asset id (%v): %v", extra.VirtualImageID, err)
			utils.SendSuccessResponse(ctx, gin.H{})
			return
		}
		var equip *EquipAssetVO
		equip = asset2EquipAssetVo(&asset).(*EquipAssetVO)
		utils.SendSuccessResponse(ctx, equip)
	})
	r.POST("/assets/producer-equip/activate/:id", c.activateProducerEquip)
	r.POST("/assets/transfer/:id", c.transferAsset)
	r.POST("/assets/withdraw/:id", c.withdrawAsset)
	r.POST("/assets/mall-equip/order/:id", c.orderMallEquip)
}

func (c *Controller) activateProducerEquip(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	vimgID := ctx.Param("id")
	var member MemberExtra
	if err := c.Crud.FindModelWhere(&member, "member_id = ?", memberId); err != nil {
		log.Errorf("cannot get member with member id (%v): %v", memberId, err)
		utils.SendFailureResponse(ctx, 500, "message.member.member-not-found")
		return
	}
	val, err := strconv.Atoi(vimgID)
	if err != nil {
		log.Errorf("cannot convert virtual image id (%v) to int: %v", vimgID, err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}
	var vimg Asset
	if err := c.Crud.GetModelByID(&vimg, uint(val)); err != nil {
		log.Errorf("cannot find virtual image id (%v) for: %v", vimgID, err)
		utils.SendFailureResponse(ctx, 500, "message.assets.asset-not-found")
		return
	}
	if vimg.OwnerID != uint(memberId) {
		log.Errorf("member is not the owner of the asset")
		utils.SendFailureResponse(ctx, 500, "message.common.privilege-error")
		return
	}
	member.VirtualImageID = uint(val)
	if err := c.Crud.SaveModel(&member); err != nil {
		log.Errorf("cannot save member extra info: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}
	utils.SendSuccessMsgResponse(ctx, "message.m2e.equip-activated", nil)
}

func (c *Controller) transferAsset(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")

	assetID, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		log.Errorf("cannot get asset id: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	var params struct {
		ToMemberId uint `json:"to"`
	}

	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot bind params: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	if err := c.service.TransferAsset(uint(memberId), uint(assetID), params.ToMemberId); err != nil {
		log.Errorf("cannot transfer asset: %v", err)
		utils.SendFailureResponse(ctx, 501, err.Error())
		return
	}

	utils.SendSuccessMsgResponse(ctx, "message.asset.asset-transfered", nil)
}

func (c *Controller) withdrawAsset(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")

	assetID, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		log.Errorf("cannot get asset id: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	if err := c.service.TransferAsset(uint(memberId), uint(assetID), uint(memberId)); err != nil {
		log.Errorf("cannot withdraw asset: %v", err)
		utils.SendFailureResponse(ctx, 501, err.Error())
		return
	}

	utils.SendSuccessMsgResponse(ctx, "message.asset.asset-withdrawed", nil)
}

func (c *Controller) orderMallEquip(ctx *gin.Context) {

	memberId := ctx.GetInt("member-id")
	productId, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		log.Errorf("cannot get product id: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	params := struct {
		Chain string `json:"chain"`
	}{}
	if err := ctx.ShouldBind(&params); err != nil {
		log.Errorf("cannot get params: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	var good *mall.Good
	if good, err = c.mallService.GetGoodByID(uint(productId)); err != nil {
		log.Errorf("cannot get good by id: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	if good.SaleAfter == 0 || good.SaleAfter > uint64(time.Now().Unix()) {
		log.Errorf("good sales after: %v", good.SaleAfter)
		utils.SendFailureResponse(ctx, 500, "message.assets.not-start")
		return
	}

	if good.LimitPerOrder == 0 {
		log.Infof("check LimitPerOrder = %v", good.LimitPerOrder)
		// 这个接口每次只买一件，所以只要判断每单限购是否为0
		log.Errorf("cannot buy: good limit per order is %v", good.LimitPerOrder)
		utils.SendFailureResponse(ctx, 500, "message.assets.quantant-limited")
		return
	}

	if good.LimitPerUser >= 0 {
		log.Infof("check LimitPerUser = %v", good.LimitPerUser)
		// 用户限购检查
		if items, err := c.mallService.FindOrderForCustomerWithGood(uint(memberId), good.ID); err == nil {
			// log.Infof("items = %v", items)
			if len(*items) >= int(good.LimitPerUser) {
				log.Errorf("cannot buy: good limit per user is %v", good.LimitPerUser)
				utils.SendFailureResponse(ctx, 500, "message.assets.quantant-limited")
				return
			}
		} else {
			log.Errorf("FindOrderForCustomerWithGood error: %v", err)
		}
	}

	var gd *mall.GoodDetail
	if gd, err = c.mallService.GetDetailByGoodID(uint(productId)); err != nil {
		log.Errorf("cannot get good detail by id: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
		return
	}

	if err := c.service.OrderMallEquip(memberId, params.Chain, good, gd); err != nil {
		log.Errorf("cannot order equip: %v", err)
		utils.SendFailureResponse(ctx, 500, err.Error())
		return
	}

	order := &mall.Order{}
	order.CustomerID = uint(memberId)
	order.Status = 5
	order.OrderItems = []mall.OrderItem{
		{GoodID: good.ID, Quantant: 1, Price: good.Price},
	}
	c.mallService.NewOrder(order)

	utils.SendSimpleSuccessResponse(ctx)
}
