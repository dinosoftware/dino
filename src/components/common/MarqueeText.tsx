/**
 * Dino Music App - MarqueeText
 * Wrapper around react-native-marquee
 */

import React from 'react';
import Marquee from 'react-native-marquee';
import { TextStyle, ViewStyle, View } from 'react-native';

interface MarqueeTextProps {
  children: string;
  style?: TextStyle;
  containerStyle?: ViewStyle;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  children,
  style,
  containerStyle,
}) => {
  return (
    <View style={containerStyle}>
      <Marquee
        style={style}
        speed={0.5}
        marqueeOnStart={true}
        loop={true}
        delay={1000}
      >
        {children}
      </Marquee>
    </View>
  );
};
