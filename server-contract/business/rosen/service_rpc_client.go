package rosen

import (
	"encoding/json"

	"github.com/GoROSEN/rosen-apiserver/core/config"
	"github.com/GoROSEN/rosen-apiserver/core/rpc"
	"github.com/google/martian/log"
)

func (s *Service) StartRpcClient() error {
	return s.rpcClient.Start()
}

func (s *Service) SendFollowingChange(fromUserId, toUserId uint, following bool) error {

	config := config.GetConfig()
	var message string
	if following {
		message = "user-following"
	} else {
		message = "user-unfollowing"
	}
	return s.rpcClient.Call(config.Rpc.Queues["im"], message, map[string]interface{}{"from": fromUserId, "to": toUserId}, func(data []byte) {
		var reply rpc.RpcCallSimpleReply
		if err := json.Unmarshal(data, &reply); err != nil {
			log.Errorf("FollowingChange: cannot unmarshal data")
		} else {
			log.Debugf("FollowingChange sent successfully")
		}
	})
}

func (s *Service) SendNewGameRequest(game *Game, sessionId, playersStr, autoPlayersStr string) error {
	config := config.GetConfig()
	message := "game-new"

	return s.rpcClient.Call(config.Rpc.Queues["im"], message, map[string]interface{}{"game": game.Name, "channel": game.ChannelID, "session": sessionId, "players": playersStr, "autoPlayers": autoPlayersStr}, func(data []byte) {
		var reply rpc.RpcCallSimpleReply
		if err := json.Unmarshal(data, &reply); err != nil {
			log.Errorf("NewGame: cannot unmarshal data")
		} else {
			log.Debugf("NewGame sent successfully")
		}
	})
}

func (s *Service) SendCheckUserWallet(userId uint) error {
	config := config.GetConfig()
	message := "check-user-wallet"

	return s.rpcClient.Call(config.Rpc.Queues["wm"], message, map[string]interface{}{"userId": userId}, func(data []byte) {
		var reply rpc.RpcCallSimpleReply
		if err := json.Unmarshal(data, &reply); err != nil {
			log.Errorf("CheckUserWallet: cannot unmarshal data")
		} else {
			log.Debugf("CheckUserWallet sent successfully")
		}
	})
}

func (s *Service) SendTranslatorUpdate(userId uint, enableTranslator bool, language string) error {
	config := config.GetConfig()
	message := "translator-setting-update"

	return s.rpcClient.Call(config.Rpc.Queues["im"], message, map[string]interface{}{"userId": userId, "enable": enableTranslator, "language": language}, func(data []byte) {
		var reply rpc.RpcCallSimpleReply
		if err := json.Unmarshal(data, &reply); err != nil {
			log.Errorf("SendTranslatorUpdate: cannot unmarshal data")
		} else {
			log.Debugf("SendTranslatorUpdate sent successfully")
		}
	})
}
