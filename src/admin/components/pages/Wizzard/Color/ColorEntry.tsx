import React, { useEffect, useState, useContext } from "react";
import clsx from 'clsx';
import { Colorful } from "@uiw/react-color";
import tinycolor from "tinycolor2";
import RgbSliders from "./SlidersRGB";
import HslSliders from "./SlidersHSL";
import ShadeSliders from "./ShadeSliders";
import { colorModeChangeRGB, handleHslChange, parseColorInput, getColorDisplayString } from "./colorModelsConvert";
import generateShades from "./generateShades";
import ShadesList from "./ShadesList";
import ColorSwatch from "./ColorSwatch";
import ColorSwatchEditor from "./ColorSwatchEditor";
import { closest } from "color-2-name";
import { Button } from "@el/Button";
import { Input } from "@el/Input";
import InputWithResetButton from "@el/InputWithResetButton";
import { Label } from "@el/Label";
import { Checkbox } from "@el/Checkbox";
import { ReactComponent as LockOutlinedIcon } from "@/assets/icons/LockOutlinedIcon.svg";
import { ReactComponent as LockOpenOutlinedIcon } from "@/assets/icons/LockOpenOutlinedIcon.svg";
import { ReactComponent as DeleteOutlineOutlinedIcon } from "@/assets/icons/DeleteOutlineOutlinedIcon.svg";
import { Wrapper } from "../components/layout/Layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@el/Select";
import { WizzardContext } from "@hooks/wizzardContext";
import type { ColorEntry as ColorEntryType, ColorShade } from "@/types/wizzard";

interface RGB {
	r: number;
	g: number;
	b: number;
	a?: number;
}

interface HSL {
	h: number;
	s: number;
	l: number;
}

interface DividerProps {
	className?: string;
}

/**
 * Reusable Divider component
 */
const Divider: React.FC<DividerProps> = ({ className = "" }) => {
	return (
		<div className={`bg-border w-[2px] min-w-[2px] h-full ${className}`} />
	);
};

interface ColorEntryProps {
	/** Color entry data */
	entry: ColorEntryType;
	/** Callback to remove this color entry */
	onRemove: () => void;
	/** Callback to update color entry data */
	updateColorEntry: (id: number, updatedEntry: Partial<ColorEntryType>) => void;
	/** Callback when editing state changes */
	onEditingChange: (isEditing: boolean, id: number) => void;
}

/**
 * Color entry component for managing individual colors with shades
 * Supports multiple color formats (hex, rgb, hsl, oklch) and shade generation
 */
