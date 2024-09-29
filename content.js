// Ensure overlayVisible is not already declared in the global scope
if (typeof overlayVisible === "undefined") {
    var overlayVisible = false;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showTabSwitcher") {
        if (!overlayVisible) {
            showTabOverlay();
            overlayVisible = true;
        }
    }
});

function showTabOverlay() {
    // Create the overlay element
    const overlay = document.createElement("div");
    overlay.id = "tab-switcher-overlay";
    overlay.innerHTML = `
      <div class="tab-switcher-container">
        <input type="text" placeholder="Search Tabs" id="search-tabs" />
        <ul id="tab-list"></ul>
      </div>
    `;
    document.body.appendChild(overlay);

    // Style the overlay (defined in styles.css)
    populateTabList();

    // Add keyboard event listeners
    document.addEventListener("keydown", handleKeyPress);
}

function populateTabList() {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const tabList = document.getElementById("tab-list");
        tabList.innerHTML = "";
        tabs.forEach((tab, index) => {
            const tabItem = document.createElement("li");
            tabItem.textContent = tab.title;
            tabItem.dataset.tabId = tab.id;
            if (index === 0) tabItem.classList.add("active"); // Highlight the first tab initially
            tabList.appendChild(tabItem);
        });
    });
}

function handleKeyPress(e) {
    const activeItem = document.querySelector("#tab-list li.active");
    let newItem;

    if (e.key === "Tab") {
        e.preventDefault();
        newItem =
            activeItem.nextElementSibling ||
            document.querySelector("#tab-list li:first-child");
    } else if (e.key === "Enter") {
        const tabId = parseInt(activeItem.dataset.tabId);
        chrome.tabs.update(tabId, { active: true });
        hideTabOverlay();
    } else if (e.key === "Escape") {
        hideTabOverlay();
    }

    if (newItem) {
        activeItem.classList.remove("active");
        newItem.classList.add("active");
    }
}

function hideTabOverlay() {
    const overlay = document.getElementById("tab-switcher-overlay");
    if (overlay) {
        overlay.remove();
    }
    document.removeEventListener("keydown", handleKeyPress);
    overlayVisible = false;
}
