import type { IPointData, Filter } from "pixi.js";
import { Circle, Container, Rectangle, Sprite, TextStyle, Texture, Text } from "pixi.js";
import { Tween } from "tweedle.js";

export class Button extends Container {
	private readonly graphic: Sprite;
	private readonly border: Sprite;
	private readonly text: Text;
	private userContent: Container;
	private readonly scaleAndFilterContainer: Container;

	public currentState: ButtonStateOptions;

	private fixedHitArea: Rectangle | Circle;
	private fixedCursor: string;
	private fallbackState: ButtonStateOptions;
	public defaultState: ButtonStateOptions;
	public highlightState: ButtonStateOptions;
	public downState: ButtonStateOptions;
	public disabledState: ButtonStateOptions;

	public clickOnce: boolean = false;
	public clicked: boolean = false;
	public onEnter: Function;
	public onClick: Function;
	public onLeave: Function;
	public onUp: Function;
	public onCancel: Function;
	public onDown: Function;

	private _enabled: boolean = true;
	public get enabled(): boolean {
		return this._enabled;
	}
	public set enabled(value: boolean) {
		this._enabled = value;
		if (value) {
			this.setState(this.defaultState);
		} else {
			this.setState(this.disabledState);
		}
	}

	constructor(options: ButtonOptions) {
		super();
		this.graphic = new Sprite();
		this.border = new Sprite();
		this.text = new Text("");
		this.scaleAndFilterContainer = new Container();

		// building fallback
		this.fallbackState = {
			customHitArea: options?.defaultState?.customHitArea ?? undefined,
			scaleX: options?.defaultState?.scaleX ?? options?.defaultState?.scale ?? 1,
			scaleY: options?.defaultState?.scaleY ?? options?.defaultState?.scale ?? 1,
			filters: options?.defaultState?.filters ?? null,
			cursor: options?.defaultState?.cursor ?? options?.fixedCursor ?? "default",

			texture: {
				name: typeof options?.defaultState?.texture == "string" ? options?.defaultState?.texture : options?.defaultState?.texture?.name ?? "",
				scaleX: typeof options?.defaultState?.texture == "string" ? 1 : options?.defaultState?.texture?.scaleX ?? options?.defaultState?.texture?.scale ?? 1,
				scaleY: typeof options?.defaultState?.texture == "string" ? 1 : options?.defaultState?.texture?.scaleY ?? options?.defaultState?.texture?.scale ?? 1,
				anchorX: typeof options?.defaultState?.texture == "string" ? 0.5 : options?.defaultState?.texture?.anchorX ?? options?.defaultState?.texture?.anchor ?? 0.5,
				anchorY: typeof options?.defaultState?.texture == "string" ? 0.5 : options?.defaultState?.texture?.anchorY ?? options?.defaultState?.texture?.anchor ?? 0.5,
				filters: typeof options?.defaultState?.texture == "string" ? null : options?.defaultState?.texture?.filters ?? null,
			},
			content: options?.defaultState?.content ?? new Container(),
			text: {
				content: typeof options?.defaultState?.text == "string" ? options?.defaultState?.text : options?.defaultState?.text?.content ?? "",
				style: typeof options?.defaultState?.text == "string" ? new TextStyle() : options?.defaultState?.text?.style ?? new TextStyle(),
				scaleX: typeof options?.defaultState?.text == "string" ? 1 : options?.defaultState?.text?.scaleX ?? options?.defaultState?.text?.scale ?? 1,
				scaleY: typeof options?.defaultState?.text == "string" ? 1 : options?.defaultState?.text?.scaleY ?? options?.defaultState?.text?.scale ?? 1,
				anchorX: typeof options?.defaultState?.text == "string" ? 0.5 : options?.defaultState?.text?.anchorX ?? options?.defaultState?.text?.anchor ?? 0.5,
				anchorY: typeof options?.defaultState?.text == "string" ? 0.5 : options?.defaultState?.text?.anchorY ?? options?.defaultState?.text?.anchor ?? 0.5,
				filters: typeof options?.defaultState?.text == "string" ? null : options?.defaultState?.text?.filters ?? null,
			},
		};

		this.fixedHitArea = options?.fixedHitArea;
		this.fixedCursor = options?.fixedCursor;

		// extract other properties
		this.clickOnce = options.clickOnce ?? false;
		this.onEnter = options.onEnter;
		this.onClick = options.onClick;
		this.onLeave = options.onLeave;
		this.onUp = options.onUp;
		this.onDown = options.onDown;
		this.onCancel = options.onCancel;

		// store the states
		this.defaultState = options.defaultState;
		this.highlightState = options.highlightState;
		this.downState = options.downState;
		this.disabledState = options.disabledState;

		// make the background

		if (options.border) {
			if (typeof options?.border != "string") {
				if (options?.border.name) {
					this.border.texture = Texture.from(typeof options?.border?.name);
				} else {
					this.border.texture = Texture.EMPTY;
				}
			} else {
				this.border.texture = Texture.from(typeof options?.border);
			}
			this.border.scale.x = typeof options.border == "string" ? 1 : options?.border?.scaleX ?? 1;
			this.border.scale.y = typeof options.border == "string" ? 1 : options?.border?.scaleY ?? 1;
			this.border.anchor.x = typeof options.border == "string" ? 0.5 : options?.border?.anchorX ?? 0.5;
			this.border.anchor.y = typeof options.border == "string" ? 0.5 : options?.border?.anchorY ?? 0.5;
			this.border.filters = typeof options.border == "string" ? null : options?.border?.filters ?? null;
		}

		// make the display
		this.addChild(this.border); // behind everything
		this.addChild(this.scaleAndFilterContainer);
		this.scaleAndFilterContainer.addChild(this.graphic);
		this.scaleAndFilterContainer.addChild(this.text);

		// add the events
		this.scaleAndFilterContainer.on("mouseover", this.onPointerEnterCallback, this);
		this.scaleAndFilterContainer.on("pointerout", this.onPointerLeaveCallback, this);
		this.scaleAndFilterContainer.on("pointerup", this.onPointerUpCallback, this);
		this.scaleAndFilterContainer.on("pointerupoutside", this.onPointerUpCallback, this);
		this.scaleAndFilterContainer.on("pointerupoutside", this.onPointerCancel, this);
		this.scaleAndFilterContainer.on("touchendoutside", this.onPointerCancel, this);
		this.scaleAndFilterContainer.on("pointercancel", this.onPointerCancel, this);
		this.scaleAndFilterContainer.on("pointerdown", this.onPointerDownCallback, this);
		this.scaleAndFilterContainer.on("pointertap", this.onPointerClickCallback, this);

		this.scaleAndFilterContainer.interactive = true;
		// this.scaleAndFilterContainer.hitArea = this.graphic.getBounds();
		// console.log(this.scaleAndFilterContainer.getBounds());

		this.setState(this.defaultState);
	}

