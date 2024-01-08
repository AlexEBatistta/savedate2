import { Container } from "pixi.js";

export class Grid extends Container {
	private readonly grid: Container;
	public readonly elements: Container[];
	public orientation: "columns" | "rows";
	public colOrRow: number;

	// goldplate grab everything that can be a pixi observable point, make it one and have it update automagically
	public fixedWidth: number;
	public fixedHeight: number;
	public spacingX: number;
	public spacingY: number;
	public offsetX: number;
	public offsetY: number;
	public anchorX: number;
	public anchorY: number;
	public staggerPeriodX: number;
	public staggerPeriodY: number;
	public staggerDistanceX: number;
	public staggerDistanceY: number;
	constructor(options?: GridOptions) {
		super();

		this.elements = options?.elements ?? [];
		this.orientation = options?.orientation ?? "columns";
		this.colOrRow = options?.colOrRowNumber ?? 1;
		this.fixedWidth = options?.fixedWidth;
		this.fixedHeight = options?.fixedHeight;
		this.spacingX = options?.spacingX ?? 0;
		this.spacingY = options?.spacingY ?? 0;
		this.offsetX = options?.offsetX ?? 0;
		this.offsetY = options?.offsetY ?? 0;
		this.anchorX = options?.anchorX ?? 0;
		this.anchorY = options?.anchorY ?? 0;
		this.staggerPeriodX = options?.staggerPeriodX ?? 0;
		this.staggerPeriodY = options?.staggerPeriodY ?? 0;
		this.staggerDistanceX = options?.staggerDistanceX ?? 0;
		this.staggerDistanceY = options?.staggerDistanceY ?? 0;

		this.grid = new Container();
		this.addChild(this.grid);
		this.refreshLayout();
	}

	public refreshLayout(): void {
		this.grid.removeChildren();
		if (this.elements.length > 0) {
			this.grid.addChild(...this.elements);
		}
		for (let i = 0; i < this.grid.children.length; i++) {
			const child: Container = this.grid.children[i] as Container; // If this isn't a container we have SEVERAL other problems
			if (this.colOrRow > 1) {
				//* grid behavior
				let adjustedColOrRow = this.colOrRow;
				if (this.orientation == "rows") {
					adjustedColOrRow = Math.ceil(this.grid.children.length / this.colOrRow);
				}
				const stepX = (this.fixedWidth ?? child.width) + this.spacingX;
				const stepY = (this.fixedHeight ?? child.height) + this.spacingY;
				const col = i % adjustedColOrRow;
				const row = Math.floor(i / adjustedColOrRow);

				// making the stagger
				let staggerX = 0;
				if (this.staggerPeriodX) {
					staggerX = (row % this.staggerPeriodX) * this.staggerDistanceX;
				}

				let staggerY = 0;
				if (this.staggerPeriodY) {
					staggerY = (col % this.staggerPeriodY) * this.staggerDistanceY;
				}
				child.x = this.offsetX + col * stepX + staggerX;
				child.y = this.offsetY + row * stepY + staggerY;
			} else {
				//* Stackpanel behavior
				const prevChild = this.grid.children[i - 1] as Container;
				if (this.orientation == "rows") {
					// one row, many columns
					child.x = (prevChild?.x ?? this.offsetX) + (this.fixedWidth ?? prevChild?.width ?? 0) + (i == 0 ? 0 : this.spacingX);
					child.y = this.offsetY;
				} else {
					// one column, many rows
					child.x = this.offsetX;
					if (prevChild) {
						child.y = prevChild.y + (this.fixedHeight ?? prevChild.height) + this.spacingY;
					} else {
						child.y = this.offsetY;
					}
				}
			}
		}

		this.grid.x = this.grid.width * -this.anchorX;
		this.grid.y = this.grid.height * -this.anchorY;
	}

	public sortGrid(): void {
		this.grid.sortableChildren = true;
		this.grid.sortChildren();
	}
}

interface GridOptions {
	elements?: Container[];
	orientation?: "columns" | "rows";
	colOrRowNumber?: number;
	fixedWidth?: number;
	fixedHeight?: number;
	spacingX?: number;
	spacingY?: number;
	offsetX?: number;
	offsetY?: number;
	anchorX?: number;
	anchorY?: number;
	staggerPeriodX?: number;
	staggerPeriodY?: number;
	staggerDistanceX?: number;
	staggerDistanceY?: number;
}
