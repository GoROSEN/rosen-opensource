package rosen

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/GoROSEN/rosen-apiserver/core/rpc"
	"github.com/GoROSEN/rosen-apiserver/features/member"
	"github.com/google/martian/log"
)

func (s *Service) memberIsFollowing(memberID uint, followingID uint) bool {

	log.Infof("MemberIsFollowing: %v -> %v", memberID, followingID)
	var member member.Member
	member.ID = memberID

	//检查是否已关注
	if s.Db.Model(&member).Where("following_id = ?", followingID).Association("Followings").Count() > 0 {
		log.Infof("already followed")
		return true
	}

	return false
}

func (s *Service) StartRpcServer() error {
	return s.rpcServer.Start(s.HandleRpcCall)
}

func (s *Service) EstimateChatFeeOld(fromUserId, toUserId uint) (feeToUser, feeToSys int64) {
	var costs int64
	feeToUser = 0
	if toUserId == 0 {
		// 公共频道，收费300E，充公
		feeToSys = 30000
	} else {
		if s.memberIsFollowing(fromUserId, toUserId) && s.memberIsFollowing(toUserId, fromUserId) {
			// 好友收费10E，全部归系统
			feeToSys = 0
		} else {
			// 陌生人收200E，接受人6，系统4
			costs = 20000
			feeToUser = costs * 6 / 10
			feeToSys = costs - feeToUser
		}
	}
	return
}

func (s *Service) EstimateChatFee(fromUserId, toUserId uint) (feeToUser, feeToSys int64) {
	return 0, 0
}

func (s *Service) HandleRpcCall(body []byte) (string, error) {

	var call rpc.RpcCallData
	json.Unmarshal(body, &call)
	log.Infof("RPC Call: %v", call.Command)

	switch call.Command {
	case "chat-billing":
		// from, to, cost
		fromUserId := uint(call.Params["from"].(float64))
		toUserId := uint(call.Params["to"].(float64))
		fromAcc := s.accountService.Account(fromUserId, "energy")
		sysAcc := s.accountService.Account(1, "energy")
		feeToUser, feeToSys := s.EstimateChatFee(fromUserId, toUserId)
		if feeToUser > 0 {
			toAcc := s.accountService.Account(toUserId, "energy")
			if _, err := s.accountService.Freeze(fromAcc, feeToUser+feeToSys, "chat billing"); err != nil {
				return fmt.Sprintf(`{"success":false,"cost":0,"available":%d}`, fromAcc.Available), nil
			}
			if _, err := s.accountService.Unfreeze(fromAcc, sysAcc, feeToSys, "chat billing"); err != nil {
				log.Errorf("cannot unfreeze to sys account: %v", err)
			}
			if _, err := s.accountService.Unfreeze(fromAcc, toAcc, feeToUser, "chat billing"); err != nil {
				log.Errorf("cannot unfreeze to user account: %v", err)
			}
			return fmt.Sprintf(`{"success":true,"cost":%d,"available":%d,"toAvailable":%d}`, feeToUser+feeToSys, fromAcc.Available, toAcc.Available), nil

		} else if feeToSys > 0 {
			if _, err := s.accountService.Transfer(fromAcc, sysAcc, feeToSys, "chat billing"); err != nil {
				log.Errorf("cannot transfer to sys account: %v", err)
				return fmt.Sprintf(`{"success":false,"cost":0,"available":%d}`, fromAcc.Available), nil
			}
			return fmt.Sprintf(`{"success":true,"cost":%d,"available":%d}`, feeToUser+feeToSys, fromAcc.Available), nil
		} else {
			return fmt.Sprintf(`{"success":true,"cost":%d,"available":%d}`, 0, fromAcc.Available), nil
		}
	case "offline-msg":
		toUserId := uint(call.Params["to"].(float64))
		fromUserId := uint(call.Params["from"].(float64))
		var m member.Member
		if err := s.GetModelByID(&m, toUserId); err != nil {
			log.Errorf("cannot find member: %v", err)
			return fmt.Sprintf(`{"success":false, "error":"%v"}`, err), nil
		}
		unread := int(call.Params["unread"].(float64))
		msg := call.Params["msg"].(string)
		s.msgMod.SendSimpleNotificationWithData(toUserId, "expo", msg, map[string]string{"channel": "p2pchat", "chatId": strconv.Itoa(int(fromUserId))}, unread)
		return `{"success":true, "error":""}`, nil
	case "game-result":
		gameSessionUUID := call.Params["sessionUuid"].(string)
		winnerId := uint(call.Params["winner"].(float64))
		log.Infof("RPC-Server: game %v, winner %v", gameSessionUUID, winnerId)
		if err := s.CloseGameSession(gameSessionUUID, winnerId); err != nil {
			log.Errorf("RPC-Server: game %v, cannot close session: %v", gameSessionUUID, err)
			return fmt.Sprintf(`{"success":false, "error":"%v"}`, err), err
		}
		return `{"success":true, "error":""}`, nil
	case "wallet-available-changed":
		toUserId := uint(call.Params["to"].(float64))
		amount := call.Params["amount"].(float64)
		var m member.Member
		if err := s.GetModelByID(&m, toUserId); err == nil {
			s.msgMod.SendMessageWithData(toUserId, "info-depposite-success", m.Language, amount, map[string]string{"channel": "deposit"})
		}
		return `{"success":true, "error":""}`, nil
	}

	return "", fmt.Errorf("RPC command %v is not implemented", call.Command)
}
