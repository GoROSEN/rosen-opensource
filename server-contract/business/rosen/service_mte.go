package rosen

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/GoROSEN/rosen-opensource/server-contract/core/config"
	"github.com/google/martian/log"
	"github.com/jinzhu/copier"
	"gorm.io/gorm"
)

func (s *Service) StartMTE(memberId uint, latitude, longitude float64) (*MteSessionVO, error) {

	member := &MemberExtra{}
	if err := s.GetModelByID(member, memberId); err != nil {
		log.Errorf("cannot get member extra: %v", err)
		return nil, err
	}
	// 若有旧session，强制关掉，不算分
	session := &MteSession{}
	if err := s.FindModelWhere(&session, "member_id = ? and status = 1", memberId); err == nil {
		session.Status = 0
		if err := s.SaveModel(session); err != nil {
			log.Errorf("cannot terminate previous session: %v", err)
			return nil, err
		}
	}
	// 若redis已经有存在的session，抹掉
	s.clearMteSession(memberId)

	session = &MteSession{
		MemberID: uint(memberId),
		EquipID:  0,
		EarnRate: 1.0,
		Status:   1,
		Earned:   0,
	}

	var suit Asset
	if err := s.GetModelByID(&suit, member.VirtualImageID); err != nil {
		log.Errorf("cannot get suit: %v", err)
		return nil, errors.New("no equip")
	} else if suit.Count > 0 && suit.EarnRate > 0 && (suit.DueTo == 0 || time.Now().Unix() < suit.DueTo) {
		session.EquipID = suit.ID
		session.EarnRate = suit.EarnRate
		session.Equip = &suit
	} else {
		// 找不到装备或装备无效
		log.Errorf("cannot find valid equip for member %v", memberId)
		return nil, errors.New("no equip")
	}

	if err := s.CreateModel(session); err != nil {
		log.Errorf("cannot save mte session: %v", err)
		return nil, err
	}
	trace := &MteTrace{
		MemberID:     uint(memberId),
		MteSessionID: session.ID,
		Latitude:     latitude,
		Longitude:    longitude,
		RosenMember:  member,
	}
	if err := s.CreateModel(trace); err != nil {
		log.Errorf("cannot save mte trace: %v", err)
		return nil, err
	}
	if err := s.cacheSession(session); err != nil {
		log.Errorf("cannot cache session: %v", err)
		return nil, err
	}
	now := time.Now()
	if err := s.cacheTrace(trace, &now); err != nil {
		log.Errorf("cannot cache trace: %v", err)
		return nil, err
	}
	s.updateMemberPosition(memberId, trace)
	svo := s.readCachedSession(memberId)

	return svo, nil
}

func (s *Service) PauseMTE(memberId uint, sessionId uint, latitude, longitude float64) (*MteSessionVO, error) {

	member := &MemberExtra{}
	if err := s.GetModelByID(member, memberId); err != nil {
		log.Errorf("cannot get member extra: %v", err)
		return nil, err
	}
	svo := s.readCachedSession(memberId)
	if svo == nil {
		log.Errorf("cannot get cached session: %v", memberId)
		return nil, errors.New("cannot get cached session")
	}
	tvo := s.readCachedTrace(memberId)
	if tvo == nil {
		log.Errorf("cannot get cached trace: %v", memberId)
		return nil, errors.New("cannot get cached trace")
	}

	if svo.ID != tvo.MteSessionID || tvo.MteSessionID != sessionId {
		log.Errorf("invalid sessoin id")
		return nil, errors.New("invalid session id")
	}
	session := &MteSession{}
	if err := s.GetModelByID(session, sessionId); err != nil {
		log.Errorf("cannot find mte session: %v", err)
		return nil, err
	}
	if session.Status != 1 {
		log.Errorf("session is not in progress")
		return nil, errors.New("session is not in progress")
	}
	trace := &MteTrace{
		MemberID:     uint(memberId),
		MteSessionID: session.ID,
		Latitude:     latitude,
		Longitude:    longitude,
		RosenMember:  member,
	}
	if err := s.SaveModel(trace); err != nil {
		log.Errorf("cannot save mte trace: %v", err)
		return nil, err
	}
	// 算分
	now := time.Unix(time.Now().Unix(), 0)
	if _, _, err := s.earnEnergy(svo, tvo, &now); err != nil {
		log.Errorf("earn energy failed: %v", err)
		return nil, err
	}
	if svo.EquipID > 0 && svo.EquipLife <= 0 {
		s.endMteSession(svo, tvo)
		// 发装备消耗殆尽通知
		s.msgMod.SendMessage(memberId, "warn-suit-burn-out", "en_US")
	} else {
		// 暂停
		session.Status = 2
		session.Earned = uint64(svo.Energy)
		if err := s.SaveModel(session); err != nil {
			log.Errorf("cannot save mte session %v for: %v", session.ID, err)
			return nil, err
		}
		s.clearMteSession(memberId)
		s.updateMemberPosition(memberId, trace)
	}
	return svo, nil
}

