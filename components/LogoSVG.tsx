import Svg, { Defs, LinearGradient, Stop, Path, Circle, Rect, G } from "react-native-svg";

interface Props {
  size?: number;
}

export default function LogoSVG({ size = 48 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#00D4FF" />
          <Stop offset="1" stopColor="#6C47FF" />
        </LinearGradient>
        <LinearGradient id="grad2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#00D4FF" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#6C47FF" stopOpacity="0.3" />
        </LinearGradient>
      </Defs>

      {/* Background rounded square */}
      <Rect x="0" y="0" width="48" height="48" rx="14" fill="url(#grad)" />

      {/* Signal rings */}
      <Circle cx="24" cy="21" r="13" fill="none" stroke="white" strokeWidth="1.2" strokeOpacity="0.2" />
      <Circle cx="24" cy="21" r="9" fill="none" stroke="white" strokeWidth="1.2" strokeOpacity="0.3" />

      {/* Location pin */}
      <G>
        {/* Pin body */}
        <Path
          d="M24 10 C19.6 10 16 13.6 16 18 C16 23.5 24 34 24 34 C24 34 32 23.5 32 18 C32 13.6 28.4 10 24 10 Z"
          fill="white"
          fillOpacity="0.95"
        />
        {/* Inner circle */}
        <Circle cx="24" cy="18" r="4" fill="url(#grad)" />
        {/* Center dot */}
        <Circle cx="24" cy="18" r="1.5" fill="white" />
      </G>

      {/* Bottom pulse bar */}
      <Rect x="14" y="38" width="20" height="2.5" rx="1.25" fill="white" fillOpacity="0.3" />
      <Rect x="19" y="38" width="10" height="2.5" rx="1.25" fill="white" fillOpacity="0.6" />
    </Svg>
  );
}
