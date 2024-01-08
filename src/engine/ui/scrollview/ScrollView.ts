import type { IPointData } from "@pixi/math";
import type { Graphics, DisplayObject } from "pixi.js";
import { utils } from "pixi.js";
import { Container, Rectangle, Sprite, Point } from "pixi.js";
import * as _math from "@pixi/math-extras";
import { Easing, Tween } from "tweedle.js";
import { Manager } from "../../..";
import { MTSDFSprite } from "../../mtsdfSprite/MTSDFSprite";
import { GraphicsHelper } from "../../utils/GraphicsHelper";
import { clamp, magnitudeSquared, multiplyScalar, ruleOfFive, subtract } from "../../utils/MathUtils";

export namespace ScrollViewEvents {
	/** this event is emitted every time the scroll changes position (or if it tries and clamps) and is emitted along with 2 arguments. The positive Y scroll position, and scrollHeight  */
	export const ON_SCROLL = Symbol("scroll");
	export const SCROLL_BEGIN = Symbol("scroll begin");
	export const SCROLL_END = Symbol("scroll end");
	/** If for some reason you need to edit the hit area, do it when this event is emitted, because if you don't do it at the right time, the class itself may override the data that you put in it. */
	export const CAN_EDIT_HIT_AREA = Symbol("edit_hitArea");
}

export class ScrollView extends Container {
	public readonly content: Container;
	private readonly myMask: Graphics;

	// goldplate grab everything that is composed of an x and y, wrap inside a pixi observable point and update the layout
	public scrollWidth: number;
	public scrollHeight: number;
	public scrollVertical: boolean;
	public scrollHorizontal: boolean;

	/**
	 * Usually a rectangle of (0,0,width of the content, height of the content) will do what you want
	 */
	private scrollLimits: Rectangle;
	private centerIfSpaceIsLeft: boolean;

	public bleedOut: boolean;

	private topGradient: Sprite;
	private bottomGradient: Sprite;
	private gradientHeight: number;
	private topArrow: MTSDFSprite;
	private bottomArrow: MTSDFSprite;

	private restitutionTween: Tween<any>;
	public restitutionExtraHorizontal: number;
	public restitutionExtraVertical: number;
	public snapModulusHorizontal: number;
	public snapModulusVertical: number;
	public restitutionTime: number;
	public restitutionEasing: (k: number) => number;

	// velocity params
	private preDelta: [Point, number]; // position, time
	private delta: [Point, number]; // position, time
	/** is dragging manually */
	private dragging: boolean;
	/** the tween for snapping camera */
	private dragTween: Tween<any>;
	/** the screen position of the pointer */
	private pointerPosition: Point;
	/** the screen position of the pointer when drag beggins */
	private dragInitPosition: Point;
	/** is clone of content.position, used internally for init dragging on intermedian positions */
	private contentPosInitDrag: Point;
	/** lenght of the screen diagonal, used for a relative minimum drag value for initialize dragging */
	private screenDiagonal: number;

	private innertiaDistanceMultiplier: number;
	private innertiaTimeMultiplier: number;

	public events: utils.EventEmitter<symbol>;

