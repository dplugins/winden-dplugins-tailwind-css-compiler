/**
 * Icon registry for the class helper.
 *
 * SVGs come straight from the lucide-static package (imported as raw text via
 * the esbuild '.svg': 'text' loader) — never hand-drawn. Keys match the `icon`
 * fields in core/helper-schema.ts.
 */

import layoutGrid from 'lucide-static/icons/layout-grid.svg';
import panelLeft from 'lucide-static/icons/panel-left.svg';
import panelBottom from 'lucide-static/icons/panel-bottom.svg';
import square from 'lucide-static/icons/square.svg';
import columns3 from 'lucide-static/icons/columns-3.svg';
import galleryHorizontal from 'lucide-static/icons/gallery-horizontal.svg';
import eyeOff from 'lucide-static/icons/eye-off.svg';
import arrowRight from 'lucide-static/icons/arrow-right.svg';
import arrowDown from 'lucide-static/icons/arrow-down.svg';
import arrowLeft from 'lucide-static/icons/arrow-left.svg';
import arrowUp from 'lucide-static/icons/arrow-up.svg';
import arrowUpRight from 'lucide-static/icons/arrow-up-right.svg';
import arrowDownRight from 'lucide-static/icons/arrow-down-right.svg';
import arrowDownLeft from 'lucide-static/icons/arrow-down-left.svg';
import arrowUpLeft from 'lucide-static/icons/arrow-up-left.svg';
import moveHorizontal from 'lucide-static/icons/move-horizontal.svg';
import wrapText from 'lucide-static/icons/wrap-text.svg';
import undo2 from 'lucide-static/icons/undo-2.svg';
import alignHJustifyStart from 'lucide-static/icons/align-horizontal-justify-start.svg';
import alignHJustifyCenter from 'lucide-static/icons/align-horizontal-justify-center.svg';
import alignHJustifyEnd from 'lucide-static/icons/align-horizontal-justify-end.svg';
import alignHSpaceBetween from 'lucide-static/icons/align-horizontal-space-between.svg';
import alignHSpaceAround from 'lucide-static/icons/align-horizontal-space-around.svg';
import alignHDistributeCenter from 'lucide-static/icons/align-horizontal-distribute-center.svg';
import alignVJustifyStart from 'lucide-static/icons/align-vertical-justify-start.svg';
import alignVJustifyCenter from 'lucide-static/icons/align-vertical-justify-center.svg';
import alignVJustifyEnd from 'lucide-static/icons/align-vertical-justify-end.svg';
import stretchVertical from 'lucide-static/icons/stretch-vertical.svg';
import baseline from 'lucide-static/icons/baseline.svg';
import alignStartVertical from 'lucide-static/icons/align-start-vertical.svg';
import alignCenterVertical from 'lucide-static/icons/align-center-vertical.svg';
import alignEndVertical from 'lucide-static/icons/align-end-vertical.svg';
import alignVSpaceBetween from 'lucide-static/icons/align-vertical-space-between.svg';
import alignVSpaceAround from 'lucide-static/icons/align-vertical-space-around.svg';
import stretchHorizontal from 'lucide-static/icons/stretch-horizontal.svg';
import paintBucket from 'lucide-static/icons/paint-bucket.svg';
import type from 'lucide-static/icons/type.svg';
import ruler from 'lucide-static/icons/ruler.svg';
import alignLeft from 'lucide-static/icons/align-left.svg';
import alignCenter from 'lucide-static/icons/align-center.svg';
import alignRight from 'lucide-static/icons/align-right.svg';
import alignJustify from 'lucide-static/icons/align-justify.svg';
import scan from 'lucide-static/icons/scan.svg';
import boxSelect from 'lucide-static/icons/box-select.svg';
import moveVertical from 'lucide-static/icons/move-vertical.svg';
import blend from 'lucide-static/icons/blend.svg';
import aperture from 'lucide-static/icons/aperture.svg';
import zap from 'lucide-static/icons/zap.svg';
import eye from 'lucide-static/icons/eye.svg';
import axis3d from 'lucide-static/icons/axis-3d.svg';
import minus from 'lucide-static/icons/minus.svg';
import alignVDistributeCenter from 'lucide-static/icons/align-vertical-distribute-center.svg';
import alignStartHorizontal from 'lucide-static/icons/align-start-horizontal.svg';
import alignCenterHorizontal from 'lucide-static/icons/align-center-horizontal.svg';
import alignEndHorizontal from 'lucide-static/icons/align-end-horizontal.svg';
import rows3 from 'lucide-static/icons/rows-3.svg';
import rows4 from 'lucide-static/icons/rows-4.svg';
import columns4 from 'lucide-static/icons/columns-4.svg';
import grid2x2 from 'lucide-static/icons/grid-2x2.svg';

export const HELPER_ICONS = {
    'layout-grid': layoutGrid,
    // The docked HTML editor's placement, in the header toolbar
    'panel-left': panelLeft,
    'panel-bottom': panelBottom,
    'square': square,
    'columns-3': columns3,
    'gallery-horizontal': galleryHorizontal,
    'eye-off': eyeOff,
    'arrow-right': arrowRight,
    'arrow-down': arrowDown,
    'arrow-left': arrowLeft,
    'arrow-up': arrowUp,
    'arrow-up-right': arrowUpRight,
    'arrow-down-right': arrowDownRight,
    'arrow-down-left': arrowDownLeft,
    'arrow-up-left': arrowUpLeft,
    'move-horizontal': moveHorizontal,
    'wrap-text': wrapText,
    'undo-2': undo2,
    'align-horizontal-justify-start': alignHJustifyStart,
    'align-horizontal-justify-center': alignHJustifyCenter,
    'align-horizontal-justify-end': alignHJustifyEnd,
    'align-horizontal-space-between': alignHSpaceBetween,
    'align-horizontal-space-around': alignHSpaceAround,
    'align-horizontal-distribute-center': alignHDistributeCenter,
    'align-vertical-justify-start': alignVJustifyStart,
    'align-vertical-justify-center': alignVJustifyCenter,
    'align-vertical-justify-end': alignVJustifyEnd,
    'stretch-vertical': stretchVertical,
    'baseline': baseline,
    'align-start-vertical': alignStartVertical,
    'align-center-vertical': alignCenterVertical,
    'align-end-vertical': alignEndVertical,
    'align-vertical-space-between': alignVSpaceBetween,
    'align-vertical-space-around': alignVSpaceAround,
    'stretch-horizontal': stretchHorizontal,
    'paint-bucket': paintBucket,
    'type': type,
    'ruler': ruler,
    'align-left': alignLeft,
    'align-center': alignCenter,
    'align-right': alignRight,
    'align-justify': alignJustify,
    'scan': scan,
    'box-select': boxSelect,
    'move-vertical': moveVertical,
    'blend': blend,
    'zap': zap,
    'eye': eye,
    'axis-3d': axis3d,
    'aperture': aperture,
    'minus': minus,
    'align-vertical-distribute-center': alignVDistributeCenter,
    'align-start-horizontal': alignStartHorizontal,
    'align-center-horizontal': alignCenterHorizontal,
    'align-end-horizontal': alignEndHorizontal,
    'rows-3': rows3,
    'rows-4': rows4,
    'columns-4': columns4,
    'grid-2x2': grid2x2,
};

export function getHelperIcon(key) {
    return HELPER_ICONS[key] || null;
}
