// Add listener for shortcut
chrome.commands.onCommand.addListener((command) => {
    if (command === "open-tab-list") {
        // Get the active tab in the current window
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const activeTab = tabs[0];

                // Try sending a message first, if it fails, inject the content script
                chrome.tabs.sendMessage(
                    activeTab.id,
                    { action: "showTabSwitcher" },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            // If content script is not injected, inject it programmatically
                            chrome.scripting
                                .executeScript({
                                    target: { tabId: activeTab.id },
                                    files: ["content.js"],
                                })
                                .then(() => {
                                    // After injecting, send the message to show the tab switcher
                                    chrome.tabs.sendMessage(activeTab.id, {
                                        action: "showTabSwitcher",
                                    });
                                    console.log("Success injecting!");
                                })
                                .catch((err) => {
                                    console.error(
                                        "Failed to inject content script:",
                                        err
                                    );
                                });
                        }
                    }
                );
            }
        });
    }
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getTabs") {
        // Query the tabs and send them back to the content script
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
            sendResponse({ tabs: mruTabs });
        });
        return true; // Required to indicate that sendResponse will be async
    }
});

// Listen for switching tabs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "activateTab" && message.tabId) {
        // Call chrome.tabs.update to activate the selected tab
        chrome.tabs.update(message.tabId, { active: true });
    }
});

let mruTabs = [];

// Populate the MRU list when the extension is loaded or refreshed
function initializeMRUTabs() {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        // Start by ordering the tabs with the currently active one at the front
        chrome.tabs.query(
            { active: true, currentWindow: true },
            (activeTabs) => {
                const activeTab = activeTabs[0];

                // Move the active tab to the front of the list
                mruTabs = tabs.filter((tab) => tab.id !== activeTab.id);
                mruTabs.unshift(activeTab); // Add the active tab at the front
            }
        );
    });
}

// Listen for most recent tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
    const { tabId, windowId } = activeInfo;

    // Move the activated tab to the front of the MRU list
    updateMRUList(tabId);
});

// When a tab is updated (e.g., new tab or updated tab), add it to the MRU list if necessary
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        updateMRUList(tabId);
    }

    console.log(mruTabs);
});

// When a tab is closed, remove it from the MRU list
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    mruTabs = mruTabs.filter((t) => t.id !== tabId);
});

// Update the MRU list by moving the given tab ID to the front of the list
function updateMRUList(tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (tab && !tab.incognito) {
            // Remove the tab from its previous position in the MRU list
            mruTabs = mruTabs.filter((t) => t.id !== tab.id);

            // Add the tab to the front of the MRU list
            mruTabs.unshift(tab);
        }
    });
}

// Initialize MRU list
initializeMRUTabs();
