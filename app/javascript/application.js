import { Application } from "@hotwired/stimulus";
import "@hotwired/turbo";

window.Stimulus = Application.start();

import FindanimeController from "./controllers/findanime_controller.js";
Stimulus.register("anime-trace", FindanimeController);
