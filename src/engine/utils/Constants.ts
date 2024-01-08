import { TextStyle } from "pixi.js";
import type { ISDFTextStyle } from "../sdftext/SDFBitmapText";
import { ScaleHelper } from "./ScaleHelper";

/* eslint-disable @typescript-eslint/naming-convention */
export const ColorDictionary = {
	black: 0x222222,
	white: 0xffffff,
};
export const SDFTextStyleDictionary = {
	namesDate: { fontName: "monbaitiBig", fontSize: 205, tint: ColorDictionary.white, align: "center" } as ISDFTextStyle,
	namesTitle: { fontName: "monbaitiBig", fontSize: 134, tint: ColorDictionary.white, align: "center" } as ISDFTextStyle,
	titleWhite: { fontName: "monbaitiSmall", fontSize: 72, tint: ColorDictionary.white, align: "center", maxWidth: ScaleHelper.IDEAL_WIDTH - 200 } as ISDFTextStyle,
	titleBlack: { fontName: "monbaitiSmall", fontSize: 72, tint: ColorDictionary.black, align: "center", maxWidth: ScaleHelper.IDEAL_WIDTH - 200 } as ISDFTextStyle,
};
export const TextStyleDictionary = {
	namesSubtitle: new TextStyle({ fontSize: 66, fontFamily: "Poppins", fill: ColorDictionary.white }),
	buttonBlack: new TextStyle({ fontSize: 50, fontFamily: "Poppins", fill: ColorDictionary.black }),
	buttonWhite: new TextStyle({ fontSize: 50, fontFamily: "Poppins", fill: ColorDictionary.white }),
	textBlack: new TextStyle({ fontSize: 48, fontFamily: "Poppins", fill: ColorDictionary.black, align: "center", wordWrap: true, wordWrapWidth: ScaleHelper.IDEAL_WIDTH - 200 }),
	textWhite: new TextStyle({ fontSize: 48, fontFamily: "Poppins", fill: ColorDictionary.white, align: "center", wordWrap: true, wordWrapWidth: ScaleHelper.IDEAL_WIDTH - 200 }),
	textBlackBig: new TextStyle({
		fontSize: 72,
		fontFamily: "Poppins",
		fill: ColorDictionary.black,
		align: "center",
		wordWrap: true,
		wordWrapWidth: ScaleHelper.IDEAL_WIDTH - 200,
	}),
	textWhiteSmall: new TextStyle({ fontSize: 24, fontFamily: "Poppins", fill: ColorDictionary.white, align: "center" }),
	monbaiti: new TextStyle({ fontSize: 72, fontFamily: "monbaiti", fill: ColorDictionary.black }),
};

export const CSSStyle: Partial<CSSStyleDeclaration> = {
	position: "absolute",
	fontFamily: "Poppins",
	fontWeight: "300",
	fontSize: "35px",
	color: "#222222",
	textAlign: "center",
	appearance: "none",
	maxWidth: `775px`,
	cursor: "pointer",
	overflow: "auto",
};

export const CSSStyleLeft: Partial<CSSStyleDeclaration> = {
	position: "absolute",
	fontFamily: "Poppins",
	fontWeight: "300",
	fontSize: "35px",
	color: "#222222",
	textAlign: "left",
	appearance: "none",
	maxWidth: `640px`,
	cursor: "pointer",
	overflow: "auto",
};

export const WIDTH_PARTS: number = 1920;

export const Offsets = {
	top: 100,
	text: 50,
	icon: 75,
	button: 75,
	bottom: 100,
};
