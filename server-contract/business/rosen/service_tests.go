package rosen

import (
	"testing"

	"github.com/GoROSEN/rosen-apiserver/features/account"
	"github.com/GoROSEN/rosen-apiserver/features/member"
	"github.com/alicebob/miniredis"
	"github.com/go-redis/redis/v7"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type ResourceStub struct {
	db          *gorm.DB
	redisServer *miniredis.Miniredis
	redisClient *redis.Client
}

func (r *ResourceStub) Close() {

	// r.db.Close()
	r.redisClient.Close()
	r.redisServer.Close()
}

func createService() (*Service, *ResourceStub) {

	// db, _ := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	dsn := "root:root@tcp(192.168.124.10:3306)/rosendev?charset=utf8mb4&parseTime=True&loc=Local"
	db, _ := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	s, err := miniredis.Run()
	if err != nil {
		panic(err)
	}
	MigrateDB(db)
	account.MigrateDB(db)
	member.MigrateDB(db)

	redis := redis.NewClient(&redis.Options{
		Addr:     s.Addr(), // use default Addr
		Password: "",       // no password set
		DB:       0,        // use default DB
	})

	account := account.NewAccountService(db)
	as := NewService(db, redis, account, nil, nil)

	return as, &ResourceStub{db, s, redis}
}

func TestMatchPlayers(t *testing.T) {

	// service, stub := createService()
	// defer stub.Close()

	// 摇人
	// players, err := service.MatchPlayers(&game)

}
