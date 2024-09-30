// Ensure overlayVisible is not already declared in the global scope
if (typeof overlayVisible === "undefined") {
    var overlayVisible = false;
}

// Setup detecting pressed keys
if (typeof pressedKeys === "undefined") {
    var pressedKeys = {};
}

window.onkeyup = function (e) {
    pressedKeys[e.key] = false;
    console.log(`${e.key} is not pressed`);
};
window.onkeydown = function (e) {
    pressedKeys[e.key] = true;
    console.log(`${e.key} is pressed`);
};

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

    // Send a message to the background script to get the list of tabs
    chrome.runtime.sendMessage({ action: "getTabs" }, (response) => {
        console.log(response);
        
        populateTabList(response.tabs);
    });

    // Add keyboard event listeners
    document.addEventListener("keydown", handleKeyPress);
    document.addEventListener('keyup', handleKeyUp);
}

function populateTabList(tabs) {
    const tabList = document.getElementById("tab-list");
    tabList.innerHTML = "";

    tabs.forEach((tab, index) => {
        const tabItem = document.createElement("li");
        tabItem.textContent = tab.title;
        tabItem.dataset.tabId = tab.id;
        if (index === 0) tabItem.classList.add("active"); // Highlight the first tab initially
        tabList.appendChild(tabItem);
    });
}

function handleKeyPress(e) {
    const activeItem = document.querySelector("#tab-list li.active");
    let newItem;

    console.log(pressedKeys["Alt"] );

    if (pressedKeys["Alt"] && e.key == "Tab") {
        e.preventDefault();
        // Find the next sibling, or go to the first item if at the end
        console.log("current active", activeItem);
        console.log("next active", activeItem.nextElementSibling);
        console.log("prev active", activeItem.previousElementSibling);
        if (e.shiftKey) {
            // If Shift+Tab is pressed, go to the previous sibling or the last child
            newItem = activeItem.previousElementSibling || document.querySelector("#tab-list li:last-child");
        } else {
            // Normal Tab: Go to the next sibling or the first child if at the end
            newItem = activeItem.nextElementSibling || document.querySelector("#tab-list li:first-child");
        }
    } else if (e.key === "Enter") {
        // When Enter is pressed, activate the selected tab
        activateTab(activeItem);
    } else if (e.key === "Escape") {
        // Close the tab switcher if Escape is pressed
        hideTabOverlay();
    }

    // Update the active class to reflect the newly selected item
    if (newItem) {
        activeItem.classList.remove("active");
        newItem.classList.add("active");
    }
}

// Handle the keyup event for detecting when the Alt key is released
function handleKeyUp(e) {
    pressedKeys[e.key] = false;
    console.log(`${e.key} is not pressed`);

    // Check if Alt key is released
    if (e.key === "Alt") {
        const activeItem = document.querySelector("#tab-list li.active");
        // When Alt is released, activate the current tab
        activateTab(activeItem);
    }
}

// Track the keydown event and mark the key as pressed
function handleKeyDown(e) {
    pressedKeys[e.key] = true; // Mark key as pressed
}

// Function to activate a tab
function activateTab(activeItem) {
    const tabId = parseInt(activeItem.dataset.tabId);
    chrome.runtime.sendMessage({ action: "activateTab", tabId: tabId });
    hideTabOverlay();
}

function hideTabOverlay() {
    const overlay = document.getElementById("tab-switcher-overlay");
    if (overlay) {
        overlay.remove();
    }
    document.removeEventListener("keydown", handleKeyPress);
    overlayVisible = false;
}
