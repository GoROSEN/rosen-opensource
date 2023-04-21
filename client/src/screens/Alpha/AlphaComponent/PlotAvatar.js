import React from 'react'
import Svg, {
  Path,
  Image,
  Defs,
  ClipPath,
  LinearGradient,
  Stop,
  Circle,
} from 'react-native-svg'

const PlotAvatar = ({ image }) => {
  return (
    <Svg width="52" height="71" viewBox="0 0 59 78">
      {/* 定义边框颜色 */}
      <Defs>
        <LinearGradient
          id="linear"
          x1="31"
          y1="5"
          x2="31"
          y2="61"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#B04CFF" />
          <Stop offset="1" stopColor="#1BB9FF" />
        </LinearGradient>
      </Defs>
      {/* 定义裁剪路径 */}
      <Defs>
        <ClipPath id="clip">
          <Path d="M50.2487 12.3812L36 4.1547C32.2872 2.01111 27.7128 2.01111 24 4.1547L9.75129 12.3812C6.03848 14.5248 3.75129 18.4863 3.75129 22.7735V39.2265C3.75129 43.5137 6.03848 47.4752 9.75129 49.6188L24 57.8453C27.7128 59.9889 32.2872 59.9889 36 57.8453L50.2487 49.6188C53.9615 47.4752 56.2487 43.5137 56.2487 39.2265V22.7735C56.2487 18.4863 53.9615 14.5248 50.2487 12.3812Z" />
        </ClipPath>
      </Defs>
      {/* 需要裁剪的图片 */}
      <Image
        // x="-7%"
        height="75%"
        width="100%"
        href={image}
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#clip)"
      />
      {/* 彩色边框 */}
      <Path
        d="M50.2487 12.3812L36 4.1547C32.2872 2.01111 27.7128 2.01111 24 4.1547L9.75129 12.3812C6.03848 14.5248 3.75129 18.4863 3.75129 22.7735V39.2265C3.75129 43.5137 6.03848 47.4752 9.75129 49.6188L24 57.8453C27.7128 59.9889 32.2872 59.9889 36 57.8453L50.2487 49.6188C53.9615 47.4752 56.2487 43.5137 56.2487 39.2265V22.7735C56.2487 18.4863 53.9615 14.5248 50.2487 12.3812Z"
        stroke="url(#linear)"
        strokeWidth="4"
      />
      <Path d="M30 65L24 60H36L30 65Z" fill="#1BB9FF" />

      <Circle cx="30" cy="75" r="3" fill="#FFFFFF" />
      {/* <Circle
        cx="30"
        cy="79"
        r="4.69615"
        stroke="white"
        strokeOpacity="0.3"
        strokeWidth="0.3"
      />
      <Circle cx="30" cy="79" r="2.69231" fill="white" fillOpacity="0.3" /> */}
    </Svg>
  )
}

export default React.memo(PlotAvatar)
