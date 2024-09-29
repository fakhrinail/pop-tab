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
            sendResponse({ tabs: tabs });
        });
        return true; // Required to indicate that sendResponse will be async
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "activateTab" && message.tabId) {
        // Call chrome.tabs.update to activate the selected tab
        chrome.tabs.update(message.tabId, { active: true });
    }
});
