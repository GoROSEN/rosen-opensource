package rosen

import "github.com/GoROSEN/rosen-apiserver/core/common"

const (
	// 转账红包类型
	ChatTransferCoinTypeTransfer        = 1
	ChatTransferCoinTypeRandomRedPacket = 2
	ChatTransferCoinTypeFixedRedPacket  = 2
	// 转账红包状态
	ChatTransferCoinStatusExpired   = -1
	ChatTransferCoinStatusAvailable = 1
	ChatTransferCoinStatusFinished  = 2
	// 收据状态
	ChatTransferCoinReceiptStatusExpired   = -1
	ChatTransferCoinReceiptStatusAvailable = 1
	ChatTransferCoinReceiptStatusFinished  = 2
)

// ChatTransferCoin 转账、红包
type ChatTransferCoin struct {
	common.CrudModel
	UUID          string `gorm:"size:64" json:"uuid"`
	FromMemberID  uint   `json:"fromMemberId"`
	FromAccountID uint   `json:"fromAccountId"`
	Type          uint   `gorm:"size:8;comment:类型" json:"type"`
	Amount        int64  `gorm:"comment:金额" json:"amount"`
	Count         int64  `gorm:"size:32;comment:数量" json:"count"`
	Currency      string `gorm:"size:16;comment:币种" json:"currency"`
	Status        int    `gorm:"size:8;comment:状态：1-可用，2-已完成，-1已过期" json:"status"` // 1-available, 2-finished, -1-expired
}

func (ChatTransferCoin) TableName() string {
	return "rosen_chat_transfer_coins"
}

// ChatTransferCoinReceipt 转账、红包收据
type ChatTransferCoinReceipt struct {
	common.CrudModel
	ChatTransferCoinID uint  `json:"transferId"`
	ReceiverMemberID   uint  `json:"toMemberId"`
	Amount             int64 `gorm:"comment:金额" json:"amount"`
	Status             int   `gorm:"size:8;comment:状态：1-可用，2-已完成，-1已过期" json:"status"` // 0-pending, 1-received, -1-recalled
}

func (ChatTransferCoinReceipt) TableName() string {
	return "rosen_chat_transfer_coin_receipts"
}