func (s *Service) ResumeMTE(memberId uint, sessionId uint, latitude, longitude float64) (*MteSessionVO, error) {

	member := &MemberExtra{}
	if err := s.GetModelByID(member, memberId); err != nil {
		log.Errorf("cannot get member extra: %v", err)
		return nil, err
	}
	session := &MteSession{}
	if err := s.GetModelByID(session, sessionId); err != nil {
		log.Errorf("cannot find mte session: %v", err)
		return nil, err
	}
	if session.Status != 2 {
		log.Errorf("session is not paused")
		return nil, errors.New("session is not paused")
	}
	trace := &MteTrace{
		MemberID:     uint(memberId),
		MteSessionID: session.ID,
		Latitude:     latitude,
		Longitude:    longitude,
		RosenMember:  member,
	}
	if err := s.SaveModel(trace); err != nil {
		log.Errorf("cannot save mte trace: %v", err)
		return nil, err
	}
	session.Status = 1 // 继续
	if err := s.SaveModel(session); err != nil {
		log.Errorf("cannot save mte session %v for: %v", session.ID, err)
		return nil, err
	}
	now := time.Now()
	s.cacheSession(session)
	s.cacheTrace(trace, &now)
	s.updateMemberPosition(memberId, trace)
	svo := s.readCachedSession(memberId)

	return svo, nil
}

func (s *Service) StopMTE(memberId uint, sessionId uint, latitude, longitude float64) (*MteSessionVO, error) {
	member := &MemberExtra{}
	if err := s.GetModelByID(member, memberId); err != nil {
		log.Errorf("cannot get member extra: %v", err)
		return nil, err
	}
	svo := s.readCachedSession(memberId)
	if svo == nil {
		log.Errorf("cannot get cached session: %v", memberId)
		return nil, errors.New("cannot get cached session")
	}
	tvo := s.readCachedTrace(memberId)
	if tvo == nil {
		log.Errorf("cannot get cached trace: %v", memberId)
		return nil, errors.New("cannot get cached trace")
	}

	if svo.ID != tvo.MteSessionID || tvo.MteSessionID != sessionId {
		log.Errorf("invalid sessoin id")
		return nil, errors.New("invalid session id")
	}

	session := &MteSession{}
	if err := s.GetModelByID(session, sessionId); err != nil {
		log.Errorf("cannot find mte session: %v", err)
		return nil, err
	}
	if session.Status == 0 {
		log.Errorf("session is ended")
		return nil, errors.New("session is ended")
	}
	trace := &MteTrace{
		MemberID:     uint(memberId),
		MteSessionID: session.ID,
		Latitude:     latitude,
		Longitude:    longitude,
		RosenMember:  member,
	}
	if err := s.SaveModel(trace); err != nil {
		log.Errorf("cannot save mte trace: %v", err)
		return nil, err
	}
	// 算分
	now := time.Now()
	if t, _, err := s.earnEnergy(svo, tvo, &now); err != nil {
		log.Errorf("earn energy failed: %v", err)
		return nil, err
	} else {
		svo.Energy += t
	}
	session.Status = 0 // 停止
	session.Earned = uint64(svo.Energy)
	if err := s.SaveModel(session); err != nil {
		log.Errorf("cannot save mte session %v for: %v", session.ID, err)
		return nil, err
	}

	s.clearMteSession(memberId)
	s.updateMemberPosition(memberId, trace)

	return svo, nil
}

