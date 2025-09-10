import { Controller } from "@hotwired/stimulus";

export default class FindanimeController extends Controller {
  static targets = [
    "fileInput",
    "dropZone",
    "urlInput",
    "loading",
    "imagePreview",
    "previewImg",
    "results",
    "resultsContainer",
    "error",
    "errorMessage",
    "searchButton",
    "uploadTab",
    "urlTab",
    "uploadTabButton",
    "urlTabButton",
  ];

  connect() {
    console.log("Anime Finder controller connected");
    // Set default tab state
    this.showUploadTab(new Event("connect"));
  }

  // File Upload Handlers
  handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  // Drag and Drop Handlers
  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  handleDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dropZoneTarget.classList.add("drag-over");
  }

  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    // Only remove drag-over if we're really leaving the drop zone
    if (!this.dropZoneTarget.contains(event.relatedTarget)) {
      this.dropZoneTarget.classList.remove("drag-over");
    }
  }

  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dropZoneTarget.classList.remove("drag-over");

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
  }

  // URL Upload Handler
  async handleUrlUpload() {
    const url = this.urlInputTarget.value.trim();

    if (!this.isValidUrl(url)) {
      this.showError("Please enter a valid image URL.");
      return;
    }

    try {
      this.showLoading();
      this.hideError();
      this.disableSearchButton();

      // Show preview
      this.previewImgTarget.src = url;
      this.imagePreviewTarget.classList.remove("hidden");

      await this.searchAnime(url);
    } catch (error) {
      this.showError("Failed to process the image from URL.");
      console.error(error);
    } finally {
      this.enableSearchButton();
    }
  }

  // Image Processing - Unified file processing
  processFile(file) {
    if (this.isValidFileType(file)) {
      this.processImage(file);
    } else {
      this.showError(
        "Invalid file type. Please upload an image (jpeg, png, webp)."
      );
    }
  }

  async processImage(file) {
    try {
      this.showLoading();
      this.hideError();
      this.disableSearchButton();

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewImgTarget.src = e.target.result;
        this.imagePreviewTarget.classList.remove("hidden");
      };
      reader.readAsDataURL(file);

      // Convert to base64 and search
      const base64 = await this.fileToBase64(file);
      await this.searchAnime(base64);
    } catch (error) {
      this.showError("Failed to process the image file.");
      console.error(error);
    } finally {
      this.enableSearchButton();
    }
  }

  // Tab Switching
  showUploadTab(event) {
    if (event.preventDefault) event.preventDefault();

    this.uploadTabTarget.classList.remove("hidden");
    this.urlTabTarget.classList.add("hidden");

    this.uploadTabButtonTarget.classList.add(
      "border-blue-500",
      "text-blue-600",
      "dark:text-blue-400"
    );
    this.urlTabButtonTarget.classList.remove(
      "border-blue-500",
      "text-blue-600",
      "dark:text-blue-400"
    );
  }

  showUrlTab(event) {
    event.preventDefault();

    this.uploadTabTarget.classList.add("hidden");
    this.urlTabTarget.classList.remove("hidden");

    this.urlTabButtonTarget.classList.add(
      "border-blue-500",
      "text-blue-600",
      "dark:text-blue-400"
    );
    this.uploadTabButtonTarget.classList.remove(
      "border-blue-500",
      "text-blue-600",
      "dark:text-blue-400"
    );
  }

  // Helper Functions
  isValidFileType(file) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    return allowedTypes.includes(file.type);
  }

  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async searchAnime(imageData) {
    try {
      const formData = new FormData();

      if (typeof imageData === "string" && imageData.startsWith("http")) {
        // URL
        formData.append("url", imageData);
      } else {
        // Base64 data
        const base64Data = imageData.split(",")[1];
        const blob = this.base64ToBlob(base64Data);
        formData.append("image", blob);
      }

      const response = await fetch("https://api.trace.moe/search", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      this.displayResults(data);
    } catch (error) {
      this.showError(`Failed to search for anime: ${error.message}`);
      console.error(error);
    } finally {
      this.hideLoading();
      this.enableSearchButton();
    }
  }

  base64ToBlob(base64) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: "image/jpeg" });
  }
  displayResults(data) {
    if (!data.result || data.result.length === 0) {
      this.showError("No anime found for this image.");
      return;
    }

    const container = this.resultsContainerTarget;
    container.innerHTML = "";

    data.result.slice(0, 5).forEach((result) => {
      const resultCard = document.createElement("div");
      resultCard.className =
        "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 hover:shadow-md transition-shadow";

      const similarity = (result.similarity * 100).toFixed(1);
      const episode = result.episode || "Unknown";
      const timeFrom = this.formatTime(result.from);
      const timeTo = this.formatTime(result.to);

      resultCard.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h4 class="font-semibold text-lg text-gray-800 dark:text-gray-100">
          ${result.filename || "Unknown Anime"}
        </h4>
        <span class="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm font-medium px-2 py-1 rounded">
          ${similarity}% match
        </span>
      </div>
      <div class="text-gray-600 dark:text-gray-400 text-sm mb-3">
        <p><strong>Episode:</strong> ${episode}</p>
        <p><strong>Time:</strong> ${timeFrom} - ${timeTo}</p>
      </div>
      ${
        result.video
          ? `
          <div class="mt-3">
            <video controls class="w-full max-w-md rounded">
              <source src="${result.video}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
        `
          : ""
      }
    `;

      container.appendChild(resultCard);
    });

    this.resultsTarget.classList.remove("hidden");
  }

  formatTime(seconds) {
    if (!seconds && seconds !== 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  // UI State Management
  showLoading() {
    this.loadingTarget.classList.remove("hidden");
    this.resultsTarget.classList.add("hidden");
  }

  hideLoading() {
    this.loadingTarget.classList.add("hidden");
  }

  showError(message) {
    this.errorMessageTarget.textContent = message;
    this.errorTarget.classList.remove("hidden");
    this.hideLoading();
  }

  hideError() {
    this.errorTarget.classList.add("hidden");
  }

  disableSearchButton() {
    if (this.hasSearchButtonTarget) {
      this.searchButtonTarget.disabled = true;
      this.searchButtonTarget.classList.add("opacity-50", "cursor-not-allowed");
    }
  }

  enableSearchButton() {
    if (this.hasSearchButtonTarget) {
      this.searchButtonTarget.disabled = false;
      this.searchButtonTarget.classList.remove(
        "opacity-50",
        "cursor-not-allowed"
      );
    }
  }
}