	private onPointerEnterCallback(_e: PointerEvent): void {
		this.setState(this.highlightState);
		if (this.onEnter) {
			this.onEnter();
		}
	}
	private onPointerLeaveCallback(_e: PointerEvent): void {
		this.setState(this.defaultState);
		if (this.onLeave) {
			this.onLeave();
		}
	}
	private onPointerUpCallback(_e: PointerEvent): void {
		this.setState(this.highlightState);
		if (this.enabled && this.onUp) {
			this.onUp();
		}
	}
	private onPointerCancel(_e: PointerEvent): void {
		this.setState(this.defaultState);
		if (this.onCancel) {
			this.onCancel();
		}
	}
	private onPointerDownCallback(_e: PointerEvent): void {
		this.setState(this.downState);
		if (this.enabled && this.onDown) {
			this.onDown();
		}
	}
	private onPointerClickCallback(_e: PointerEvent): void {
		if (this.enabled && (!this.clickOnce || !this.clicked)) {
			if (this.onClick) {
				this.onClick();
				this.clicked = true;
			} else {
				console.warn("You clicked a button without a `onClick` callback. Was this intentiontal?");
			}
		}
	}
	public simulateClick(): void {
		this.onPointerClickCallback(undefined);
	}

	private getHitArea(): Rectangle | Circle {
		if (this.currentState?.customHitArea != undefined) {
			return this.currentState?.customHitArea;
		}
		if (this.fixedHitArea != undefined) {
			const scale: IPointData = { x: this.scaleAndFilterContainer.scale.x, y: this.scaleAndFilterContainer.scale.y };
			if (this.fixedHitArea instanceof Rectangle) {
				return new Rectangle(this.fixedHitArea.x / scale.x, this.fixedHitArea.y / scale.y, this.fixedHitArea.width / scale.x, this.fixedHitArea.height / scale.y);
			} else if (this.fixedHitArea instanceof Circle) {
				return new Circle(this.fixedHitArea.x / scale.x, this.fixedHitArea.y / scale.y, this.fixedHitArea.radius / Math.max(scale.x, scale.y));
			}
		}
		return this.fallbackState.customHitArea;
	}