	constructor(scrollWidth: number | "disabled", height: number | "disabled", options?: ScrollOptions) {
		super();
		this.events = options?.events ?? new utils.EventEmitter();
		this.myMask = GraphicsHelper.pixel();
		this.content = new Container();
		this.scrollWidth = scrollWidth == "disabled" ? 1000 : scrollWidth; // the 10000 will be overwritten by the correct value before the first render, relax
		this.scrollHeight = height == "disabled" ? 1000 : height; // the 10000 will be overwritten by the correct value before the first render, relax
		this.scrollHorizontal = scrollWidth != "disabled";
		this.scrollVertical = height != "disabled";
		if (options?.addToContent) {
			Array.isArray(options.addToContent) ? this.content.addChild.apply(this.content, ...options.addToContent) : this.content.addChild(options.addToContent);
		}
		this.scrollLimits = options?.scrollLimits ?? new Rectangle();
		this.restitutionExtraHorizontal = options?.restitutionExtraHorizontal ?? 0;
		this.restitutionExtraVertical = options?.restitutionExtraVertical ?? 0;
		this.restitutionTime = options?.restitutionTime ?? 500;
		this.snapModulusHorizontal = options?.snapModulusHorizontal ?? 0;
		this.snapModulusVertical = options?.snapModulusVertical ?? 0;
		this.restitutionEasing = options?.restitutionEasing ?? Easing.Exponential.Out;
		this.bleedOut = Boolean(options?.bleedOut);
		this.centerIfSpaceIsLeft = Boolean(options?.centerIfSpaceIsLeft);

		if (options?.useInnertia) {
			this.innertiaDistanceMultiplier = options?.innertiaDistanceMultiplier ?? 150;
			this.innertiaTimeMultiplier = options?.innertiaTimeMultiplier ?? 1;
		}

		this.addChild(this.myMask);
		this.addChild(this.content);

		if (options?.gradientHeight != undefined) {
			this.gradientHeight = options.gradientHeight;
			this.topGradient = Sprite.from("atlas/utils/gradient.png");
			this.topGradient.anchor.set(0, 0.5);
			const originalWidth: number = this.topGradient.texture.width;
			const originalHeight: number = this.topGradient.texture.height;
			this.topGradient.scale.set(this.scrollWidth / originalWidth, (this.gradientHeight / originalHeight) * 2);
			this.topGradient.tint = 0x000000;

			this.bottomGradient = Sprite.from(this.topGradient.texture);
			this.bottomGradient.anchor.set(0, 0.5);
			this.bottomGradient.scale.set(this.topGradient.scale.x, this.topGradient.scale.y);
			this.bottomGradient.tint = 0x000000;

			this.addChild(this.topGradient);
			this.addChild(this.bottomGradient);

			this.topArrow = MTSDFSprite.from("atlas/sdf/icons/arrow1.png", 4);
			this.topArrow.anchor.set(0.5);
			this.topArrow.angle = 90;

			this.bottomArrow = MTSDFSprite.from("atlas/sdf/icons/arrow1.png", 4);
			this.bottomArrow.anchor.set(0.5);
			this.bottomArrow.angle = -90;

			if (options.arrows != undefined) {
				this.addChild(this.bottomArrow);
				this.addChild(this.topArrow);
			}
		}

		// todo finish this shit
		// this.redrawMask();

		this.hitArea = new Rectangle();

		this.interactive = true;

		if (!options?.disableDragControls) {
			this.on("pointerdown", this.onDragStart, this);
			this.on("pointerup", this.onDragEnd, this);
			this.on("pointerupoutside", this.onDragEnd, this);
			this.on("pointermove", this.onDragMove, this);
			if (options?.useMouseWheel) {
				this.wheelFunction = this.onMouseWheel.bind(this);
				window.addEventListener("wheel", this.wheelFunction);
			}
		}
	}

	public setMouseWheel(enable: boolean): void {
		if (enable) {
			this.wheelFunction = this.onMouseWheel.bind(this);
			window.addEventListener("wheel", this.wheelFunction);
		} else {
			window.removeEventListener("wheel", this.wheelFunction);
		}
	}
	private wheelFunction: any;
	private onMouseWheel(delta: WheelEvent): void {
		if (!this.dragging && this.worldVisible) {
			this.scrollInnertia(0, this.content.y - delta.deltaY * 1.75);
			// this.content.y -= delta.deltaY;
			// this.constraintRectangle();
		}
	}

	private onDragStart(e: any): void {
		// store a reference to the data
		// the reason for this is because of multitouch
		// we want to track the movement of this particular touch
		this.pointerPosition = e.data.getLocalPosition(this);

		this.dragInitPosition = this.pointerPosition.clone();
		this.dragging = false;
		this.dragTween?.pause();
	}

	private onDragMove(e: any): void {
		this.pointerPosition = e.data.getLocalPosition(this);
		if (this.dragInitPosition == null) {
			return;
		}

		if (!this.dragging) {
			const initPositionDifference: number = magnitudeSquared(new Point(this.dragInitPosition.x - this.pointerPosition.x, this.dragInitPosition.y - this.pointerPosition.y));
			const minimumDragDistance: number = this.screenDiagonal * 0.005; // the 0.5% (percent) of the screen diagonal
			if (initPositionDifference > minimumDragDistance * minimumDragDistance) {
				this.contentPosInitDrag = multiplyScalar(this.content.position.clone(), -1);
				this.dragging = this.drag(true);
			}
		} else {
			this.drag(false);
		}
	}

