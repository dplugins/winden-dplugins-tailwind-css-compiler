import React from 'react';
import Title from './StyleGuide/Title';
import Color from './StyleGuide/Color';
import Typography from './StyleGuide/Typography';
import Space from './StyleGuide/Space';
import Screens from './StyleGuide/Screens';
import Shadow from './StyleGuide/Shadow';
import BorderRadius from './StyleGuide/BorderRadius';
import Width from './StyleGuide/Width';
import { useStyleGuideConfig } from '@hooks/useStyleGuideConfig';

interface StyleGuideProps {
    scssContent: string;
    jsContent: string;
    settings: Record<string, any>;
}

function StyleGuide({ scssContent, jsContent, settings }: StyleGuideProps) {
    const {
        hasConfig,
        accentColor,
        fontSizes,
        fontFamilies,
        fontWeights,
        letterSpacing,
        lineHeights,
        spacing,
        screens,
        shadows,
        borderRadius,
        widths,
    } = useStyleGuideConfig({ scssContent, jsContent });

    return (
        <div className="flex h-fit flex-auto flex-col">
            {hasConfig ? (
                <div className="p-8 styleguide-grid">
                    <Title text="Colors" link="https://tailwindcss.com/docs/customizing-colors" />
                    <Color colors={accentColor} />

                    <Title text="Typography" link="https://tailwindcss.com/docs/font-family" />
                    <Typography
                        fontSizes={fontSizes}
                        fontFamilies={fontFamilies}
                        fontWeight={fontWeights}
                        letterSpacing={letterSpacing}
                        lineHeights={lineHeights}
                    />

                    <Title text="Screens" link="https://tailwindcss.com/docs/screens" />
                    <Screens screens={screens} />

                    <Title text="Space" link="https://tailwindcss.com/docs/customizing-spacing" />
                    <Space classNames={spacing} />

                    <Title text="Widths" link="https://tailwindcss.com/docs/width" />
                    <Width widths={widths} />

                    <Title text="Border Radius" link="https://tailwindcss.com/docs/border-radius" />
                    <BorderRadius borderRadiusObj={borderRadius} />

                    <Title text="Shadows" link="https://tailwindcss.com/docs/box-shadow" />
                    <Shadow shadows={shadows} />
                </div>
            ) : (
                <div>Loading StyleGuide...</div>
            )}
        </div>
    );
}

export default StyleGuide;
