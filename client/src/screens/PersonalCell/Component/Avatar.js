import React from 'react'
import Svg, {
  Path,
  Image,
  Defs,
  ClipPath,
  LinearGradient,
  Stop,
} from 'react-native-svg'

const Avatar = ({ image }) => {
  return (
    <Svg width="103.92" height="120" viewBox="0 0 116 130">
      {/* 定义边框颜色 */}
      <Defs>
        <LinearGradient
          id="linear"
          x1="58"
          y1="5"
          x2="58"
          y2="125"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#5A8CFF" />
          <Stop offset="1" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* 定义裁剪路径 */}
      <Defs>
        <ClipPath id="clip">
          <Path d="M64.5 5.28868C60.4778 2.96645 55.5222 2.96645 51.5 5.28867L9.53848 29.5152C5.51626 31.8374 3.03848 36.129 3.03848 40.7735V89.2265C3.03848 93.8709 5.51626 98.1626 9.53847 100.485L51.5 124.711C55.5222 127.034 60.4778 127.034 64.5 124.711L106.462 100.485C110.484 98.1626 112.962 93.871 112.962 89.2265V40.7735C112.962 36.1291 110.484 31.8374 106.462 29.5152L64.5 5.28868Z" />
        </ClipPath>
      </Defs>
      {/* 需要裁剪的图片 */}
      <Image
        height="100%"
        width="100%"
        href={image}
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#clip)"
      />
      {/* 彩色边框 */}
      <Path
        d="M64.5 5.28868C60.4778 2.96645 55.5222 2.96645 51.5 5.28867L9.53848 29.5152C5.51626 31.8374 3.03848 36.129 3.03848 40.7735V89.2265C3.03848 93.8709 5.51626 98.1626 9.53847 100.485L51.5 124.711C55.5222 127.034 60.4778 127.034 64.5 124.711L106.462 100.485C110.484 98.1626 112.962 93.871 112.962 89.2265V40.7735C112.962 36.1291 110.484 31.8374 106.462 29.5152L64.5 5.28868Z"
        stroke="url(#linear)"
        strokeWidth="6"
      />
    </Svg>
  )
}

export default React.memo(Avatar)