func (s *Service) KeepMTE(memberId uint, sessionId uint, latitude, longitude float64) (*MteSessionVO, error) {

	svo := s.readCachedSession(memberId)
	if svo == nil {
		log.Errorf("cannot get cached session: %v", memberId)
		return nil, errors.New("cannot get cached session")
	}
	tvo := s.readCachedTrace(memberId)
	if tvo == nil {
		log.Errorf("cannot get cached trace: %v", memberId)
		return nil, errors.New("cannot get cached trace")
	}

	if svo.ID != tvo.MteSessionID || tvo.MteSessionID != sessionId {
		log.Errorf("invalid sessoin id %v, should be %v", sessionId, tvo.MteSessionID)
		return nil, errors.New("invalid session id")
	}

	// 限制更新频率
	now := time.Now()

	if now.Unix()-int64(tvo.Timestamp) < int64(s.sysconfig.MoveToEarnRateLimit) {
		return svo, nil
	}

	// 算分
	var ok bool
	if t, o, err := s.earnEnergy(svo, tvo, &now); err != nil {
		log.Errorf("earn energy failed: %v", err)
		return nil, err
	} else {
		svo.Energy += t
		ok = o
	}

	trace := &MteTrace{
		MemberID:     uint(memberId),
		MteSessionID: sessionId,
		Latitude:     latitude,
		Longitude:    longitude,
	}
	if err := s.SaveModel(trace); err != nil {
		log.Errorf("cannot save mte trace: %v", err)
		return nil, err
	}
	s.updateMemberPosition(memberId, trace)

	if ok {
		if svo.EquipID > 0 &&
			(svo.EquipLife <= 0 ||
				(svo.EquipDueTo.Unix() > 0 && now.After(svo.EquipDueTo))) {

			log.Infof("session %v end for equip(%v) burned out", svo.ID, svo.EquipID)
			s.endMteSession(svo, tvo)
			// 发装备消耗殆尽通知
			s.msgMod.SendMessage(memberId, "warn-suit-burn-out", "en_US")
			// 不脱了
			// 装备耗尽处理：脱掉装备，换为白装
			var defSuit Asset
			if err := s.FindModelWhere(&defSuit, "level = ? and owner_id = ? and kind = 'suit'", 99, memberId); err != nil {
				log.Errorf("cannot find default suit for member id (%v): %v", memberId, err)
			} else if svo.EquipID != defSuit.ID {
				vimg := defSuit.ID
				if err := s.Db.Model(&MemberExtra{}).Where("member_id = ?", memberId).Update("virtual_image_id", &vimg).Error; err != nil {
					log.Errorf("cannot find member extra with member id (%v): %v", memberId, err)
				}
			}
		} else {
			s.updateCachedSession(svo)
			s.cacheTrace(trace, &now)
		}
	} else {
		log.Infof("session %v end for error of earn", svo.ID)
		s.endMteSession(svo, tvo)
		// 发送超时中止
		s.msgMod.SendMessage(memberId, "warn-m2e-interrupted", "en_US", config.GetConfig().Rosen.MTE.KeepAliveDurationInSec)
	}

	return svo, nil
}

func (s *Service) endMteSession(svo *MteSessionVO, tvo *MteTraceItemVO) error {

	log.Infof("session %v ended", svo.ID)
	s.clearMteSession(tvo.MemberID)
	// 会话超时，关闭
	var session MteSession
	session.ID = svo.ID
	if err := s.Db.Model(&session).Select("status", "earned").Updates(&MteSession{Status: 0, Earned: uint64(svo.Energy)}).Error; err != nil {
		log.Errorf("cannot update mte session %v for: %v", session.ID, err)
		return err
	}
	return nil
}

func (s *Service) earnEnergy(session *MteSessionVO, trace *MteTraceItemVO, now *time.Time) (float64, bool, error) {

	keepAliveDuration := config.GetConfig().Rosen.MTE.KeepAliveDurationInSec
	ok := true
	tm := *now
	if uint64(now.Unix())-trace.Timestamp > uint64(keepAliveDuration) {
		// 超时，只能按最后位置时间+超时时间算
		log.Errorf("earnEnergy: timedout")
		tm = time.Unix(int64(trace.Timestamp), 0).Add(time.Duration(keepAliveDuration) * time.Second)
		ok = false
	}
	from := time.Unix(int64(trace.Timestamp), 0)
	// earned := int64(tm.Sub(from).Minutes() * session.EarnRate * 100)
	// log.Infof("earned = %v; from = %v, now = %v, sub = %v, earnRate = %v", earned, from.UnixNano(), tm.UnixNano(), tm.Sub(from).Minutes(), session.EarnRate)
	earned := int64(math.Floor(tm.Sub(from).Seconds()) * session.EarnRate * 100.0 / 60.0)
	energyAccount := s.accountService.GetAccountByUserAndType(session.MemberID, "energy")
	if energyAccount == nil {
		return 0, ok, errors.New(fmt.Sprintf("invalid energy account for member %v", session.MemberID))
	}
	if earned <= 0.0 {
		return 0, ok, nil
	}
	if session.EquipID > 0 {
		// 没装备也给跑了
		var equip Asset
		equip.ID = session.EquipID
		lifeDec := int(tm.Sub(from).Seconds())
		if lifeDec > session.EquipLife {
			lifeDec = session.EquipLife
		}
		if err := s.Db.Model(&equip).Update("count", gorm.Expr("count - ?", lifeDec)).Error; err != nil {
			return 0, ok, errors.New(fmt.Sprintf("cannot decrease count for equip %v", equip.ID))
		}
		session.EquipLife -= lifeDec
	}
	_, err := s.accountService.IncreaseAvailable(energyAccount, earned, fmt.Sprintf("incoming from move to earn[sid:%v]", session.ID))
	// session.Energy += float64(earned)
	log.Debugf("member %v earned %v energy, equip life = %v", session.MemberID, earned, session.EquipLife)
	s.msgMod.SendSysMessage(session.MemberID, "info-m2e-update", "en_US", time.Now().Sub(session.CreatedAt).Minutes(), session.Energy)
	return float64(earned), ok, err
}