	private drag(beginDrag: boolean): boolean {
		const pointerDifference: Point = new Point(this.dragInitPosition.x - this.pointerPosition.x, this.dragInitPosition.y - this.pointerPosition.y);

		const spaceIsLeft: boolean = this.scrollHeight > this.scrollLimits.height;
		if (spaceIsLeft && this.centerIfSpaceIsLeft) {
			this.updateGradients();
			return false;
		} else {
			const minLimitX = Math.max(this.scrollLimits.width - this.scrollWidth, 0);
			const minLimitY = Math.max(this.scrollLimits.height - this.scrollHeight, 0);

			const pretendedX: number = -clamp(
				this.contentPosInitDrag.x + pointerDifference.x,
				this.scrollLimits.x - (this.scrollHorizontal ? this.restitutionExtraHorizontal : 0),
				minLimitX + (this.scrollHorizontal ? this.restitutionExtraHorizontal : 0)
			);

			const pretendedY: number = -clamp(
				this.contentPosInitDrag.y + pointerDifference.y,
				this.scrollLimits.y - (this.scrollVertical ? this.restitutionExtraVertical : 0),
				minLimitY + (this.scrollVertical ? this.restitutionExtraVertical : 0)
			);

			if (beginDrag) {
				const toPretendedX: number = pretendedX - this.contentPosInitDrag.x;
				const toPretendedY: number = pretendedY - this.contentPosInitDrag.y;
				if (toPretendedX == 0 && toPretendedY == 0) {
					return false;
				}
				this.events.emit(ScrollViewEvents.SCROLL_BEGIN);
				this.preDelta = null;
			}

			this.content.x = pretendedX;
			this.content.y = pretendedY;
		}

		this.updateGradients();

		return true;
	}

	private onDragEnd(e: any): void {
		if (this.dragInitPosition == null) {
			return;
		}
		if (!this.dragging) {
			this.dragInitPosition = null;
			return;
		}
		this.pointerPosition = e.data.getLocalPosition(this);

		this.drag(false);
		this.dragTween?.stop();

		if (this.innertiaDistanceMultiplier != undefined) {
			const innertialStartingPoint: [Point, number] = this.preDelta;
			if (innertialStartingPoint) {
				const positionDifference: Point = subtract(this.pointerPosition, innertialStartingPoint[0]);
				const timeDifference: number = Date.now() - innertialStartingPoint[1];
				const velocity: Point = multiplyScalar(positionDifference, 1 / timeDifference);
				const pointerDifference: Point = new Point(this.dragInitPosition.x - this.pointerPosition.x, this.dragInitPosition.y - this.pointerPosition.y);
				const minLimitX = Math.max(this.scrollLimits.width - this.scrollWidth, 0);
				const minLimitY = Math.max(this.scrollLimits.height - this.scrollHeight, 0);

				const pretendedX: number = -clamp(
					this.contentPosInitDrag.x + pointerDifference.x - velocity.x * this.innertiaDistanceMultiplier,
					this.scrollLimits.x - (this.scrollHorizontal ? this.restitutionExtraHorizontal : 0),
					minLimitX + (this.scrollHorizontal ? this.restitutionExtraHorizontal : 0)
				);

				const pretendedY: number = -clamp(
					this.contentPosInitDrag.y + pointerDifference.y - velocity.y * this.innertiaDistanceMultiplier,
					this.scrollLimits.y - (this.scrollVertical ? this.restitutionExtraVertical : 0),
					minLimitY + (this.scrollVertical ? this.restitutionExtraVertical : 0)
				);

				const differenceX: number = this.content.x - pretendedX;
				const differenceY: number = this.content.y - pretendedY;
				const distance: number = Math.sqrt(differenceX ** 2 + differenceY ** 2);
				this.dragTween = new Tween(this.content.position)
					.to({ x: pretendedX, y: pretendedY }, distance * this.innertiaTimeMultiplier)
					.onUpdate(() => this.updateGradients())
					.easing(Easing.Quadratic.Out)
					.onComplete(() => {
						this.dragTween = null;
						this.events.emit(ScrollViewEvents.SCROLL_END, this.content.y);
					})
					.start();
			}
		}
		// set the interaction data to null
		this.dragging = false;
		this.dragInitPosition = null;
		this.content.interactiveChildren = true;
		this.constraintRectangle();
	}

