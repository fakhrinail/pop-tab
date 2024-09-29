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
