import { Controller } from "@hotwired/stimulus";

export default class FindanimeController extends Controller {
  static targets = [
    "fileTab",
    "urlTab",
    "fileContent",
    "urlContent",
    "dropArea",
    "fileInput",
    "fileDetails",
    "filename",
    "imageUrl",
    "previewContainer",
    "preview",
    "loading",
    "resultsSection",
    "results",
  ];

  static values = {
    apiUrl: { type: String, default: "https://api.trace.moe/search" }, // Make API URL configurable
  };

  currentImageFile = null;

  connect() {
    // Setup drag and drop event listeners
    this.setupDragAndDrop();
  }

  disconnect() {
    // Remove event listeners when the controller is disconnected
    this.removeDragAndDrop();
  }

  setupDragAndDrop() {
    this.dragEnter = this.highlight.bind(this);
    this.dragOver = this.highlight.bind(this);
    this.dragLeave = this.unhighlight.bind(this);
    this.drop = this.handleDrop.bind(this);

    this.dropAreaTarget.addEventListener("dragenter", this.dragEnter, false);
    this.dropAreaTarget.addEventListener("dragover", this.dragOver, false);
    this.dropAreaTarget.addEventListener("dragleave", this.dragLeave, false);
    this.dropAreaTarget.addEventListener("drop", this.drop, false);
  }

  removeDragAndDrop() {
    this.dropAreaTarget.removeEventListener("dragenter", this.dragEnter, false);
    this.dropAreaTarget.removeEventListener("dragover", this.dragOver, false);
    this.dropAreaTarget.removeEventListener("dragleave", this.dragLeave, false);
    this.dropAreaTarget.removeEventListener("drop", this.drop, false);
  }

  switchToFileTab(event) {
    event.preventDefault();
    this.setActiveTab("file");
  }

  switchToUrlTab(event) {
    event.preventDefault();
    this.setActiveTab("url");
  }

  setActiveTab(tabName) {
    if (tabName === "file") {
      this.fileTabTarget.classList.add(
        "text-blue-400",
        "border-b-2",
        "border-blue-400"
      );
      this.fileTabTarget.classList.remove("text-gray-400");
      this.urlTabTarget.classList.remove(
        "text-blue-400",
        "border-b-2",
        "border-blue-400"
      );
      this.urlTabTarget.classList.add("text-gray-400");

      this.fileContentTarget.classList.remove("hidden");
      this.urlContentTarget.classList.add("hidden");
    } else if (tabName === "url") {
      this.urlTabTarget.classList.add(
        "text-blue-400",
        "border-b-2",
        "border-blue-400"
      );
      this.urlTabTarget.classList.remove("text-gray-400");
      this.fileTabTarget.classList.remove(
        "text-blue-400",
        "border-b-2",
        "border-blue-400"
      );
      this.fileTabTarget.classList.add("text-gray-400");

      this.urlContentTarget.classList.remove("hidden");
      this.fileContentTarget.classList.add("hidden");
    }
  }

  browseFiles(event) {
    event.preventDefault();
    this.fileInputTarget.click();
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  removeFile(event) {
    event.preventDefault();
    this.resetFileUpload();
  }

  async fetchUrl(event) {
    event.preventDefault();
    const imageUrl = this.imageUrlTarget.value.trim();

    if (!imageUrl) {
      alert("Please enter a valid image URL");
      return;
    }

    this.showPreviewLoading();

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      const blob = await response.blob();
      const file = new File([blob], "image-from-url.jpg", { type: blob.type });
      this.processFile(file);
    } catch (error) {
      this.showPreviewError(
        "Failed to load image. Please check the URL and ensure CORS is enabled on the image server."
      );
      console.error("Error fetching image:", error); // Log the error for debugging
    }
  }

  highlight(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dropAreaTarget.classList.add("border-green-400", "bg-green-400/10");
    this.dropAreaTarget.classList.remove("border-blue-500");
  }

  unhighlight(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dropAreaTarget.classList.remove("border-green-400", "bg-green-400/10");
    this.dropAreaTarget.classList.add("border-blue-500");
  }

  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;

