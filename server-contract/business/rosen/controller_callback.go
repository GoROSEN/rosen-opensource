package rosen

import (
	"os"

	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/GoROSEN/rosen-apiserver/core/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/martian/log"
	appstore "github.com/izniburak/appstore-notifications-go"
)

func (c *Controller) setupCallbackController(r *gin.RouterGroup) {
	r.POST("/appstore/v2/notification", c.appStoreNotificationV2)
}

func (c *Controller) appStoreNotificationV2(ctx *gin.Context) {

	iapCfg := config.GetConfig().InAppPurchase

	var request appstore.AppStoreServerRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		log.Errorf("cannot parse body: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	rootCert, err := os.ReadFile(iapCfg.Apple.KeyFile)
	if err != nil {
		log.Errorf("cannot read root cert: %v", err)
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	appStoreServerNotification := appstore.New(request.SignedPayload, string(rootCert))

	if !appStoreServerNotification.IsValid {
		log.Errorf("invalid notification")
		utils.SendFailureResponse(ctx, 400, "message.common.system-error")
		return
	}

	// process
	log.Debugf("OriginalTransactionId Id: %s\n", appStoreServerNotification.TransactionInfo.OriginalTransactionId)
	if err := c.accountService.RevokeReceiption("apple", appStoreServerNotification.TransactionInfo.OriginalTransactionId, appStoreServerNotification.TransactionInfo); err != nil {
		log.Errorf("revoking failed: %v", err)
		utils.SendFailureResponse(ctx, 500, "message.common.system-error")
	}

	utils.SendSimpleSuccessResponse(ctx)
}
