package rosen

import "gorm.io/gorm"

// MigrateDB 更新数据库表结构
func MigrateDB(db *gorm.DB) {

	db.AutoMigrate(&Asset{})
	db.AutoMigrate(&Wallet{})
	db.AutoMigrate(&MemberExtra{})
	db.AutoMigrate(&MemberPosition{})
	db.AutoMigrate(&MteSession{})
	db.AutoMigrate(&MteTrace{})
	db.AutoMigrate(&Plot{})
	db.AutoMigrate(&ListingPlot{})
	db.AutoMigrate(&SysConfig{})
	db.AutoMigrate(&MintLog{})
	db.AutoMigrate(&PlotCollection{})
	db.AutoMigrate(&Game{})
	db.AutoMigrate(&GameSession{})
	db.AutoMigrate(&PlayerGameResult{})
	db.AutoMigrate(&PlayerGameStatus{})
	db.AutoMigrate(&CityRank{})
	db.AutoMigrate(&ChatTransferCoin{})
	db.AutoMigrate(&ChatTransferCoinReceipt{})
}
