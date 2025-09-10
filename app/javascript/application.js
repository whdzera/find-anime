import { Application } from "@hotwired/stimulus";

window.Stimulus = Application.start();

import FindanimeController from "./controllers/findanime_controller.js";
Stimulus.register("findanime", FindanimeController);
import ThemeController from "./controllers/theme_controller.js";
Stimulus.register("theme", ThemeController);