func (s *Service) cacheSession(session *MteSession) error {

	svo := &MteSessionVO{}
	copier.Copy(svo, session)
	svo.EquipLife = int(session.Equip.Count)
	svo.EquipDueTo = time.Unix(int64(session.Equip.DueTo), 0)
	svoJson, _ := json.Marshal(svo)
	duration := s.m2eCacheLife
	log.Infof("duration = %v", duration)
	if err := s.client.Set(fmt.Sprintf("rosen/mte/session/%v", svo.MemberID), svoJson, duration).Err(); err != nil {
		log.Errorf("cannot save to redis: %v", err)
		return err
	}
	return nil
}

func (s *Service) readCachedSession(memberId uint) *MteSessionVO {

	return s._readCachedSession(fmt.Sprintf("rosen/mte/session/%v", memberId))
}

func (s *Service) _readCachedSession(key string) *MteSessionVO {

	svo := &MteSessionVO{}
	res := s.client.Get(key)
	if err := res.Err(); err != nil {
		log.Errorf("cannot read cached session: %v", err)
		return nil
	}
	jsonStr := res.Val()
	if err := json.Unmarshal([]byte(jsonStr), svo); err != nil {
		log.Errorf("cannot unmarshal json string: %v", err)
		return nil
	}
	return svo
}

func (s *Service) updateCachedSession(session *MteSessionVO) error {

	svoJson, _ := json.Marshal(session)
	duration := s.m2eCacheLife
	if err := s.client.Set(fmt.Sprintf("rosen/mte/session/%v", session.MemberID), svoJson, duration).Err(); err != nil {
		log.Errorf("cannot save to redis: %v", err)
		return err
	}
	return nil
}

func (s *Service) cacheTrace(trace *MteTrace, now *time.Time) error {
	tvo := &MteTraceItemVO{}
	copier.Copy(tvo, trace)
	tvo.Timestamp = uint64(now.Unix())
	tvoJson, _ := json.Marshal(tvo)
	duration := s.m2eCacheLife
	if err := s.client.Set(fmt.Sprintf("rosen/mte/trace/%v", tvo.MemberID), tvoJson, duration).Err(); err != nil {
		log.Errorf("cannot save to redis: %v", err)
		return err
	}
	return nil
}

func (s *Service) readCachedTrace(memberId uint) *MteTraceItemVO {

	return s._readCachedTrace(fmt.Sprintf("rosen/mte/trace/%v", memberId))
}

func (s *Service) _readCachedTrace(key string) *MteTraceItemVO {

	tvo := &MteTraceItemVO{}
	res := s.client.Get(key)
	if err := res.Err(); err != nil {
		log.Errorf("cannot read cached session: %v", err)
		return nil
	}
	jsonStr := res.Val()
	if err := json.Unmarshal([]byte(jsonStr), tvo); err != nil {
		log.Errorf("cannot unmarshal json string: %v", err)
		return nil
	}
	return tvo
}

func (s *Service) clearMteSession(memberId uint) {
	s.client.Del(fmt.Sprintf("rosen/mte/session/%v", memberId))
	s.client.Del(fmt.Sprintf("rosen/mte/trace/%v", memberId))
}

func (s *Service) updateMemberPosition(memberId uint, trace *MteTrace) {
	// update member position
	pos := &MemberPosition{
		MemberRefer: memberId,
		Latitude:    trace.Latitude,
		Longitude:   trace.Longitude,
		Timestamp:   uint64(time.Now().Unix()),
	}
	if trace.RosenMember != nil {
		pos.Visible = &trace.RosenMember.ShareLocation
	}
	if err := s.SaveModel(pos); err != nil {
		log.Errorf("cannot save member position snapshot: %v", err)
	}
}
