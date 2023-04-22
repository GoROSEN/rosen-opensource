package rosen

import "gorm.io/gorm"

// MigrateDB 更新数据库表结构
func MigrateDB(db *gorm.DB) {

	db.AutoMigrate(&MemberExtra{})
	db.AutoMigrate(&MemberPosition{})
	db.AutoMigrate(&Wallet{})
	db.AutoMigrate(&MteSession{})
	db.AutoMigrate(&MteTrace{})
	db.AutoMigrate(&Plot{})
	db.AutoMigrate(&Asset{})
	db.AutoMigrate(&ListingPlot{})
	db.AutoMigrate(&SysConfig{})
	db.AutoMigrate(&MintLog{})
}
