// Ensure overlayVisible is not already declared in the global scope
if (typeof overlayVisible === "undefined") {
    var overlayVisible = false;
}

// Setup detecting pressed keys
if (typeof pressedKeys === "undefined") {
    var pressedKeys = {};
}

// Setup shadow root
if (typeof shadowRoot === "undefined") {
    var shadowRoot = null;
}

window.onkeyup = function (e) {
    pressedKeys[e.key] = false;
};
window.onkeydown = function (e) {
    pressedKeys[e.key] = true;
};

// Setup event listeners
document.addEventListener("keydown", handleKeyPress);
document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

// Handle showTabSwitcher command from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showTabSwitcher") {
        if (!overlayVisible) {
            showTabOverlay();
            overlayVisible = true;
        }
    }
});

function showTabOverlay() {
    if (overlayVisible) return;

    // Create the overlay container where the shadow DOM will be attached
    const overlayContainer = document.createElement("div");
    overlayContainer.id = "tab-switcher-overlay-container";

    // Apply styles to overlayContainer directly (in regular DOM, not shadow DOM)
    overlayContainer.style.position = "fixed";
    overlayContainer.style.top = "0";
    overlayContainer.style.left = "0";
    overlayContainer.style.width = "100vw";
    overlayContainer.style.height = "100vh";
    overlayContainer.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    overlayContainer.style.display = "flex";
    overlayContainer.style.justifyContent = "center";
    overlayContainer.style.alignItems = "center";
    overlayContainer.style.zIndex = "10000";

    // Attach a shadow root to the container
    shadowRoot = overlayContainer.attachShadow({ mode: "open" });

    // Define the HTML structure and styles within the Shadow DOM
    // This HTML is attached directly to the shadowRoot, NOT document.body
    shadowRoot.innerHTML = `
        <style>
        * {
            font-family: Arial, sans-serif; /* Or any font of your choice */
        }
        
        #tab-switcher-overlay-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }

        .tab-switcher-container {
            background-color: #1e1e1e;
            width: 400px;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.3);
        }

        #tab-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        #tab-list li {
            padding: 10px;
            background-color: #2c2c2c;
            margin-bottom: 5px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
        }

        #tab-list li.active {
            background-color: #007acc;
        }

        #tab-list li:hover {
            cursor: pointer;
            background-color: #007acc;
        }

        </style>

        <div class="tab-switcher-container">
            <ul id="tab-list"></ul>
        </div>
    `;

    // Append the overlay container (which has the shadow DOM) to the document body
    document.body.appendChild(overlayContainer);

    console.log(overlayContainer);
    console.log(shadowRoot);

    updateTabs(shadowRoot);

    // Reset pressed keys when modal is shown
    pressedKeys["Tab"] = false;
}

function populateTabList(shadowRoot, tabs) {
    const tabList = shadowRoot.querySelector("#tab-list");
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
    console.log(shadowRoot.querySelectorAll("#tab-list li")); // To see all the `li` elements

    const activeItem = shadowRoot.querySelector("#tab-list li.active");
    let newItem;

    if (pressedKeys["Alt"] && pressedKeys["ArrowUp"]) {
        e.preventDefault();
        newItem =
            activeItem.previousElementSibling ||
            shadowRoot.querySelector("#tab-list li:last-child");
    } else if (pressedKeys["Alt"] && pressedKeys["ArrowDown"]) {
        // Normal Tab: Go to the next sibling or the first child if at the end
        e.preventDefault();
        newItem =
            activeItem.nextElementSibling ||
            shadowRoot.querySelector("#tab-list li:first-child");
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

    console.log(shadowRoot.querySelectorAll("#tab-list li.active")); // To see all the `li` elements
}

// Handle the keyup event for detecting when the Alt key is released
function handleKeyUp(e) {
    pressedKeys[e.key] = false;

    // Check if Alt key is released
    if (e.key === "Alt") {
        const activeItem = shadowRoot.querySelector("#tab-list li.active");
        // When Alt is released, activate the current tab
        activateTab(activeItem);
    }

    const activeItem = shadowRoot.querySelector("#tab-list li.active");
    console.log(`current ${activeItem.innerHTML}`);
    console.log(
        `up ${
            activeItem.previousElementSibling
                ? activeItem.previousElementSibling.innerHTML
                : null
        }`
    );
    console.log(
        `down ${
            activeItem.nextElementSibling
                ? activeItem.nextElementSibling.innerHTML
                : null
        }`
    );
}

// Track the keydown event and mark the key as pressed
function handleKeyDown(e) {
    pressedKeys[e.key] = true; // Mark key as pressed
}

// Function to activate a tab
function activateTab(activeItem) {
    const tabId = parseInt(activeItem.dataset.tabId);

    chrome.runtime.sendMessage(
        { action: "activateTab", tabId: tabId },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error(
                    "Error sending message:",
                    chrome.runtime.lastError.message
                );
                // Handle the error (for example, retrying the message)
            } else {
                console.log("Tab activated successfully");
            }
        }
    );

    hideTabOverlay();
}

function hideTabOverlay() {
    const overlay = document.getElementById("tab-switcher-overlay-container");
    if (overlay) {
        overlay.remove();
    }
    document.removeEventListener("keydown", handleKeyPress);
    overlayVisible = false;
}

function updateTabs(shadowRoot) {
    // Send a message to the background script to get the list of tabs
    chrome.runtime.sendMessage({ action: "getTabs" }, (response) => {
        console.log(response.tabs);
        populateTabList(shadowRoot, response.tabs);
    });
}
