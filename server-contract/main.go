package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/GoROSEN/rosen-opensource/server-contract/core/auth"
	"github.com/GoROSEN/rosen-opensource/server-contract/core/config"
	"github.com/GoROSEN/rosen-opensource/server-contract/core/cronjob"
	"github.com/GoROSEN/rosen-opensource/server-contract/core/user"

	"github.com/GoROSEN/rosen-opensource/server-contract/business/mall"
	"github.com/GoROSEN/rosen-opensource/server-contract/business/rosen"
	"github.com/GoROSEN/rosen-opensource/server-contract/core/notification"
	"github.com/GoROSEN/rosen-opensource/server-contract/features/account"
	"github.com/GoROSEN/rosen-opensource/server-contract/features/member"
	"github.com/GoROSEN/rosen-opensource/server-contract/features/message"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v7"
	"github.com/google/martian/log"
	"github.com/oschwald/geoip2-golang"
	"github.com/urfave/cli/v2"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func migratedb(db *gorm.DB) {

	config := config.GetConfig()
	log.Infof("migrating database...\n")
	user.MigrateDB(db)
	notification.MigrateDB(db)
	if config.ActiveModules == "*" || strings.Index(config.ActiveModules, "account") >= 0 {
		account.MigrateDB(db)
	}
	if config.ActiveModules == "*" || strings.Index(config.ActiveModules, "member") >= 0 {
		member.MigrateDB(db)
	}
	if config.ActiveModules == "*" || strings.Index(config.ActiveModules, "mall") >= 0 {
		mall.MigrateDB(db)
	}
	if config.ActiveModules == "*" || strings.Index(config.ActiveModules, "rosen") >= 0 {
		rosen.MigrateDB(db)
	}
	if config.ActiveModules == "*" || strings.Index(config.ActiveModules, "message") >= 0 {
		message.MigrateDB(db)
	}
	log.Infof("database migrated\n")
}

func main() {

	app := &cli.App{
		Name:  "ark",
		Usage: "a management system for lamb",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:  "migratedb",
				Value: "no",
				Usage: "set 'yes' to migrate models to database",
			},
			&cli.StringFlag{
				Name:  "config",
				Value: "",
				Usage: "file path name to config file. e.g. config.yaml",
			},
		},
		Action: ark,
	}

	log.SetLevel(log.Debug)
	err := app.Run(os.Args)
	if err != nil {
		log.Errorf("%v", err)
	}
}

func ark(c *cli.Context) error {

	config := config.GetConfig()

	if c.String("config") != "" {
		// load from file
		log.Infof("loading config from %v\n", c.String("config"))
		if config.LoadFromFile(c.String("config")) != nil {
			panic("cannot load config")
		}
	} else {
		// load from env
		log.Infof("loading config from environment")
		if config.LoadFromEnv() != nil {
			panic("cannot load config")
		}
	}

	log.Infof("open database %v: %v\n", config.Db.Driver, config.Db.ConnStr)
	var db *gorm.DB
	var err error
	if config.Db.Driver == "mysql" {
		db, err = gorm.Open(mysql.Open(config.Db.ConnStr), &gorm.Config{})
		if err != nil {
			log.Errorf("%v", err)
		}
	} else if config.Db.Driver == "postgres" {
		db, err = gorm.Open(postgres.Open(config.Db.ConnStr), &gorm.Config{})
		if err != nil {
			log.Errorf("%v", err)
		}
	} else {
		panic("Error: db driver not supported")
	}

	dbSQL, _ := db.DB()
	if dbSQL != nil {
		defer dbSQL.Close()
	}

	log.Infof("current dialector of db is %v", db.Dialector.Name())

	log.Infof("open redis %v:%v @ %v", config.Redis.Host, config.Redis.Port, config.Redis.DB)
	rs := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%v:%v", config.Redis.Host, config.Redis.Port),
		Password: config.Redis.Password, // no password set
		DB:       config.Redis.DB,       // use default DB
	})
	defer rs.Close()
	if _, err := rs.Ping().Result(); err != nil {
		log.Errorf("cannot open redis: %v", err)
	}

	if c.String("migratedb") == "yes" || c.String("migratedb") == "true" || c.String("migratedb") == "1" {
		migratedb(db)
		rosen.MigrateDataV1(db)
	}

	r := gin.Default()

	// setup session
	store := cookie.NewStore([]byte(config.Web.SessionToken))
	//store, _ := sredis.NewStore(config.Redis.DB, "tcp", config.Redis.Host+":"+config.Redis.Port, config.Redis.Password, []byte(config.Web.SessionToken))
	r.Use(sessions.Sessions("s", store))

	// setup cors
	if config.Cors.Enable {
		corsCfg := cors.DefaultConfig()
		corsCfg.AllowOrigins = config.Cors.AllowOrigins
		corsCfg.AllowHeaders = strings.Split(config.Cors.AllowHeaders, ",")
		corsCfg.AllowCredentials = true
		corsCfg.ExposeHeaders = []string{"Content-Length"}
		log.Infof("CORS: allowing origins %v\n", corsCfg.AllowOrigins)
		r.Use(cors.New(corsCfg))
	}

	// setup geoip
	geoPath := config.Geoip.DB
	geodb, err := geoip2.Open(geoPath)
	if err != nil {
		log.Errorf("unable load geodb %v, geoip will not work", geoPath)
		geodb = nil
	} else {
		defer geodb.Close()
	}

	// init controllers
	r.GET("/api/open/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	// set auth interceptor to all
	log.Infof("initializing auth controller...")
	auth.NewController(r, rs, db)
	userAuthInterceptor := auth.NewInterceptor(rs, db)
	r.Use(userAuthInterceptor.AuthInterceptor)

	log.Infof("initializing user controller...")
	user.NewController(r, db)

	if user.InitBootstrapUser(db) {
		log.Infof("Default user is created.")
		log.Infof("You can login with admin / adminpass for the first time")
	}

	if config.ActiveModules == "*" || strings.Index(config.ActiveModules, "account") >= 0 {
		log.Infof("initializing account controler...")
		account.NewController(r, db)
	}

	if config.ActiveModules == "*" || strings.Index(config.ActiveModules, "member") >= 0 {
		log.Infof("initializing member controller...")
		member.NewController(r, db, rs)
	}

	if config.ActiveModules == "*" || strings.Index(config.ActiveModules, "mall") >= 0 {
		log.Infof("initializing mall controller...")
		mall.NewController(r, rs, db)
	}

	if config.ActiveModules == "*" || strings.Index(config.ActiveModules, "rosen") >= 0 {
		log.Infof("initializing rosen controller...")
		rosen.NewController(r, db, rs, geodb)
	}
	if config.ActiveModules == "*" || strings.Index(config.ActiveModules, "message") >= 0 {
		log.Infof("initializing message controller...")
		message.NewController(r, db, rs)
	}
	if config.EnableCronJob {
		cronjob.GetScheduler().Start()
	}

	log.Infof("start listening")
	r.Run() // listen and serve on 0.0.0.0:8080 (for windows "localhost:8080")
	return nil
}