	private getCursor(): string {
		if (!this.enabled) {
			return "default";
		}
		if (this.currentState?.cursor != undefined) {
			return this.currentState?.cursor;
		}
		if (this.fixedCursor != undefined) {
			return this.fixedCursor;
		}
		return this.fallbackState.cursor;
	}

	private setState(newState: ButtonStateOptions): void {
		// simple safety check
		if (!this.enabled) {
			this.currentState = this.disabledState;
		} else {
			this.currentState = newState;
		}

		if (this.userContent && this.userContent.parent) {
			this.userContent.parent.removeChild(this.userContent);
		}

		if (!this.currentState) {
			this.currentState = this.fallbackState; // emergency patch
		}

		if (this.currentState?.tween) {
			new Tween(this.scaleAndFilterContainer)
				.to(
					{
						scale: {
							x: this.currentState?.scaleX ?? this.currentState?.scale ?? this.fallbackState.scaleX,
							y: this.currentState?.scaleY ?? this.currentState?.scale ?? this.fallbackState.scaleY,
						},
					},
					50
				)
				.start();
		} else {
			// the container
			this.scaleAndFilterContainer.scale.x = this.currentState?.scaleX ?? this.currentState?.scale ?? this.fallbackState.scaleX;
			this.scaleAndFilterContainer.scale.y = this.currentState?.scaleY ?? this.currentState?.scale ?? this.fallbackState.scaleY;
			this.scaleAndFilterContainer.hitArea = this.getHitArea();
			this.scaleAndFilterContainer.cursor = this.getCursor();
		}

		// assertion. I am sure the fallbacks are never just strings.
		this.fallbackState.texture = this.fallbackState.texture as TextureOptions;
		this.fallbackState.text = this.fallbackState.text as TextOptions;

		// now, the graphics
		if (typeof this.currentState.texture == "string") {
			if (this.currentState.texture ?? this.fallbackState.texture.name) {
				this.graphic.texture = Texture.from(this.currentState?.texture ?? this.fallbackState.texture.name);
			} else {
				this.graphic.texture = Texture.EMPTY;
			}
			this.graphic.anchor.x = this.fallbackState.texture.anchorX;
			this.graphic.anchor.y = this.fallbackState.texture.anchorY;
			this.graphic.scale.x = this.fallbackState.texture.scaleX;
			this.graphic.scale.y = this.fallbackState.texture.scaleY;
			this.graphic.filters = this.fallbackState.texture.filters;
		} else {
			if (this.currentState?.texture?.name ?? this.fallbackState.texture.name) {
				this.graphic.texture = Texture.from(this.currentState?.texture?.name ?? this.fallbackState.texture.name);
			} else {
				this.graphic.texture = Texture.EMPTY;
			}
			this.graphic.anchor.x = this.currentState?.texture?.anchorX ?? this.currentState?.texture?.anchor ?? this.fallbackState.texture.anchorX;
			this.graphic.anchor.y = this.currentState?.texture?.anchorY ?? this.currentState?.texture?.anchor ?? this.fallbackState.texture.anchorY;
			this.graphic.scale.x = this.currentState?.texture?.scaleX ?? this.currentState?.texture?.scale ?? this.fallbackState.texture.scaleX;
			this.graphic.scale.y = this.currentState?.texture?.scaleY ?? this.currentState?.texture?.scale ?? this.fallbackState.texture.scaleY;
			this.graphic.filters = this.currentState?.texture?.filters ?? this.fallbackState.texture.filters;
		}

		// user content
		this.userContent = this.currentState.content ?? this.fallbackState.content;
		this.scaleAndFilterContainer.addChild(this.userContent);

		// and now the text
		if (typeof this.currentState.text == "string") {
			this.text.text = this.currentState.text;
			this.text.anchor.x = this.fallbackState.text.anchorX;
			this.text.anchor.y = this.fallbackState.text.anchorY;
			this.text.scale.x = this.fallbackState.text.scaleX;
			this.text.scale.y = this.fallbackState.text.scaleY;
			this.text.filters = this.fallbackState.text.filters;
			this.text.style = this.fallbackState.text.style;
		} else {
			this.text.text = this.currentState?.text?.content ?? this.fallbackState.text.content;
			this.text.anchor.x = this.currentState?.text?.anchorX ?? this.currentState?.text?.anchor ?? this.fallbackState.text.anchorX;
			this.text.anchor.y = this.currentState?.text?.anchorY ?? this.currentState?.text?.anchor ?? this.fallbackState.text.anchorY;
			this.text.scale.x = this.currentState?.text?.scaleX ?? this.currentState?.text?.scale ?? this.fallbackState.text.scaleX;
			this.text.scale.y = this.currentState?.text?.scaleY ?? this.currentState?.text?.scale ?? this.fallbackState.text.scaleY;
			this.text.filters = this.currentState?.text?.filters ?? this.fallbackState.text.filters;
			this.text.style = this.currentState?.text?.style ?? this.fallbackState.text.style;
		}
	}
}