const ColorEntry: React.FC<ColorEntryProps> = ({ entry, onRemove, updateColorEntry, onEditingChange }) => {
	const { localWizzardState, setLocalWizzardState } = useContext(WizzardContext);
	const [color, setColor] = useState<RGB>(tinycolor(entry.hex).toRgb());
	const [hsl, setHsl] = useState<HSL>(tinycolor(entry.hex).toHsl());
	const [shades, setShades] = useState<number>(entry?.shades?.length ?? 10);
	const [minLightness, setMinLightness] = useState<number>(entry.minLightness ?? 5);
	const [maxLightness, setMaxLightness] = useState<number>(entry.maxLightness ?? 95);
	const [inputValue, setInputValue] = useState<string>(
		(entry as any).utilityValue || getColorDisplayString(entry.hex, entry.colorFormat || "hex")
	);
	const [colorName, setColorName] = useState<string>(entry?.name || "Unknown");
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [shadesList, setShadesList] = useState<ColorShade[]>(entry.shades || []);
	const [isLocked, setIsLocked] = useState<boolean>(entry.isLocked || false);
	const [isExpanded, setIsExpanded] = useState<boolean>(false);
	const [colorFormat, setColorFormat] = useState<'hex' | 'rgb' | 'hsl' | 'oklch'>(entry.colorFormat || "hex");
	const [enableShades, setEnableShades] = useState<boolean>(entry.enableShades !== undefined ? entry.enableShades : true);
	const [reverseShades, setReverseShades] = useState<boolean>(entry.reverseShades !== undefined ? entry.reverseShades : false);

	// Check if this is a system-locked color (utility, FSE, Bricks, Oxygen)
	const isSystemLocked = (entry as any).locked === true;
	const colorSource = (entry as any).isUtility ? 'Utility'
		: (entry as any).isFSE ? 'FSE'
		: (entry as any).isBricks ? 'Bricks'
		: (entry as any).isOxygen ? 'Oxygen'
		: null;

	// Check if this is a special utility value (transparent, currentColor, inherit) that should show text placeholder
	const isSpecialUtility = (entry as any).utilityValue &&
		['transparent', 'currentColor', 'inherit'].includes((entry as any).utilityValue);

	// Derive activeTab from colorFormat
	const activeTab = colorFormat === "rgb" ? "RGB" : "HSL";

	useEffect(() => {
		try {
			const hsl = tinycolor(entry.hex)
				.toHslString()
				.split("(")[1]
				.split(")")[0]
				.split(",")
				.map((e) => e.trim().split("%")[0]);
			setHsl({
				h: Math.round(parseFloat(hsl[0])),
				s: Math.round(parseFloat(hsl[1])),
				l: Math.round(parseFloat(hsl[2])),
			});
		} catch (error) {
			const tinyHsl = tinycolor(entry.hex).toHsl();
			setHsl({
				h: Math.round(tinyHsl.h),
				s: Math.round(tinyHsl.s * 100),
				l: Math.round(tinyHsl.l * 100),
			});
		}
	}, [entry.hex]);

	// Update input value when entry hex or color format changes
	useEffect(() => {
		setInputValue(getColorDisplayString(entry.hex, colorFormat));
	}, [entry.hex, colorFormat]);

	// Keep local shades list in sync with the entry coming from context/store
	useEffect(() => {
		if (entry.shades) {
			setShadesList(entry.shades);
		}
	}, [entry.shades]);

	// Update entry when color format changes (and other props)
	useEffect(() => {
		updateColorEntry(entry.id, { ...entry, name: colorName, isLocked, colorFormat, enableShades, reverseShades });
	}, [colorName, isLocked, colorFormat, enableShades, reverseShades]);

	const updateShades = (
		color: string,
		shades: number,
		minLightness: number,
		maxLightness: number,
		updatedEntry: Partial<ColorEntryType> | null = null
	) => {
		const generatedShades = generateShades(
			color,
			shades,
			minLightness,
			maxLightness
		).map((generatedShade, idx) => {
			const existingShade = shadesList[idx] || {};
			return {
				name: `${(idx + 1) * 100}`,
				hex: generatedShade,
				isEnabled:
					existingShade.isEnabled !== undefined
						? existingShade.isEnabled
						: true,
				isDefault:
					existingShade.isDefault !== undefined
						? existingShade.isDefault
						: false,
			};
		});

		setShadesList(generatedShades);

		// When main color changes, we generate completely new shades
		// These become the new "original" baseline - no modifications tracked
		const newOriginalGeneratedColors = generatedShades.map(shade => shade.hex);

		// Create the updated entry with new shades and reset original colors
		const entryUpdate: Partial<ColorEntryType> = updatedEntry
			? {
				...updatedEntry,
				shades: generatedShades,
				originalGeneratedColors: newOriginalGeneratedColors,
				minLightness,
				maxLightness,
				isLocked,
				colorFormat
			}
			: {
				...entry,
				shades: generatedShades,
				originalGeneratedColors: newOriginalGeneratedColors,
				minLightness,
				maxLightness,
				isLocked,
				colorFormat
			};

		// Add a flag to indicate this is a main color change (for ShadesList to reset tracking)
		entryUpdate.isMainColorChange = true;

		updateColorEntry(entry.id, entryUpdate);
	};

	const updateColor = (newColor: RGB) => {
		const hexColor = tinycolor(newColor).toHexString();
		// Round color values to prevent long decimals
		const roundedColor: RGB = {
			r: Math.round(newColor.r || 0),
			g: Math.round(newColor.g || 0),
			b: Math.round(newColor.b || 0),
			a: Math.round((newColor.a || 1) * 100) / 100,
		};
		setColor(roundedColor);
		// Update input value to show color in selected format
		setInputValue(getColorDisplayString(hexColor, colorFormat));
		if (!isLocked) {
			setColorName(closest(hexColor).name || "Unknown");
		}
		updateShades(hexColor, shades, minLightness, maxLightness, {
			...entry,
			name: isLocked ? entry.name : closest(hexColor).name || "Unknown",
			hex: hexColor,
			isLocked,
			colorFormat,
		});
	};

	// Update input value when color format changes
	useEffect(() => {
		if (color) {
			const hexColor = tinycolor(color).toHexString();
			setInputValue(getColorDisplayString(hexColor, colorFormat));
		}
	}, [colorFormat, color]);

	const handleColorInputChange = (value: string) => {
		// Try parsing with enhanced parser
		const parsedColor = parseColorInput(value);

		if (parsedColor && parsedColor.isValid()) {
			// Valid color format detected
			updateColor(parsedColor.toRgb());
		} else {
			// Try color name lookup as fallback
			const nameColor = closest(value).hex;
			if (nameColor) {
				const color = tinycolor(nameColor);
				if (color.isValid()) {
					updateColor(color.toRgb());
					return;
				}
			}

			// Keep the input value for user to continue typing
			setInputValue(value);
			setColorName("Invalid Color");
		}
	};

	const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		handleColorInputChange(e.target.value.trim());
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleColorInputChange(e.currentTarget.value.trim());
		}
	};

	const handleColorChange = (newColor: { hex: string }) => {
		updateColor(tinycolor(newColor.hex).toRgb());
	};

	const handleClose = () => {
		setIsEditing(false);
		onEditingChange(false, entry.id);
	};

	const handleColorNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setColorName(e.target.value);
	};

	const handleEdit = () => {
		setIsEditing(true);
		onEditingChange(true, entry.id);
	};

	const handleDelete = () => {
		const confirmed = window.confirm(`Are you sure you want to delete the color "${colorName}"?`);
		if (confirmed) {
			onRemove();
			handleClose();
		}
	};

	const toggleLock = () => {
		setIsLocked(!isLocked);
	};

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	/**
	 * Get format-specific placeholder text
	 */
	const getPlaceholderText = (format: string): string => {
		switch (format) {
			case 'hex':
				return '#527C9D';
			case 'rgb':
				return 'rgb(82 124 157)';
			case 'hsl':
				return 'hsl(206deg 31% 47%)';
			case 'oklch':
				return 'oklch(0.57 0.12 206)';
			default:
				return '#527C9D';
		}
	};

	/**
	 * Check if current input is valid
	 */
	const isValidColorInput = (value: string): boolean => {
		const parsedColor = parseColorInput(value);
		return parsedColor !== null && parsedColor.isValid();
	};

	return (
		<>
			<div className={clsx(
				"flex flex-col p-2 last:border-b-0",
				isExpanded && "border-b border-input"
			)}>

				<div className="flex flex-col gap-2 w-full">

					<div className="flex gap-4">

						<div className="flex items-center w-full border border-input rounded-md">
							{isSpecialUtility ? (
								<div className="h-10 w-12 min-w-12 rounded-md flex items-center justify-center bg-base-2 text-muted-foreground text-xs font-mono ml-[1px]">
									{(entry as any).utilityValue === 'transparent' ? 'TR' :
									 (entry as any).utilityValue === 'currentColor' ? 'CC' : 'IN'}
								</div>
							) : (
								<ColorSwatchEditor
									color={color}
									hsl={hsl}
									activeTab={activeTab}
									setHsl={setHsl}
									setColor={setColor}
									updateColor={updateColor}
									entry={entry}
									shadesList={shadesList}
									updateColorEntry={updateColorEntry}
									title="Main Color"
									position="left-0"
									colorFormat={colorFormat}
								/>
							)}

							<div className="grow flex w-full max-w-[150px]">
								<Input
									id="hex-value"
									type="text"
									value={(entry as any).utilityValue || inputValue}
									onChange={(e) => !isSystemLocked && setInputValue(e.target.value)}
									onBlur={!isSystemLocked ? handleInputBlur : undefined}
									onKeyDown={!isSystemLocked ? handleKeyDown : undefined}
									disabled={isSystemLocked}
									className={`!border-none grow ${!isValidColorInput(inputValue) && inputValue.length > 0 ? 'text-red-500' : ''}`}
									placeholder={getPlaceholderText(colorFormat)}
									title={isSystemLocked ? `${colorSource} color (read-only)` : `Enter color in ${colorFormat.toUpperCase()} format or color name`}
								/>
							</div>

							<Divider />

							<div className="relative flex items-center grow w-full">
								<Input
									id="color-name"
									type="text"
									value={colorName}
									onChange={handleColorNameChange}
									disabled={isLocked || isSystemLocked}
									className="!border-none grow"
									title={isSystemLocked ? `${colorSource} color` : undefined}
								/>
								{colorSource && (
									<span className="absolute right-2 text-xs px-2 py-1 bg-base-3 rounded text-muted-foreground">
										{colorSource}
									</span>
								)}
								{!isSystemLocked && (
									<button onClick={toggleLock} className="absolute right-2">
										{isLocked ? (
											<LockOutlinedIcon
												style={{
													fontSize: "1.2rem",
												}}
											/>
										) : (
											<LockOpenOutlinedIcon
												style={{
													fontSize: "1.2rem",
												}}
											/>
										)}
									</button>
								)}
							</div>

							{!isSystemLocked && (
								<>
									<Divider />

									<Select value={colorFormat} onValueChange={(value) => setColorFormat(value as 'hex' | 'rgb' | 'hsl' | 'oklch')}>
										<SelectTrigger className="w-full !border-none">
											<SelectValue placeholder="Format" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="hex">HEX</SelectItem>
											<SelectItem value="rgb">RGB</SelectItem>
											<SelectItem value="hsl">HSL</SelectItem>
											<SelectItem value="oklch">OKLCH</SelectItem>
										</SelectContent>
									</Select>

									<Divider />

									<button
										onClick={toggleExpand}
										className={clsx(
											'h-full aspect-square flex items-center justify-center rounded-r-md hover:bg-base-3 hover:text-foreground',
											isExpanded && 'bg-foreground text-base'
										)}
									>
										<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M9.8457 4C10.6956 4 11.3846 4.68903 11.3848 5.53809V16.3076C11.3848 17.2869 10.9952 18.2265 10.3027 18.9189C9.61035 19.6111 8.67142 20 7.69238 20C6.71312 20 5.7735 19.6114 5.08105 18.9189C4.38861 18.2265 4 17.2869 4 16.3076V5.53809C4.0002 4.68833 4.68915 4.0002 5.53809 4H9.8457ZM18.4609 12.6152C19.31 12.6152 19.9998 13.3035 20 14.1533V18.4619C19.9997 19.3109 19.3108 20 18.4609 20H10.9482C11.0254 19.9327 11.1 19.8621 11.1738 19.7891L18.3467 12.6152H18.4609ZM7.69238 15.3848C7.4476 15.3848 7.21314 15.4822 7.04004 15.6553C6.86695 15.8284 6.76955 16.0628 6.76953 16.3076C6.76953 16.5524 6.86693 16.7869 7.04004 16.96C7.21315 17.1331 7.44757 17.2305 7.69238 17.2305C7.93717 17.2304 8.17163 17.1331 8.34473 16.96C8.51779 16.7869 8.61523 16.5524 8.61523 16.3076C8.61521 16.0628 8.51782 15.8284 8.34473 15.6553C8.17163 15.4822 7.93717 15.3848 7.69238 15.3848ZM13.7842 5.63086C14.192 5.63091 14.5836 5.79372 14.8721 6.08203L17.917 9.12793C18.2053 9.41643 18.3672 9.80793 18.3672 10.2158C18.3672 10.6237 18.2053 11.0152 17.917 11.3037L12.6064 16.6133C12.6121 16.5122 12.6143 16.4103 12.6143 16.3076V6.16309L12.6963 6.08203C12.9848 5.79368 13.3763 5.63086 13.7842 5.63086Z" fill="currentColor" />
										</svg>
									</button>
								</>
							)}
						</div>

						{!isSystemLocked && (
							<Button
								variant="outline"
								className="!text-danger px-3 h-full"
								size="lg"
								onClick={handleDelete}
							>
								<DeleteOutlineOutlinedIcon />
							</Button>
						)}

					</div>



					{!isExpanded && enableShades && (
						<div className="flex rounded-md overflow-hidden">
							{shadesList
								.filter(shade => shade.isEnabled)
								.map((shade, index) => (
									<div
										key={index}
										className="flex w-full h-4"
									>
										<div
											className="h-full w-full"
											style={{ background: shade.hex }}
										></div>
									</div>
								))}
						</div>
					)}

				</div>

				{isExpanded && (
					<div className="my-8 flex flex-col gap-8">

						<Checkbox
							label="Enable shades"
							checked={enableShades}
							onCheckedChange={setEnableShades}
							className=""
						/>

						{enableShades && (

							<>
								<ShadeSliders
									shades={shades}
									minLightness={minLightness}
									maxLightness={maxLightness}
									onShadesChange={(value) => {
										setShades(value);
										updateShades(tinycolor(color).toHexString(), value, minLightness, maxLightness);
									}}
									onMinLightnessChange={(value) => {
										setMinLightness(value);
										updateShades(tinycolor(color).toHexString(), shades, value, maxLightness);
									}}
									onMaxLightnessChange={(value) => {
										setMaxLightness(value);
										updateShades(tinycolor(color).toHexString(), shades, minLightness, value);
									}}
								/>

								<div className="border border-input rounded-md p-4">

									<ShadesList
										entry={entry}
										shadesList={shadesList}
										updateColorEntry={updateColorEntry}
									/>

								</div>

							</>

						)}
					</div>


				)}
			</div>

		</>
	);
};

export default ColorEntry;