    if (files.length > 0) {
      this.processFile(files[0]);
    }
  }

  processFile(file) {
    if (!file.type.match("image.*")) {
      alert("Please select an image file!");
      return;
    }

    this.currentImageFile = file;
    this.filenameTarget.textContent = file.name;
    this.fileDetailsTarget.classList.remove("hidden");
    this.dropAreaTarget.classList.add("hidden");
    this.showPreview(file);
  }

  showPreview(file) {
    this.previewContainerTarget.classList.remove("hidden");
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewTarget.innerHTML = `<img src="${e.target.result}" class="max-w-full max-h-80 mx-auto rounded-lg shadow-lg">`;
    };
    reader.readAsDataURL(file);
  }

  showPreviewLoading() {
    this.previewContainerTarget.classList.remove("hidden");
    this.previewTarget.innerHTML =
      "<p class='text-center'><i class='fas fa-spinner fa-spin text-blue-400'></i> Loading image...</p>";
  }

  showPreviewError(message) {
    this.previewContainerTarget.classList.remove("hidden");
    this.previewTarget.innerHTML = `<p class='text-red-400 text-center'><i class='fas fa-exclamation-triangle'></i> ${message}</p>`;
  }

  resetFileUpload() {
    this.currentImageFile = null;
    this.fileInputTarget.value = "";
    this.filenameTarget.textContent = "No file selected";
    this.fileDetailsTarget.classList.add("hidden");
    this.dropAreaTarget.classList.remove("hidden");
    this.previewContainerTarget.classList.add("hidden");
    this.previewTarget.innerHTML = ""; // Clear the preview
  }

  async search(event) {
    event.preventDefault();

    const imageUrl = this.imageUrlTarget.value.trim();
    const isFileTab = !this.fileContentTarget.classList.contains("hidden");

    if (isFileTab && !this.currentImageFile) {
      alert("Please select an image first!");
      return;
    }

    if (!isFileTab && !imageUrl) {
      alert("Please enter an image URL!");
      return;
    }

    this.showLoading();
    this.hideResults();

    const formData = new FormData();

    if (isFileTab) {
      formData.append("image", this.currentImageFile);
    } else {
      formData.append("url", imageUrl);
    }

    try {
      const response = await fetch(this.apiUrlValue, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.hideLoading();
      this.showResults();

      if (data.result && data.result.length > 0) {
        this.displayResults(data.result);
      } else {
        this.displayNoResults();
      }
    } catch (error) {
      this.hideLoading();
      this.showResults();
      this.displaySearchError(error);
      console.error("Search error:", error);
    }
  }

  displayResults(results) {
    let html = "";

    results.forEach((result) => {
      const similarityPercent = (result.similarity * 100).toFixed(1);
      const similarityClass = this.getSimilarityClass(result.similarity);

      html += `
        <div class="bg-dark-900 border border-dark-700 rounded-xl p-6 mb-6 shadow-xl hover:transform hover:scale-105 transition-all 
duration-300">
          <div class="mb-4">
            <div class="flex flex-wrap items-center justify-between mb-2">
              <h4 class="text-xl font-semibold text-white">${
                result.filename
              }</h4>
              <span class="px-3 py-1 rounded-full text-sm font-medium ${similarityClass}">
                Match: ${similarityPercent}%
              </span>
            </div>
            <p class="text-gray-400 mb-3">Episode: ${
              result.episode || "Unknown"
            }</p>
            
            <div class="flex flex-wrap gap-2">
              <a href="https://anilist.co/anime/${
                result.anilist
              }" target="_blank" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-sm transition-colors">
                Anilist ID: ${
                  result.anilist
                } <i class="fas fa-external-link-alt ml-1"></i>
              </a>
            </div>
          </div>
          
          <div class="bg-black rounded-lg p-2">
            <video class="w-full h-auto rounded-lg" controls>
              <source src="${result.video}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      `;
    });

    this.resultsTarget.innerHTML = html;
  }

  getSimilarityClass(similarity) {
    if (similarity > 0.9) {
      return "bg-green-500";
    } else if (similarity > 0.7) {
      return "bg-yellow-500 text-black";
    } else {
      return "bg-red-500";
    }
  }

  displayNoResults() {
    this.resultsTarget.innerHTML = `
      <div class="bg-yellow-900/50 border border-yellow-700 text-yellow-100 px-6 py-4 rounded-lg">
        <p>No matching anime found. Try another screenshot!</p>
      </div>
    `;
  }

  displaySearchError(error) {
    this.resultsTarget.innerHTML = `
      <div class="bg-red-900/50 border border-red-700 text-red-100 px-6 py-4 rounded-lg">
        <p>Error occurred while searching: ${error.message}. Please try again later.</p>
      </div>
    `;
  }

  showLoading() {
    this.loadingTarget.classList.remove("hidden");
  }

  hideLoading() {
    this.loadingTarget.classList.add("hidden");
  }

  showResults() {
    this.resultsSectionTarget.classList.remove("hidden");
  }

  hideResults() {
    this.resultsSectionTarget.classList.add("hidden");
  }
}
