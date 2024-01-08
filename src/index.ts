import "./pixi";
import { SceneManager } from "./engine/scenemanager/SceneManager";
import { DataManager } from "./engine/datamanager/DataManager";
import { DEBUG, SAVEDATA_VERSION } from "./flags";
import * as ALL_FLAGS from "./flags";
import { forceFocus, preventDrag, preventKeys, screenOrientation } from "./engine/utils/browserFunctions";
import { ScaleHelper } from "./engine/utils/ScaleHelper";
import { ForagePersistanceProvider } from "./engine/datamanager/ForagePersistanceProvider";
import { PixiRenderer } from "./engine/scenemanager/renderers/PixiRenderer";
import { settings } from "pixi.js";
import { DEFAULTS } from "tweedle.js";
import { MainScene } from "./project/MainScene";
import * as firebase from "firebase/app";
import "firebase/database";
import { getDatabase } from "firebase/database";

settings.RENDER_OPTIONS.hello = false;

DEFAULTS.safetyCheckFunction = (obj: any) => !obj?.destroyed;

const pixiSettings = {
	backgroundColor: 0x222222,
	width: ScaleHelper.IDEAL_WIDTH,
	resolution: window.devicePixelRatio || 1,
	autoDensity: true,
	height: ScaleHelper.IDEAL_HEIGHT,
	autoStart: false,
	view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
	interactionTestsAllScenes: true,
};

document.getElementById("pixi-content").style.background = "#" + "222222"; // app.renderer.backgroundColor.toString(16);
document.getElementById("pixi-content").appendChild(pixiSettings.view);

preventDrag(); // prevents scrolling by dragging.
preventKeys(); // prevents scrolling by keyboard keys. (usually required for latam)
forceFocus();

// registerWorker(); // registers the service worker for pwa

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Manager = new SceneManager(new PixiRenderer(pixiSettings));

screenOrientation();

DataManager.initialize(new ForagePersistanceProvider(), SAVEDATA_VERSION);
DataManager.load();

if (DEBUG) {
	console.group("DEBUG MODE ENABLED:");
	for (const flag in ALL_FLAGS) {
		console.log(`${flag} =`, (ALL_FLAGS as any)[flag]);
	}
	console.groupEnd();
}

window.addEventListener("resize", () => {
	const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	Manager.resize(w, h, window.devicePixelRatio || 1);

	console.info(document.documentElement.clientHeight, window.innerHeight, window.outerHeight);
});

window.dispatchEvent(new Event("resize"));

const firebaseConfig = {
	apiKey: "AIzaSyCmoophIsOPgVPaxYgvudvR4H4M17FfoQM",
	authDomain: "invitations-327e5.firebaseapp.com",
	databaseURL: "https://invitations-327e5-default-rtdb.firebaseio.com",
	projectId: "invitations-327e5",
	storageBucket: "invitations-327e5.appspot.com",
	messagingSenderId: "532259494918",
	appId: "1:532259494918:web:c55129ebb04a541b8df787",
};

export const firebaseApp = firebase.initializeApp(firebaseConfig);
export const FB_DATABASE = getDatabase(firebaseApp);

/* const admin = require("firebase-admin");
const serviceAccount = require("./../credentials.json");
const firebaseApp = admin.initializeApp({
	credential: serviceAccount,
	databaseURL: "https://invitations-327e5-default-rtdb.firebaseio.com",
});
export const FB_DATABASE = getDatabase(firebaseApp); */

const initializeCb = function (): void {
	Manager.changeScene(MainScene);
};

initializeCb();