	/** should be call each frame */
	public updateDragging(): void {
		if (this.dragging) {
			this.preDelta = this.delta;
			this.delta = [this.pointerPosition.clone(), Date.now()];
		}
	}

	/**
	 * CAUTION: This won't disable the children nor check for the minimum to unlock the drag
	 */
	public scroll(distanceX: number = 0, distanceY: number = 0, constraint?: boolean): void {
		distanceX = this.scrollHorizontal ? distanceX : 0;
		distanceY = this.scrollVertical ? distanceY : 0;

		this.content.x += distanceX;
		this.content.y += distanceY;
		if (constraint) {
			this.constraintRectangle();
		}
	}

	public scrollTo(posX: number = 0, posY: number = 0, constraint?: boolean): void {
		if (this.scrollHorizontal) {
			this.content.x = posX;
		}
		if (this.scrollVertical) {
			this.content.y = posY;
			this.events.emit(ScrollViewEvents.SCROLL_END, this.content.y);
		}
		if (constraint) {
			this.constraintRectangle();
		}
	}

	public scrollInnertia(posX: number = 0, posY: number = 0): void {
		posY = clamp(posY, -Math.max(this.scrollLimits.height - this.scrollHeight, 0), 0);

		const differenceX: number = this.content.x - posX;
		const differenceY: number = this.content.y - posY;
		const distance: number = Math.sqrt(differenceX ** 2 + differenceY ** 2);
		this.dragTween = new Tween(this.content.position)
			.to({ x: posX, y: posY }, distance * (this.innertiaTimeMultiplier / 2))
			.onUpdate(() => this.updateGradients())
			.easing(Easing.Quadratic.Out)
			.onComplete(() => {
				this.dragTween = null;
				this.events.emit(ScrollViewEvents.SCROLL_END, this.content.y);
			})
			.start();
	}

	public scrollToBottom(time?: number): void {
		this.dragTween?.stop();

		const pretendedY: number = -Math.max(this.scrollLimits.height - this.scrollHeight, 0);
		const differenceY: number = this.content.y - pretendedY;
		const distance: number = Math.sqrt(differenceY ** 2);
		this.dragTween = new Tween(this.content.position)
			.to({ y: pretendedY }, time ?? distance * this.innertiaTimeMultiplier)
			.onUpdate(() => this.updateGradients())
			.easing(Easing.Quadratic.Out)
			.onComplete(() => {
				this.dragTween = null;
				this.events.emit(ScrollViewEvents.SCROLL_END, this.content.y);
			})
			.start();

		// set the interaction data to null
		this.dragging = false;
		this.dragInitPosition = null;
		this.content.interactiveChildren = true;
		this.constraintRectangle();
	}

	public getScrollPosition(): IPointData {
		return { x: this.content.x, y: this.content.y };
	}

	public lock(): void {
		this.interactive = false;
	}

	public unlock(): void {
		this.interactive = true;
	}

	public constraintRectangle(): void {
		if (this.scrollLimits == null) {
			return;
		}
		if (this.restitutionTween) {
			this.restitutionTween.stop();
		}

		const spaceIsLeft: boolean = this.scrollHeight > this.scrollLimits.height;
		if (spaceIsLeft && this.centerIfSpaceIsLeft) {
			this.content.x = (this.scrollLimits.width - this.scrollWidth) * -0.5;
			this.content.y = (this.scrollLimits.height - this.scrollHeight) * -0.5;
		} else {
			const minLimitX = Math.max(this.scrollLimits.width - this.scrollWidth, 0);
			const minLimitY = Math.max(this.scrollLimits.height - this.scrollHeight, 0);

			this.content.x = clamp(
				this.content.x,
				-(minLimitX + (this.scrollHorizontal ? this.restitutionExtraHorizontal : 0)),
				-(this.scrollLimits.x - (this.scrollHorizontal ? this.restitutionExtraHorizontal : 0))
			);

			this.content.y = clamp(
				this.content.y,
				-(minLimitY + (this.scrollVertical ? this.restitutionExtraVertical : 0)),
				-(this.scrollLimits.y - (this.scrollVertical ? this.restitutionExtraVertical : 0))
			);
		}

		this.updateGradients();
	}