interface ButtonStateOptions {
	texture?: string | TextureOptions;

	content?: Container;

	/**
	 * The custom hit area for this state of the button.
	 * THIS IS A SPECIAL CASE!
	 * Keep in mind:
	 * undefined = use the container one.
	 * null = use the one from defaultState.
	 */
	customHitArea?: any; // IHitArea;
	scaleX?: number;
	scaleY?: number;
	filters?: Filter[];
	cursor?: CursorMode;
	/**
	 * This gets overriden by the X and Y versions.
	 * Only works if you don't set scaleX and scaleY
	 */
	scale?: number;
	tween?: boolean;

	//
	text?: string | TextOptions;
}

export interface ButtonOptions {
	defaultState?: ButtonStateOptions;
	highlightState?: ButtonStateOptions;
	downState?: ButtonStateOptions;
	disabledState?: ButtonStateOptions;
	clickOnce?: boolean;
	onEnter?: Function;
	onClick?: Function;
	onLeave?: Function;
	onUp?: Function;
	onDown?: Function;
	onCancel?: Function;
	border?: string | TextureOptions;
	fixedCursor?: CursorMode;
	fixedHitArea?: Rectangle | Circle;
}

interface TextureOptions {
	name: string;
	anchorX?: number;
	anchorY?: number;
	scaleX?: number;
	scaleY?: number;
	filters?: Filter[];
	/**
	 * This gets overriden by the X and Y versions.
	 * Only works if you don't set scaleX and scaleY
	 */
	scale?: number;
	/**
	 * This gets overriden by the X and Y versions.
	 * Only works if you don't set anchorX and anchorY
	 */
	anchor?: number;
}
interface TextOptions {
	content: string;
	anchorX?: number;
	anchorY?: number;
	scaleX?: number;
	scaleY?: number;
	style?: TextStyle;
	filters?: Filter[];
	/**
	 * This gets overriden by the X and Y versions.
	 * Only works if you don't set scaleX and scaleY
	 */
	scale?: number;
	/**
	 * This gets overriden by the X and Y versions.
	 * Only works if you don't set anchorX and anchorY
	 */
	anchor?: number;
}

export type CursorMode =
	| "auto"
	| "default"
	| "none"
	| "context-menu"
	| "help"
	| "pointer"
	| "progress"
	| "wait"
	| "cell"
	| "crosshair"
	| "text"
	| "vertical-text"
	| "alias"
	| "copy"
	| "move"
	| "no-drop"
	| "not-allowed"
	| "all-scroll"
	| "col-resize"
	| "e-resize"
	| "ew-resize"
	| "n-resize"
	| "ne-resize"
	| "nesw-resize"
	| "ns-resize"
	| "nw-resize"
	| "nwse-resize"
	| "row-resize"
	| "s-resize"
	| "se-resize"
	| "sw-resize"
	| "w-resiz";
