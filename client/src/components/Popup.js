import { View, Text, Modal, StyleSheet, ImageBackground } from 'react-native'
import * as React from 'react'
import Button from './Button'
import { useTranslation } from 'react-i18next'

const ModalComp = ({
  title,
  content,
  cancelButton,
  confirmButton,
  visible,
  open,
  textStyle,
  textComponent,
  height,
  width,
  isLoading,
}) => {
  const [modalVisible, setModalVisible] = React.useState(false)
  const openModalWin = () => {
    setModalVisible(true)
  }

  const closeModalWin = () => {
    visible = false
  }
  const { t, i18n } = useTranslation()
  return (
    <Modal
      animationType="fade" // 指定了 modal 的动画类型。类型：slide 从底部滑入滑出|fade 淡入淡出|none 没有动画
      transparent={true} // 背景是否透明，默认为白色，当为true时表示背景为透明。
      visible={visible} // 是否显示 modal 窗口
      onRequestClose={() => {
        closeModalWin()
      }} // 回调会在用户按下 Android 设备上的后退按键或是 Apple TV 上的菜单键时触发。请务必注意本属性在 Android 平台上为必填，且会在 modal 处于开启状态时阻止BackHandler事件
    >
      <View style={styles.modalLayer}>
        <View style={[styles.modalContainer, { height: height, width: width }]}>
          <ImageBackground
            source={require('@/assets/images/rosen_background.png')}
            imageStyle={styles.rosenBackgroud}
            resizeMode={'contain'}
            style={styles.contentStyle}
          >
            {textComponent ? (
              textComponent
            ) : (
              <Text style={textStyle ? textStyle : styles.contentTextStyle}>
                {content}
              </Text>
            )}
            <View style={styles.modalButtonStyle}>
              {cancelButton && (
                <Button
                  style={styles.button}
                  type={'hollow'}
                  onPress={cancelButton}
                  size={'middle'}
                >
                  {t('page.common.cancel')}
                </Button>
              )}
              {confirmButton && (
                <Button
                  style={styles.button}
                  onPress={confirmButton}
                  size={'middle'}
                  loading={isLoading}
                >
                  {t('page.common.confirm')}
                </Button>
              )}
            </View>
          </ImageBackground>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  contentTextStyle: {
    textAlign: 'center',
    fontSize: 20,
    color: 'white',
    fontWeight: '700',
    alignSelf: 'center',
  },
  contentStyle: {
    padding: 18,
    marginVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  button: {
    width: 90,
    marginVertical: 8,
    marginHorizontal: 12,
  },
  rosenBackgroud: {
    left: 120,
  },
  modalLayer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#232631',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 30,
    overflow: 'hidden',
    flexDirection: 'column',
    maxHeight: '60%',
    maxWidth: '80%',
  },
  modalTitleStyle: {
    textAlign: 'center',
    fontSize: 20,
    color: 'white',
  },
  modalButtonStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
    top: 10,
  },
})

export default React.memo(ModalComp)