	private updateGradients(): void {
		this.events.emit(ScrollViewEvents.ON_SCROLL, -this.content.y, this.scrollHeight);
		if (this.gradientHeight == undefined) {
			return;
		}
		this.topGradient.visible = this.bottomGradient.visible = this.scrollLimits.height > this.scrollHeight;
		this.topArrow.visible = Math.abs(this.content.y) != 0;
		this.bottomArrow.visible = Math.abs(this.content.y) < this.scrollLimits.height;
		if (this.topGradient.visible) {
			this.topGradient.y = ruleOfFive(0, -this.gradientHeight, -this.gradientHeight, 0, this.content.y, true);
			this.topArrow.position.set(this.scrollWidth / 2, this.topGradient.y + this.topArrow.height / 2);
			const bottomContentY: number = this.scrollHeight - this.scrollLimits.height;
			this.bottomGradient.y = ruleOfFive(
				bottomContentY,
				this.scrollHeight + this.gradientHeight,
				bottomContentY + this.gradientHeight,
				this.scrollHeight,
				this.content.y,
				true
			);
			this.bottomArrow.position.set(this.scrollWidth / 2, this.bottomGradient.y - this.bottomArrow.height / 2);
		}
	}

	public updateScrollLimits(width?: number, height?: number, constraint: boolean = true): void {
		if (width != undefined) {
			this.scrollLimits.width = width;
		}
		if (height != undefined) {
			this.scrollLimits.height = height;
		}
		if (constraint) {
			this.constraintRectangle();
		}
	}

	private redrawMask(): void {
		if (!this.scrollHorizontal) {
			this.scrollWidth = this.content.width;
		}
		if (!this.scrollVertical) {
			this.scrollHeight = this.content.height;
		}
		if (this.myMask.scale.x != this.scrollWidth || this.myMask.scale.y != this.scrollHeight) {
			this.myMask.scale.set(this.scrollWidth, this.scrollHeight);
			this.screenDiagonal = Math.sqrt(Manager.width ** 2 + Manager.height ** 2);

			if (this.bleedOut) {
				this.myMask.alpha = 0;
			} else {
				this.mask = this.myMask;
			}

			if (this.hitArea instanceof Rectangle) {
				this.hitArea.width = this.scrollWidth;
				this.hitArea.height = this.scrollHeight;
				this.events.emit(ScrollViewEvents.CAN_EDIT_HIT_AREA);
			}
		}
	}

	/**
	 * Hackity hack hack
	 */
	public override updateTransform(): void {
		this.redrawMask();
		super.updateTransform();
	}

	public override destroy(options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }): void {
		if (this.wheelFunction != undefined) {
			window.removeEventListener("mousewheel", this.wheelFunction);
		}
		super.destroy(options);
	}
}

interface ScrollOptions {
	addToContent?: DisplayObject | DisplayObject[];
	gradientHeight?: number;
	arrows?: boolean;
	scrollLimits?: Rectangle;
	restitutionExtraHorizontal?: number;
	restitutionExtraVertical?: number;
	restitutionTime?: number;
	restitutionEasing?: (k: number) => number;
	disableDragControls?: boolean;
	centerIfSpaceIsLeft?: boolean;

	useInnertia?: boolean;

	innertiaDistanceMultiplier?: number;
	innertiaTimeMultiplier?: number;

	snapModulusHorizontal?: number;
	snapModulusVertical?: number;

	bleedOut?: boolean;
	useMouseWheel?: boolean;
	events?: utils.EventEmitter<symbol>;
}
