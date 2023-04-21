import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useReducer,
} from 'react'
import {
  Dimensions,
  StyleSheet,
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useSelector, useDispatch } from 'react-redux'
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps'
import * as Location from 'expo-location'
import { device, mapStyle, globalStyles } from '@/constants'
import TouchIcon from '@/components/TouchIcon'
import PlotCard from './AlphaComponent/PlotCard'
import PlotMarker from './AlphaComponent/PlotMarker'
import M2ECard from './AlphaComponent/M2ECard'
import * as TaskManager from 'expo-task-manager'
import { updataCoordinates } from '@/store/locationSlice'
import { coordinate_transform } from '@/utils'
import { Pedometer } from 'expo-sensors'
import {
  useStartM2EMutation,
  useBeatsM2EMutation,
  useEndM2EMutation,
} from '@/services/modules/m2e'
import { useGetCurrentEquipmentQuery } from '@/services/modules/equipmentlist'
import { useLazyGetNearbyPlotListQuery } from '@/services/modules/plot'
import { useLazyGetNearbyProducerListQuery } from '@/services/modules/producer'
import Popup from '@/components/Popup'

function moveCoordinatesReducer(state, action) {
  switch (action.type) {
    case 'UPDATE':
      return state.concat(action.payload)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

function initialPlotMarkersReducer(state, action) {
  switch (action.type) {
    case 'UPDATE':
      state = action.payload
      return state
    case 'CLEAR':
      return []
    default:
      return state
  }
}

// 判断点是否在矩形内
function isPointInRect(point, polygon) {
  const sw = polygon[2] //西南脚点
  const ne = polygon[1] //东北脚点
  return (
    point.longitude >= sw.longitude &&
    point.longitude <= ne.longitude &&
    point.latitude >= sw.latitude &&
    point.latitude <= ne.latitude
  )
}

// 计算缩放等级
function getZoomFromRegion(region) {
  return Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2)
}

function currentPlotMarkersReducer(state, action) {
  const layer = getZoomFromRegion(action.payload.region)

  const transformdCoords = coordinate_transform.wgs2gcj(
    action.payload.region.latitude,
    action.payload.region.longitude,
  )

  let centerLatitude = transformdCoords.lat
  let centerLongitude = transformdCoords.lng
  let halfLatitudeDelta = action.payload.region.latitudeDelta / 2
  let halfLongitudeDelta = action.payload.region.longitudeDelta / 2
  // 左上角
  let upperLeft = {
    latitude: centerLatitude + halfLatitudeDelta,
    longitude: centerLongitude - halfLongitudeDelta,
  }
  // 右上角
  let upperRight = {
    latitude: centerLatitude + halfLatitudeDelta,
    longitude: centerLongitude + halfLongitudeDelta,
  }
  // 左下角
  let lowerLeft = {
    latitude: centerLatitude - halfLatitudeDelta,
    longitude: centerLongitude - halfLongitudeDelta,
  }
  // 右下角
  let lowerRight = {
    latitude: centerLatitude - halfLatitudeDelta,
    longitude: centerLongitude + halfLongitudeDelta,
  }
  let markers = []
  switch (action.type) {
    case 'UPDATE':
      action.payload.initialPlotMarkers.forEach(item => {
        if (
          isPointInRect({ latitude: item.lat, longitude: item.lng }, [
            upperLeft,
            upperRight,
            lowerLeft,
            lowerRight,
          ]) &&
          layer > item.layer
        ) {
          markers.push(item)
        }
      })
      // console.log(markers)
      state = markers
      return state
    case 'CLEAR':
      return []
    default:
      return state
  }
}

function producerMarkersReducer(state, action) {
  switch (action.type) {
    case 'UPDATE':
      return state.concat(action.payload)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

const avatarBgMap = [
  require('@/assets/images/avatar_default_bg.png'),
  require('@/assets/images/avatar_level1_bg.png'),
  require('@/assets/images/avatar_level2_bg.png'),
]

const screenHeight = Dimensions.get('screen').height
const screenWidth = Dimensions.get('screen').width

const Alpha = ({ navigation, route }) => {
  const dispatch = useDispatch()
  const userInfo = useSelector(state => state.authUser.userInfo)
  const initialCoordinates = useSelector(state => state.location.coordinates)
  const mapRef = useRef(null)
  const m2eId = useRef(null)
  const regionChanged = useRef(false)

  const [startM2ETrigger] = useStartM2EMutation()
  const [endM2ETrigger] = useEndM2EMutation()
  const [beatsM2ETrigger] = useBeatsM2EMutation()
  const [fetchPlotListTrigger] = useLazyGetNearbyPlotListQuery()
  const [fetchProducerListTrigger] = useLazyGetNearbyProducerListQuery()
  const { data: currentEquipment = {} } = useGetCurrentEquipmentQuery({
    refetchOnMountOrArgChange: true,
  })
  const [initialRegion] = useState({
    latitudeDelta: 1 * (screenHeight / screenWidth),
    longitudeDelta: 1,
    ...initialCoordinates,
  })
  const [coordinates, setCoords] = useState(initialCoordinates)
  const [moveCoordinates, moveCoordinatesDispatch] = useReducer(
    moveCoordinatesReducer,
    [],
  )
  const [initialPlotMarkers, initialPlotMarkersDispatch] = useReducer(
    initialPlotMarkersReducer,
    [],
  )
  const [currentPlotMarkers, currentPlotMarkersDispatch] = useReducer(
    currentPlotMarkersReducer,
    [],
  )

  // console.log(plotMarkers)
  const [producerMarkers, producerMarkersDispatch] = useReducer(
    producerMarkersReducer,
    [],
  )

  const [zoomLevel, setZoomLevel] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const [popupContent, setPopupContent] = useState('')
  const [showPlotCardFlag, setShowPlotCardFlag] = useState(false)
  const [m2eStartFlag, setM2eStartFlag] = useState(false)
  const [plotId, setPlotId] = useState()

  const [m2eEndFlag, setM2eEndFlag] = useState(false)
  const [currentEarn, setCurrentEarn] = useState(0)

  // 获取用户当前位置
  const [foregroundSubscription, setForegroundSubscription] = useState()

  // 定位到用户当前位置
  const gotToMyLocation = React.useCallback(() => {
    mapRef.current?.animateToRegion(
      {
        latitudeDelta: 0.01 * (screenHeight / screenWidth),
        longitudeDelta: 0.01,
        ...coordinates,
      },
      2000,
    )
  }, [coordinates])

  // 显示地块信息
  const handlePlotCardShow = React.useCallback(
    params => {
      // move to earn的时候不能点击
      if (m2eStartFlag) {
        return
      }

      if (params.event) {
        // 阻止事件冒泡
        params.event.stopPropagation()
        // 让点击坐标移动到地图中心
        const coordinate = params.event.nativeEvent.coordinate
        mapRef.current?.animateToRegion(
          {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            latitudeDelta: 0.3 * (screenHeight / screenWidth),
            longitudeDelta: 0.3,
          },
          500,
        )
      }

      if (params.lat && params.lng) {
        mapRef.current?.animateToRegion(
          {
            latitude: params.lat,
            longitude: params.lng,
            latitudeDelta: 0.3 * (screenHeight / screenWidth),
            longitudeDelta: 0.3,
          },
          1300,
        )
      }

      // 显示地块信息卡片
      setPlotId(params.plotId)
      setShowPlotCardFlag(true)
    },
    [m2eStartFlag],
  )

  // 后台追踪实时位置 ===========================================================================
  const LOCATION_TASK_NAME = 'Backgroudloc'

  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    console.log('defined task')
    if (error) {
      console.error(error)
      return
    }
    if (data) {
      // Extract location coordinates from data
      const { locations } = data
      const location = locations[0]
      if (location) {
        const transformdCoords = coordinate_transform.wgs2gcj(
          location.coords.latitude,
          location.coords.longitude,
        )
        console.log('Location in background', location.coords)
        moveCoordinatesDispatch({
          type: 'UPDATE',
          payload: [
            {
              latitude: transformdCoords.lat,
              longitude: transformdCoords.lng,
            },
          ],
        })
        beatsM2ETrigger({
          lat: transformdCoords.lat,
          lng: transformdCoords.lng,
          timestamp: new Date().getTime(),
          mteId: m2eId.current,
        }).then(earnings => {
          console.log(earnings)
          if (earnings.data.code !== 20000) {
            console.log('code', earnings.data.code)
            console.log('warning')
            setM2eEndFlag(true)
            handlePopupShow(earnings.data.msg)
          }
          setCurrentEarn(earnings.data.data.energy.toFixed(2))
          console.log('backgroundthing', earnings)
        })

        console.log('background working')
        setCoords({
          latitude: transformdCoords.lat,
          longitude: transformdCoords.lng,
        })
      }
    }
  })

  const startLocationUpdate = React.useCallback(() => {
    const startBackgroundUpdate = async () => {
      // Don't track position if permission is not granted
      const { granted } = await Location.getBackgroundPermissionsAsync()
      if (!granted) {
        console.log('location tracking denied, start foreground tracking')
        startForegroundUpdate()
        return
      }

      // Make sure the task is defined otherwise do not start tracking
      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME)
      if (!isTaskDefined) {
        console.log('Task is not defined')
        return
      }

      // Don't track if it is already running in background
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME,
      )
      if (hasStarted) {
        console.log('Already started')
        return
      }

      Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        // For better logs, we set the accuracy to the most sensitive option
        accuracy: Location.Accuracy.BestForNavigation,
        activityType: 2,
        // Make sure to enable this notification if you want to consistently track in the background
        showsBackgroundLocationIndicator: true,
        deferredUpdatesInterval: 30000,
        deferredUpdatesDistance: 50,
        deferredUpdatesTimeout: 10000,
        foregroundService: {
          notificationTitle: 'Location',
          notificationBody: 'Location tracking in background',
          notificationColor: '#fff',
        },
      })
    }
    startBackgroundUpdate()
  }, [startForegroundUpdate])

  // Stop location tracking in background
  const stopBackgroundUpdate = React.useCallback(() => {
    Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
      .then(hasStarted => {
        hasStarted
          ? Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
          : foregroundSubscription?.remove()
      })
      .then(() => {
        endM2ETrigger({
          lat: coordinates.latitude,
          lng: coordinates.longitude,
          timestamp: new Date().getTime(),
          mteId: m2eId.current,
        }).then(data => {
          setCurrentEarn(data.data.data.energy.toFixed(2))
          console.log(data.data.data.energy)
          moveCoordinatesDispatch({ type: 'CLEAR' })
        })
      })
  }, [
    coordinates.latitude,
    coordinates.longitude,
    endM2ETrigger,
    foregroundSubscription,
  ])

  // ==========================================================================

  // 追踪实时位置
  const startForegroundUpdate = React.useCallback(() => {
    const start = async () => {
      // Check if foreground permission is granted
      const { granted: fgGranted } =
        await Location.getForegroundPermissionsAsync()
      if (!fgGranted) {
        return Alert.alert('Required', 'Please grant GPS Location')
      }
      // console.log('start', coordinates.latlogs)
      // Make sure that foreground location tracking is not running
      foregroundSubscription?.remove()

      // Start watching position in real-time
      let fs = await Location.watchPositionAsync(
        {
          // For better logs, we set the accuracy to the most sensitive option

          // timeInterval: 1000,
          distanceInterval: 50,
          accuracy: Location.Accuracy.BestForNavigation,
        },
        async location => {
          const transformdCoords = coordinate_transform.wgs2gcj(
            location.coords.latitude,
            location.coords.longitude,
          )

          // 更新轨迹
          moveCoordinatesDispatch({
            type: 'UPDATE',
            payload: [
              {
                latitude: transformdCoords.lat,
                longitude: transformdCoords.lng,
              },
            ],
          })
          // 发送心跳
          beatsM2ETrigger({
            lat: transformdCoords.lat,
            lng: transformdCoords.lng,
            timestamp: new Date().getTime(),
            mteId: m2eId.current,
          }).then(earnings => {
            if (earnings.data.code !== 20000) {
              console.log('warning')
            }
            console.log('beats!!!!!!!!!!', earnings)
            earnings.data.data.energy &&
              setCurrentEarn(earnings.data.data.energy.toFixed(2))
          })

          // 记录当前位置
          setCoords({
            latitude: transformdCoords.lat,
            longitude: transformdCoords.lng,
          })

          // 使地图跟随移动
          mapRef.current?.animateToRegion(
            {
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
              latitude: transformdCoords.lat,
              longitude: transformdCoords.lng,
            },
            500,
          )
        },
      )
      setForegroundSubscription(fs)
    }
    start()
  }, [beatsM2ETrigger, foregroundSubscription])

  // const stopForegroundUpdate = React.useCallback(() => {
  //   endM2ETrigger({
  //     lat: coordinates.latitude,
  //     lng: coordinates.longitude,
  //     timestamp: new Date().getTime(),
  //     mteId: m2eId.current,
  //   }).then(data => {
  //     setCurrentEarn(data.data.data.energy)
  //     console.log(data.data.data.energy)
  //     foregroundSubscription?.remove()
  //     moveCoordinatesDispatch({ type: 'CLEAR' })
  //     setM2eEndFlag(false)
  //   })
  // }, [
  //   coordinates.latitude,
  //   coordinates.longitude,
  //   endM2ETrigger,
  //   foregroundSubscription,
  // ])

  const [currentStepCount, setCurrentStepCount] = React.useState(0)
  //   const [pastStepCount, setPastStepCount] = React.useState(0)
  const [subscription, setSubscription] = React.useState(null)
  const [isPedometerAvailable, setIsPedometerAvailable] =
    React.useState('checking')
  const pedometerSubscribe = useCallback(() => {
    console.log('subscription')
    const sub = Pedometer.watchStepCount(result => {
      setCurrentStepCount(result.steps)
      beatsM2ETrigger({
        lat: coordinates.lat,
        lng: coordinates.lng,
        timestamp: new Date().getTime(),
        mteId: m2eId.current,
      }).then(earnings => {
        if (earnings.data.code !== 20000) {
          console.log('code', earnings.data.code)
          console.log('warning')
          setM2eEndFlag(true)
          handlePopupShow(earnings.data.msg)
        }
        console.log('beats!!!!!!!!!!', earnings)
        earnings.data.data.energy && setCurrentEarn(earnings.data.data.energy)
      })
    })
    setSubscription(sub)
    Pedometer.isAvailableAsync().then(
      result => {
        setIsPedometerAvailable(String(result))
      },
      error => {
        setIsPedometerAvailable('Could not get isPedometerAvailable: ' + error)
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pedometerUnsubscribe = useCallback(() => {
    subscription && subscription.remove()
    setSubscription(null)
  }, [subscription])

  const handleM2EStart = React.useCallback(() => {
    setM2eEndFlag(false)
    setM2eStartFlag(true)
    setCurrentEarn(0)
    startM2ETrigger({
      lat: coordinates.latitude,
      lng: coordinates.longitude,
      timestamp: new Date().getTime(),
    }).then(res => {
      m2eId.current = res.data.data.mteId
      startLocationUpdate()
      // startForegroundUpdate()
      setCurrentStepCount(0)
      pedometerSubscribe()
    })
  }, [
    coordinates.latitude,
    coordinates.longitude,
    pedometerSubscribe,
    startLocationUpdate,
    startM2ETrigger,
  ])

  const handleRegionChange = React.useCallback(
    region => {
      const layer = getZoomFromRegion(region)
      setZoomLevel(layer)

      currentPlotMarkersDispatch({
        type: 'UPDATE',
        payload: {
          initialPlotMarkers: initialPlotMarkers,
          region: region,
        },
      })

      regionChanged.current = true
    },
    [initialPlotMarkers],
  )

  const handleM2ECardHide = React.useCallback(() => {
    setM2eStartFlag(false)
    setM2eEndFlag(false)
    pedometerUnsubscribe()
    stopBackgroundUpdate()
    // stopForegroundUpdate()
  }, [pedometerUnsubscribe, stopBackgroundUpdate])

  const handlePopupShow = React.useCallback(content => {
    setPopupContent(content)
    setShowPopup(true)
  }, [])

  const handlePopupHide = React.useCallback(() => {
    setShowPopup(false)
  }, [])

  const handlePlotCardHide = React.useCallback(() => {
    setShowPlotCardFlag(false)
  }, [])

  // 监听安卓返回事件
  // useEffect(() => {
  //   const unsubscribe = navigation.addListener('beforeRemove', e => {
  //     console.log('beforeRemove')
  //     if (showSearchFlag) {
  //       setShowSearchFlag(false)
  //       e.preventDefault()
  //     }
  //     if (showProducerManageFlag) {
  //       setShowProducerManageFlag(false)
  //       e.preventDefault()
  //     }
  //   })
  //   return unsubscribe
  // }, [navigation, showSearchFlag, showProducerManageFlag])

  // 获取用户当前位置
  useEffect(() => {
    const getLocation = async () => {
      const { granted: fgGranted } =
        await Location.requestForegroundPermissionsAsync()
      if (!fgGranted) {
        return Alert.alert('Required', 'Please grant GPS Location')
      }
      const { granted: bgGranted } =
        await Location.requestBackgroundPermissionsAsync()

      if (!bgGranted) {
        return Alert.alert(
          'Location Access Required',
          'App requires location even when the App is backgrounded.',
        )
      }

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        maximumAge: 10000,
      })

      const transformdCoords = coordinate_transform.wgs2gcj(
        coords.latitude,
        coords.longitude,
      )
      setCoords({
        latitude: transformdCoords.lat,
        longitude: transformdCoords.lng,
      })

      // 记录上次坐标位置
      // 使下次打开能快速定位
      dispatch(
        updataCoordinates({
          latitude: transformdCoords.lat,
          longitude: transformdCoords.lng,
        }),
      )

      // 初始化定位之后再移动到精确位置
      // 如果用户已经移动过地图则不再移动位置
      if (!regionChanged.current) {
        mapRef.current?.animateToRegion(
          {
            latitude: transformdCoords.lat,
            longitude: transformdCoords.lng,
            latitudeDelta: 1,
            longitudeDelta: 1,
          },
          2000,
        )
      }
    }

    // 等页面切换进来之后再跳出授权提示
    setTimeout(() => {
      getLocation().catch(console.error)
    }, 1000)
  }, [dispatch])

  // 唤起plot和m2e浮层
  useEffect(() => {
    const { params = {} } = route

    if (params.showPlotCard) {
      handlePlotCardShow({
        plotId: params.plotId,
        lat: params.lat,
        lng: params.lng,
      })
    }

    if (params.m2eStart) {
      handleM2EStart()
    }
  }, [handleM2EStart, handlePlotCardShow, route])

  // 初始化Plot数据
  useEffect(() => {
    fetchPlotListTrigger({
      lat: initialCoordinates.latitude,
      lng: initialCoordinates.longitude,
      radius: 150000,
    }).then(res => {
      if (res.data) {
        initialPlotMarkersDispatch({
          type: 'UPDATE',
          payload: res.data,
        })
        currentPlotMarkersDispatch({
          type: 'UPDATE',
          payload: {
            initialPlotMarkers: res.data,
            region: initialRegion,
          },
        })
      }
    })

    fetchProducerListTrigger({
      lat: initialCoordinates.latitude,
      lng: initialCoordinates.longitude,
      radius: 150000,
    }).then(res => {
      if (res.data) {
        producerMarkersDispatch({
          type: 'UPDATE',
          payload: res.data,
        })
      }
    })

    const zL = getZoomFromRegion({
      longitudeDelta: 1,
    })
    setZoomLevel(zL)
  }, [
    fetchPlotListTrigger,
    fetchProducerListTrigger,
    initialCoordinates.latitude,
    initialCoordinates.longitude,
    initialRegion,
  ])

  // useEffect(() => {
  //   if (mapRef) {
  //     setTimeout(() => {
  //       mapRef.current.fitToSuppliedMarkers(
  //         currentPlotMarkers.map(({ id }) => String(id)),
  //         {
  //           edgePadding: { bottom: 200, right: 50, top: 200, left: 50 },
  //           animated: true,
  //         },
  //       )
  //     }, 500)
  //   }
  // }, [mapRef, currentPlotMarkers])

  return (
    <View style={[globalStyles.container]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        initialRegion={initialRegion}
        showsMyLocationButton={false}
        followsUserLocation={true}
        showsCompass={false}
        toolbarEnabled={false}
        style={styles.map}
        onRegionChangeComplete={handleRegionChange}
      >
        <Marker
          coordinate={{
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          }}
        >
          <ImageBackground
            source={avatarBgMap[currentEquipment.imgindex || 0]}
            style={[
              styles.mapMarkerAvatarBg,
              styles['mapMarkerAvatarBg' + (currentEquipment.imgindex || 0)],
            ]}
          >
            <View
              style={[
                styles.mapMarkerAvatarWrap,
                styles[
                  'mapMarkerAvatarWrap' + (currentEquipment.imgindex || 0)
                ],
              ]}
            >
              <Image
                source={{
                  uri: `${userInfo?.member.avatar}?x-oss-process=style/p_10`,
                }}
                style={styles.mapMarkerAvatarImage}
              />
            </View>
          </ImageBackground>
        </Marker>
        {m2eStartFlag && (
          <Polyline
            coordinates={moveCoordinates}
            strokeColor="#B04CFF"
            strokeWidth={4}
          />
        )}
        {/* {producerMarkers.map((marker, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: marker.lat,
              longitude: marker.lon,
            }}
            onPress={event => showPlotCard(event)}
          >
            <ImageBackground
              source={require('@/assets/images/avatar_bg.png')}
              style={styles.mapMarkerAvatarBg}
            >
              <View style={styles.mapMarkerAvatarWrap}>
                <Image
                  source={{uri: `${marker.avatar}?x-oss-process=style/p_20`}}
                  style={styles.mapMarkerAvatarImage}
                />
              </View>
            </ImageBackground>
          </Marker>
        ))} */}
        {currentPlotMarkers.map((marker, index) => (
          <PlotMarker
            key={marker.id}
            id={String(marker.id)}
            coordinate={{
              latitude: marker.lat,
              longitude: marker.lng,
            }}
            style={marker.style}
            logo={marker.logo}
            onPress={handlePlotCardShow}
          />
        ))}
      </MapView>
      {!m2eStartFlag && (
        <TouchableOpacity
          style={styles.avatar}
          activeOpacity={0.8}
          onPress={() => {
            navigation.navigate('PersonalCell')
          }}
        >
          <ImageBackground
            source={avatarBgMap[currentEquipment.imgindex || 0]}
            style={[
              styles.avatarBg,
              styles['avatarBg' + (currentEquipment.imgindex || 0)],
            ]}
          >
            <View
              style={[
                styles.avatarWrap,
                styles['avatarWrap' + (currentEquipment.imgindex || 0)],
              ]}
            >
              <Image
                source={{
                  uri: `${userInfo?.member.avatar}?x-oss-process=style/p_20`,
                }}
                style={styles.avatarImage}
              />
            </View>
          </ImageBackground>
        </TouchableOpacity>
      )}
      <View style={styles.menuBar}>
        {!m2eStartFlag && (
          <TouchIcon
            iconName="search"
            iconSize={20}
            onPress={() => navigation.navigate('Search')}
            style={[styles.menuIcon]}
          />
        )}
        {!m2eStartFlag && (
          <TouchIcon
            iconName="rosen_manage"
            iconSize={20}
            onPress={() => navigation.navigate('Dashboard')}
            style={[styles.menuIcon]}
          />
        )}
        {!m2eStartFlag && (
          <TouchIcon
            iconName="producer_manage"
            iconSize={20}
            onPress={() => navigation.navigate('Equipment')}
            style={[styles.menuIcon]}
          />
        )}
        {!m2eStartFlag && (
          <TouchIcon
            iconName="blazer_manage"
            iconSize={20}
            onPress={() => navigation.navigate('BlazerManage')}
            style={[styles.menuIcon]}
          />
        )}
        <TouchIcon
          iconName="navigator"
          iconSize={20}
          onPress={() => gotToMyLocation()}
          style={[styles.menuIcon]}
        />
        {/* <View style={[styles.menuIcon, styles.menuIconZoomLevel]}>
          <Text style={styles.menuIconZoomLevelText}>{zoomLevel}</Text>
        </View> */}
      </View>

      <PlotCard
        show={showPlotCardFlag}
        plotId={plotId}
        onHide={handlePlotCardHide}
        onMessage={handlePopupShow}
      />

      <M2ECard
        show={m2eStartFlag}
        onHide={handleM2ECardHide}
        earningRate={currentEquipment.earnRate}
        remainingTime={currentEquipment.life}
        currentEarn={currentEarn}
        end={m2eEndFlag}
      />

      <Popup
        visible={showPopup}
        content={popupContent}
        confirmButton={handlePopupHide}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    height: device.height + 90,
    width: device.width,
    marginTop: -30,
    marginBottom: -60,
  },
  mapMarkerAvatarBg: {
    width: 30,
    height: 33,
    position: 'relative',
  },
  mapMarkerAvatarBg0: {
    width: 32,
    height: 32,
    resizeMode: 'cover',
  },
  mapMarkerAvatarWrap: {
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 6,
    left: 3,
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  mapMarkerAvatarWrap0: {
    top: 4,
    left: 4,
  },
  mapMarkerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  mapMarkerPlotImage: {
    width: 40,
    height: 40,
  },
  avatar: {
    position: 'absolute',
    top: 50,
    left: 16,
  },
  avatarBg: {
    width: 64,
    height: 71,
  },
  avatarBg0: {
    width: 62,
    height: 62,
  },
  avatarWrap: {
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 13,
    left: 7,
    // right: 11,
    // bottom: 9,
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarWrap0: {
    top: 6,
    left: 6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  menuBar: {
    alignItems: 'center',
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
  },
  menuIcon: {
    borderRadius: 18,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 36,
    marginBottom: 15,
    color: '#ffffff',
  },
  menuIconZoomLevel: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconZoomLevelText: {
    color: '#ff6600',
    fontWeight: 'bold',
  },
  plotPanelMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
})

export default Alpha
