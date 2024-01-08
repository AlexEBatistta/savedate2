import { Container, Sprite } from "pixi.js";

export class CheckBox extends Container {
	public static readonly BUNDLES = ["package-1"];
	private sprBackground: Sprite;
	private sprCheck: Sprite;
	private isChecked: boolean;
	private callback: Function;
	constructor(isChecked: boolean, callback: Function) {
		super();

		this.isChecked = isChecked;
		this.callback = callback;

		this.sprBackground = Sprite.from(`package-1/checkbox_background.png`);
		this.sprBackground.anchor.set(0.5);
		this.addChild(this.sprBackground);

		this.sprCheck = Sprite.from(`package-1/checkbox_check.png`);
		this.sprCheck.anchor.set(0.5);
		this.sprCheck.visible = this.isChecked;
		this.addChild(this.sprCheck);

		this.interactive = true;
		this.cursor = "pointer";
		this.on("pointertap", this.onTap.bind(this));
	}

	private onTap(): void {
		this.isChecked = !this.isChecked;
		this.sprCheck.visible = this.isChecked;
		this.callback(this.isChecked);
	}
}
